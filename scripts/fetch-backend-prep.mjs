// Pull the full "Backend Interview Preparation" Notion site into a structured
// JSON dataset that the in-app Backend Prep page renders natively.
//
// The public Notion domain (…notion.site) serves `loadCachedPageChunkV2` for
// anonymous visitors, so we can walk the page tree without a login: start at the
// root page, and re-request a chunk for any block whose children aren't in the
// cache yet. Everything is emitted as a plain node tree so nothing depends on
// Notion's internal shapes past this file.
//
//   node scripts/fetch-backend-prep.mjs
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "data");

const SITE = "https://wooden-octave-bb4.notion.site";
const ROOT_PAGE = "16903713-338d-80fc-87f9-ff23646e3b2a";
const CLIENT_VERSION = "23.13.20260925.0613";

const HEADERS = {
  "notion-client-version": CLIENT_VERSION,
  "content-type": "application/json",
  "x-notion-active-user-header": "",
  origin: SITE,
  referer: `${SITE}/`,
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
};

const fmtId = (x) =>
  x.length === 32 ? `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}` : x;

/* --------------------------------- transport --------------------------------- */

async function chunk(pageId, cursor) {
  const res = await fetch(`${SITE}/api/v3/loadCachedPageChunkV2`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      page: { id: pageId },
      cursor: cursor || { stack: [] },
      verticalColumns: false,
    }),
  });
  if (!res.ok) throw new Error(`chunk ${pageId} -> HTTP ${res.status}`);
  return res.json();
}

// A page only hands back ~100 top-level blocks at a time and points at the rest
// with `cursors[0]`; follow it or long topics get silently truncated.
async function loadPage(pageId, onPage) {
  let payload = await chunk(pageId);
  let guard = 0;
  while (payload) {
    await onPage(payload);
    const next = payload.cursors?.[0];
    if (!next || ++guard > 40) break;
    payload = await chunk(pageId, next);
  }
}

/* ------------------------------ block text helpers ------------------------------ */

// Notion stores rich text as properties: { title: [["text", [["b"]]], ...] }.
// Keep light formatting (bold / inline code) as markdown so the renderer can style it.
function segments(value) {
  if (!Array.isArray(value)) return "";
  return value
    .map((seg) => {
      if (!Array.isArray(seg)) return "";
      let text = typeof seg[0] === "string" ? seg[0] : "";
      const marks = seg[1];
      if (!text) return "";
      if (Array.isArray(marks)) {
        const flat = JSON.stringify(marks);
        if (/"\\$"/.test(flat) || /"c"/.test(flat)) text = `\`${text.replace(/`/g, "")}\``;
        if (/"b"/.test(flat) && !/"c"/.test(flat)) text = `**${text}**`;
      }
      return text;
    })
    .join("");
}

function propText(properties) {
  if (!properties) return "";
  // Title-like props first, then any other text prop (e.g. code bodies use "title" too).
  const primary = segments(properties.title);
  if (primary) return primary;
  for (const key of Object.keys(properties)) {
    const t = segments(properties[key]);
    if (t) return t;
  }
  return "";
}

function propList(properties, key) {
  const v = properties?.[key];
  return Array.isArray(v) ? segments(v) : "";
}

