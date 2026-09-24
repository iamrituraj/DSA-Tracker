// Fetch official LeetCode problem statements (description + examples + constraints)
// for every catalog problem that can be matched to a LeetCode slug.
//
// Matching order: explicit leetcode.com URL → title-alias map → exact normalized-title
// match against the full LC catalog. Raw question HTML is cached per slug under
// data/leetcode-cache/ so re-runs never re-hit the API.
//
// Usage: node scripts/fetch-leetcode-descriptions.mjs
// Output: data/descriptions.leetcode.json  ({ a2zId: { source, description, examples, constraints } })
//         plus a console report of unmatched ids to author manually.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = "data/leetcode-cache";
const OUT = "data/descriptions.leetcode.json";
const CONCURRENCY = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const norm = (s) =>
  String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

// Manual title → slug fixes for names that differ from the LC catalog title.
const TITLE_ALIASES = {
  "find missing number": "missing-number",
  "subsets i": "subsets",
  "power set": "subsets",
  "coin change 2": "coin-change-ii",
  "longest increasing subsequence dp 43": "longest-increasing-subsequence",
  "count square submatrices with all ones dp 56": "count-square-submatrices-with-all-ones",
  "maximum rectangle area with all 1 s dp 55": "maximal-rectangle",
};

// Same-title LC questions that are actually a DIFFERENT problem than the TUF/GFG one —
// keep them out of the fetch and author the statement manually instead.
const DENY_IDS = new Set([
  "a2z-406", // GFG "Frog Jump" (1 or 2 steps DP) ≠ LC hard Frog Jump (stone distances)
]);

// Drop TUF title noise: "(DP - 22)", "|…" suffixes, article numbering.
const stripNoise = (s) => norm(s).replace(/\bdp \d+\b/g, "").replace(/\s+/g, " ").trim();

/* ---------------------------- HTML → structured ---------------------------- */

function htmlToText(html) {
  return String(html || "")
    .replace(/<br\s*\/??>/gi, "\n")
    .replace(/<\/(p|div|li|ul|pre)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "$1")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "$1")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Split raw content into prose (before first Example/Constraints), example blocks and constraint items.
function parseContent(html) {
  const raw = String(html || "");
  const examples = [];
  // Modern format: <div class="example-block"><p><strong>Input:</strong> <span class="example-io">…</span></p>…
  const blockRe = /<div class="example-block"[^>]*>([\s\S]*?)<\/div>/g;
  let hasBlock = false;
  let m;
  while ((m = blockRe.exec(raw))) {
    hasBlock = true;
    const get = (label) => {
      const re = new RegExp(`<strong[^>]*>\\s*${label}:?\\s*<\\/strong>([\\s\\S]*?)(?=<p>|<\\/div>|$)`, "i");
      const mm = m[1].match(re);
      return mm ? htmlToText(mm[1]).replace(/^\s*:\s*/, "").trim() : "";
    };
    const ex = { input: get("Input"), output: get("Output") };
    const explanation = get("Explanation");
    if (explanation) ex.explanation = explanation;
    if (ex.input || ex.output) examples.push(ex);
  }
  // Classic format: labels live inside a single <pre> block.
  if (!hasBlock) {
    const preRe = /<pre>([\s\S]*?)<\/pre>/g;
    while ((m = preRe.exec(raw))) {
      const block = m[1];
      const get = (label) => {
        const re = new RegExp(`<strong[^>]*>\\s*${label}:?\\s*<\\/strong>([\\s\\S]*?)(?=<strong[^>]*>\\s*(?:Input|Output|Explanation|Constraints):?\\s*<\\/strong>|$)`, "i");
        const mm = block.match(re);
        return mm ? htmlToText(mm[1].replace(/<br\s*\/?>/gi, "\n")).replace(/^\s*:\s*/, "").trim() : "";
      };
      const input = get("Input");
      const output = get("Output");
      if (input || output) {
        const ex = { input, output };
        const explanation = get("Explanation");
        if (explanation) ex.explanation = explanation;
        examples.push(ex);
      }
    }
  }
  // Constraints: <ul><li>..</li>..</ul> right after a "Constraints" heading
  const constraints = [];
  const cm = raw.match(/<strong[^>]*>\s*Constraints?\s*:?\s*<\/strong>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (cm) {
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/g;
    let li;
    while ((li = liRe.exec(cm[1]))) {
      const t = htmlToText(li[1]).replace(/^[•\s]+/, "").trim();
      if (t) constraints.push(t);
    }
  }
  // Description: everything before the first Example block / Constraints heading.
  const cut = raw.search(/<strong[^>]*>(?:<span[^>]*>)?\s*(?:Example|Constraints)/i);
  const prose = cut >= 0 ? raw.slice(0, cut) : raw;
  const description = htmlToText(prose).replace(/\n{3,}/g, "\n\n").trim();
  return { description, examples, constraints };
}

/* ------------------------------- LC requests ------------------------------- */

async function fetchCatalog() {
  const r = await fetch("https://leetcode.com/api/problems/all/", { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`catalog fetch failed: ${r.status}`);
  const j = await r.json();
  const bySlug = new Map();
  const byTitle = new Map();
  for (const q of j.stat_status_pairs || []) {
    const stat = q?.stat;
    const slug = stat?.question__title_slug;
    if (!slug) continue;
    const entry = { slug, title: stat.question__title, fid: Number(stat.frontend_question_id) || 1e9, difficulty: ["Easy", "Medium", "Hard"][q?.difficulty?.level - 1] || q?.difficulty?.label || "" };
    bySlug.set(slug, entry);
    const key = stripNoise(entry.title);
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(entry);
  }
  return { bySlug, byTitle };
}

async function fetchQuestion(slug) {
  const cacheFile = path.join(CACHE_DIR, `${slug}.json`);
  if (fs.existsSync(cacheFile)) return JSON.parse(await readFile(cacheFile, "utf8"));
  const body = {
    query: "query q($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title difficulty content } }",
    variables: { titleSlug: slug },
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0", referer: `https://leetcode.com/problems/${slug}/` },
        body: JSON.stringify(body),
      });
      if (r.status === 429) { await sleep(4000 * attempt); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const q = j.data?.question;
      if (!q?.content) throw new Error("empty content");
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      await writeFile(cacheFile, JSON.stringify(q), "utf8");
      return q;
    } catch (e) {
      if (attempt === 4) throw new Error(`${slug}: ${e.message}`);
      await sleep(1200 * attempt);
    }
  }
}