// Titles/labels are stored as markdown elsewhere; strip the inline markers.
const plain = (s) => String(s || "").replace(/\*\*/g, "").replace(/`/g, "").trim();

/* ---------------------------------- conversion ---------------------------------- */

// `format` is an object on newer blocks and a JSON string on older ones.
function formatOf(block) {
  const f = block.format;
  if (!f) return {};
  if (typeof f === "string") {
    try { return JSON.parse(f); } catch { return {}; }
  }
  return f;
}

function toNode(block) {
  const p = block.properties || {};
  const type = block.type;
  const node = { type };
  const text = propText(p);
  if (text) node.text = text;

  if (type === "code") {
    node.lang = propList(p, "language") || propList(p, "lang") || "text";
    // Code bodies arrive as one segment per line.
    node.text = Array.isArray(p.title) ? p.title.map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : "")).join("\n") : text;
  }
  if (type === "to_do") node.checked = propList(p, "checked") === "Yes";
  if (type === "toggle" || type === "callout" || type === "quote") node.icon = propList(p, "icon");
  if (type === "bookmark" || type === "embed" || type === "link_preview" || type === "image") {
    const src = propList(p, "source") || propList(p, "format");
    if (src) node.href = src;
  }
  if (type === "image") {
    // A pasted data URI lands in `title` too, and uploads are named with a UUID;
    // either would dump noise into captions and search, so keep only readable names.
    const caption = node.text || "";
    const readable = /\.(png|jpe?g|gif|webp|svg)$/i.test(caption) && !/^[0-9a-f-]{20,}\./i.test(caption) && caption.length < 60;
    node.text = readable ? caption : "";
    node.blockId = block.id;
    node.spaceId = block.space_id;
  }
  if (type === "column_list" || type === "column") node.layout = true;
  return node;
}

// Notion tables are a `table` block whose children are `table_row` blocks keyed by
// opaque column ids. Flatten them into a real grid so the renderer sees a table.
function buildTable(block, blocks) {
  const fmt = formatOf(block);
  const rows = (block.content || []).map((id) => blocks.get(id)).filter((r) => r && r.type === "table_row");
  if (!rows.length) return null;
  const columns = fmt.table_block_column_order?.length
    ? fmt.table_block_column_order
    : Object.keys(rows[0].properties || {});
  const cell = (row, col) => segments(row.properties?.[col] ?? []).trim();
  const grid = rows.map((row) => columns.map((col) => cell(row, col)));
  const hasHeader = fmt.table_block_column_header !== false;
  const node = { type: "table", columns };
  if (hasHeader) {
    node.header = grid[0];
    node.rows = grid.slice(1);
  } else {
    node.rows = grid;
  }
  return node;
}

// `blocks` is the Map produced by walk(). `seen` guards against cyclic/ repeated
// children so a block is never emitted twice inside one subtree.
function build(id, blocks, seen = new Set()) {
  const block = blocks.get(id);
  if (!block || seen.has(id)) return null;
  seen.add(id);
  if (block.type === "table") {
    const table = buildTable(block, blocks);
    (block.content || []).forEach((r) => seen.add(r));
    return table || { type: "text", text: "" };
  }
  const node = toNode(block);
  const kids = [...new Set(block.content || [])].map((c) => build(c, blocks, seen)).filter(Boolean);
  if (kids.length) node.children = kids;
  return node;
}

/* ------------------------------------ walk ------------------------------------ */

// Depth-first over a page: absorb every chunk of a page (paginated), then expand
// any block whose children are still unknown — which is how nested sub-pages and
// long topics get pulled in. `intoSubPages: false` stops at direct children, which
// is all the root index needs.
async function walk(rootId, { intoSubPages = true } = {}) {
  const blocks = new Map();
  const absorb = (payload) => {
    const rec = payload?.recordMap?.block || {};
    for (const wrapper of Object.values(rec)) {
      const value = wrapper?.value?.value ?? wrapper?.value;
      if (value && value.id && !blocks.has(value.id)) blocks.set(value.id, value);
    }
  };
  let requests = 0;

  await loadPage(rootId, (payload) => { requests++; absorb(payload); });
  const queue = [rootId];
  const expanded = new Set();

  while (queue.length) {
    const id = queue.shift();
    if (expanded.has(id)) continue;
    expanded.add(id);
    const block = blocks.get(id);
    const children = block?.content || [];
    const isPage = block && block !== blocks.get(rootId) && block.type === "page";
    if (!isPage || intoSubPages) {
      if (children.some((c) => !blocks.has(c))) {
        await loadPage(id, (payload) => { requests++; absorb(payload); });
      }
      for (const c of blocks.get(id)?.content || children) if (!expanded.has(c)) queue.push(c);
    }
    if (requests % 20 === 0) {
      process.stdout.write(`  … ${expanded.size} blocks walked, ${requests} requests, ${blocks.size} known\n`);
      await sleep(120);
    }
  }
  return { blocks, requests };
}

// The root page is a flat index of topic pages. Cluster banners are text blocks
// drawn with leading dashes ("——————————System Design"), sub-group labels are plain
// text lines ("Core Concepts", "Data Structures Concepts"), and every `page`
// block under a label belongs to it.
function outline(root, blocks) {
  const groups = [];
  let cluster = "Backend Fundamentals";
  let current = { cluster, heading: "Overview", items: [] };
  groups.push(current);
  for (const child of root.content || []) {
    const block = blocks.get(child);
    if (!block || block.type === "divider") continue;
    const text = propText(block.properties).trim();
    if (block.type === "page") {
      current.items.push({ id: child, title: plain(text) });
      continue;
    }
    if (!text) continue;
    const banner = text.match(/^[—\-–\s]+(.+?)$/);
    if (banner) {
      cluster = banner[1].trim();
      current = { cluster, heading: cluster, items: [] };
    } else {
      current = { cluster, heading: plain(text), items: [] };
    }
    groups.push(current);
  }
  return groups.filter((g) => g.items.length);
}

/* ------------------------------------ main ------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Notion image sources are either expiring signed URLs, opaque `attachment:` refs
// or inline data URIs. Copy the first two locally (attachment refs only resolve
// through Notion's image proxy, keyed by the image block's own id) and leave
// data URIs inline.
async function localizeImages(topics) {
  const dir = path.join(ROOT, "public", "backend-prep", "img");
  await mkdir(dir, { recursive: true });
  const hash = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  };
  const cache = new Map();
  let saved = 0;
  let failed = 0;
  const hunt = async (node) => {
    if (!node) return;
    if (node.type === "image") {
      const href = node.href || "";
      if (href.startsWith("data:")) {
        node.src = href;
      } else if (href) {
        let local = cache.get(href);
        if (!local) {
          const url = href.startsWith("attachment:")
            ? `https://www.notion.so/image/${encodeURIComponent(href)}?table=block&id=${node.blockId}&spaceId=${node.spaceId}&width=1600&zoom=1`
            : href;
          try {
            const res = await fetch(url, { headers: { "user-agent": HEADERS["user-agent"] } });
            if (res.ok) {
              const type = res.headers.get("content-type") || "image/png";
              const name = `${hash(href)}.${(type.split("/")[1] || "png").split("+")[0]}`;
              await writeFile(path.join(dir, name), Buffer.from(await res.arrayBuffer()));
              local = `/backend-prep/img/${name}`;
              saved++;
            } else {
              local = "";
              failed++;
              console.warn(`  ! image ${href.slice(0, 60)} -> HTTP ${res.status}`);
            }
          } catch (err) {
            local = "";
            failed++;
            console.warn(`  ! image ${href.slice(0, 60)} -> ${err.message}`);
          }
          cache.set(href, local);
        }
        if (local) node.src = local;
      }
      delete node.href;
      delete node.blockId;
      delete node.spaceId;
    }
    for (const c of node.children || []) await hunt(c);
  };
  for (const t of topics) await hunt(t.tree);
  return { saved, failed };
}