/* --------------------------------- main ---------------------------------- */

const problems = JSON.parse(await readFile("data/problems.json", "utf8"));
const { bySlug, byTitle } = await fetchCatalog();
console.log(`LeetCode catalog: ${bySlug.size} problems`);

function resolveSlug(p) {
  if (DENY_IDS.has(p.id)) return null;
  const um = (p.url || "").match(/problems\/([^/?#]+)/);
  if (um && bySlug.has(um[1])) return um[1];
  const alias = TITLE_ALIASES[stripNoise(p.title)];
  if (alias && bySlug.has(alias)) return alias;
  const cands = byTitle.get(stripNoise(p.title)) || [];
  if (cands.length === 1) return cands[0].slug;
  if (cands.length > 1) {
    // Same title multiple times (premium clones): difficulty first, then the oldest question id.
    const exact = cands.find((c) => c.difficulty === p.difficulty);
    if (exact) return exact.slug;
    return [...cands].sort((a, b) => a.fid - b.fid)[0].slug;
  }
  return null;
}

const assignments = []; // { problem, slug }
const unmatched = [];
for (const p of problems) {
  const slug = resolveSlug(p);
  if (slug) assignments.push({ p, slug });
  else unmatched.push(p);
}
console.log(`matched: ${assignments.length}/${problems.length} | unmatched: ${unmatched.length}`);

// Dedupe slugs — several a2z ids may point at the same LC question.
const slugs = [...new Set(assignments.map((a) => a.slug))];
const cachedCount = fs.existsSync(CACHE_DIR) ? fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json")).length : 0;
console.log(`fetching ${slugs.length} unique questions (${cachedCount} cached)`);

const bySlugs = new Map();
let done = 0;
const queue = [...slugs];
async function worker() {
  while (queue.length) {
    const slug = queue.shift();
    try {
      bySlugs.set(slug, await fetchQuestion(slug));
    } catch (e) {
      console.error(`FAILED ${slug}: ${e.message}`);
    }
    done++;
    if (done % 25 === 0) console.log(`  …${done}/${slugs.length}`);
    await sleep(250);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const out = {};
const bad = [];
for (const { p, slug } of assignments) {
  const q = bySlugs.get(slug);
  if (!q) { bad.push(`${p.id} (${slug}): fetch failed`); continue; }
  const parsed = parseContent(q.content);
  if (!parsed.description || parsed.description.length < 40 || !parsed.examples.length) {
    bad.push(`${p.id} (${slug}): parse incomplete (desc ${parsed.description.length}, ${parsed.examples.length} examples)`);
    continue;
  }
  out[p.id] = {
    source: `leetcode:${slug}`,
    lcTitle: q.title,
    description: parsed.description,
    examples: parsed.examples.slice(0, 4),
    constraints: parsed.constraints,
  };
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`\nwrote ${Object.keys(out).length} detailed entries → ${OUT}`);
if (bad.length) {
  console.log(`parse/fetch issues (${bad.length}):`);
  bad.forEach((b) => console.log("  - " + b));
}
if (unmatched.length) {
  console.log(`\nUNMATCHED — need manual authoring (${unmatched.length}):`);
  unmatched.forEach((p) => console.log(`  ${p.id} [${p.topic}/${p.pattern}] ${p.title} (${p.difficulty})`));
}