// Topic pages can nest sub-pages; walk() recurses into them so nothing is
// silently dropped, and each sub-page rides inside its parent's node tree.
async function main() {
  console.log(`Walking ${SITE} from ${ROOT_PAGE} …`);
  const index = await walk(fmtId(ROOT_PAGE), { intoSubPages: false });
  console.log(`Index loaded: ${index.blocks.size} blocks in ${index.requests} requests.`);

  const root = index.blocks.get(fmtId(ROOT_PAGE));
  if (!root) throw new Error("root page not returned");

  const groups = outline(root, index.blocks);
  const topics = [];
  for (const group of groups) {
    for (const item of group.items) {
      const sub = await walk(item.id);
      const tree = build(item.id, sub.blocks);
      const nodes = countAll(tree);
      const nested = countType(tree, "page") - 1;
      topics.push({
        id: item.id,
        title: item.title,
        group: group.heading,
        cluster: group.cluster,
        blocks: (tree?.children || []).length,
        nodes,
        subPages: Math.max(nested, 0),
        tree,
      });
      process.stdout.write(`  · ${group.heading} / ${item.title} — ${tree?.children?.length || 0} blocks, ${nodes} nodes${nested > 0 ? `, ${nested} sub-pages` : ""}\n`);
      await sleep(90);
    }
  }

  const images = await localizeImages(topics);
  if (images.saved || images.failed) console.log(`\nImages: ${images.saved} copied to public/backend-prep/img, ${images.failed} unreadable.`);

  const payload = {
    source: `${SITE}/Backend-Interview-Preparation-${ROOT_PAGE.replace(/-/g, "")}`,
    fetchedAt: new Date().toISOString(),
    title: propText(root.properties) || "Backend Interview Preparation",
    groups: groups.map((g) => ({ cluster: g.cluster, heading: g.heading, items: g.items })),
    topics,
  };

  const histogram = {};
  const bump = (n) => {
    if (!n) return;
    histogram[n.type] = (histogram[n.type] || 0) + 1;
    (n.children || []).forEach(bump);
  };
  topics.forEach((t) => bump(t.tree));
  console.log("\nBlock types:", histogram);

  await mkdir(OUT, { recursive: true });
  const file = path.join(OUT, "backend-prep.json");
  await writeFile(file, JSON.stringify(payload));

  const stats = {
    topics: topics.length,
    groups: payload.groups.length,
    totalBlocks: topics.reduce((n, t) => n + countAll(t.tree), 0),
    codeBlocks: topics.reduce((n, t) => n + countType(t.tree, "code"), 0),
    sizeKB: Math.round((await readFile(file)).length / 1024),
  };
  console.log("\nWrote", path.relative(ROOT, file));
  console.log(stats);
}

function countAll(node) {
  if (!node) return 0;
  return 1 + (node.children || []).reduce((n, c) => n + countAll(c), 0);
}
function countType(node, type) {
  if (!node) return 0;
  return (node.type === type ? 1 : 0) + (node.children || []).reduce((n, c) => n + countType(c, type), 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
