// Merge validated description batches into data/descriptions.json.
// Sources, lowest to highest priority: scripts/desc-batch*.json (terse pass),
// scripts/desc2-batch*.json (hand-authored detailed), data/descriptions.leetcode.json
// (official LeetCode statements). Entry shape: { description, examples, constraints? }.
// Usage: node scripts/merge-descriptions.mjs          (validate + dry run)
//        node scripts/merge-descriptions.mjs --write  (persist)
import fs from "node:fs";
import path from "node:path";

const write = process.argv.includes("--write");
const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname);
const TARGET = "data/descriptions.json";

const problems = JSON.parse(fs.readFileSync("data/problems.json", "utf8"));
const order = problems.map((p) => p.id);
const known = new Set(order);

const listBatches = (re) =>
  fs.readdirSync(SCRIPTS_DIR).filter((f) => re.test(f)).sort().map((f) => path.join(SCRIPTS_DIR, f));
const batchFiles = [
  ...listBatches(/^desc-batch.*\.json$/),
  ...listBatches(/^desc2-batch.*\.json$/),
];
const LC_SOURCE = "data/descriptions.leetcode.json";
if (!batchFiles.length && !fs.existsSync(LC_SOURCE)) throw new Error("No description sources found");
const sources = [...batchFiles];
if (fs.existsSync(LC_SOURCE)) sources.push(LC_SOURCE);
if (!sources.length) throw new Error("No scripts/desc*-batch*.json files found");

const merged = {};
const seen = new Map(); // id -> source file it came from (current winner)
const errors = [];
let upgrades = 0;
for (const file of sources) {
  const batch = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [id, entry] of Object.entries(batch)) {
    if (!known.has(id)) { errors.push(`${file}: "${id}" is not a problem id in the catalog`); continue; }
    if (seen.has(id)) { // higher-priority source replaces the earlier entry
      merged[id] = undefined;
      upgrades++;
    }
    seen.set(id, file);
    if (!entry || typeof entry !== "object") { errors.push(`${file}: ${id} entry must be an object`); continue; }
    const d = entry.description;
    if (typeof d !== "string" || d.trim().length < 30) { errors.push(`${file}: ${id} description too short (<30 chars)`); continue; }
    if (!Array.isArray(entry.examples) || entry.examples.length < 1 || entry.examples.length > 4) {
      errors.push(`${file}: ${id} needs 1-4 examples`);
      continue;
    }
    let exOk = true;
    entry.examples.forEach((ex, i) => {
      if (!ex || typeof ex !== "object" || typeof ex.input !== "string" || !ex.input.trim() || typeof ex.output !== "string" || !ex.output.trim()) {
        errors.push(`${file}: ${id} example ${i + 1} needs non-empty input and output`);
        exOk = false;
      }
      if (ex.explanation !== undefined && typeof ex.explanation !== "string") {
        errors.push(`${file}: ${id} example ${i + 1} explanation must be a string`);
        exOk = false;
      }
    });
    if (!exOk) continue;
    let constraints;
    if (entry.constraints !== undefined) {
      if (!Array.isArray(entry.constraints) || !entry.constraints.length || entry.constraints.some((c) => typeof c !== "string" || !c.trim())) {
        errors.push(`${file}: ${id} constraints must be a non-empty array of strings`);
        continue;
      }
      constraints = entry.constraints.map((c) => c.trim());
    }
    merged[id] = {
      description: d.trim(),
      examples: entry.examples,
      ...(constraints ? { constraints } : {}),
      ...(typeof entry.source === "string" && entry.source ? { source: entry.source } : {}),
    };
  }
}
for (const id of Object.keys(merged)) if (!merged[id]) delete merged[id];

if (errors.length) {
  console.error(`VALIDATION FAILED (${errors.length}):`);
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}

// Merge on top of any existing canonical file, then rebuild in catalog order.
const existing = fs.existsSync(TARGET) ? JSON.parse(fs.readFileSync(TARGET, "utf8")) : {};
const combined = { ...existing, ...merged };
const out = {};
for (const id of order) if (combined[id]) out[id] = combined[id];
for (const id of Object.keys(combined)) if (!(id in out)) out[id] = combined[id]; // keep strays visible for review

const missing = order.filter((id) => !out[id]);
console.log(`sources: ${sources.map((f) => path.basename(f)).join(", ")}`);
console.log(`new entries: ${Object.keys(merged).length} (upgraded ${upgrades} from lower-priority sources)`);
console.log(`total coverage: ${order.length - missing.length}/${order.length}`);
if (missing.length) {
  const byTopic = {};
  problems.forEach((p) => { if (missing.includes(p.id)) (byTopic[p.topic] ??= []).push(`${p.id} ${p.title}`); });
  for (const [topic, ids] of Object.entries(byTopic)) console.log(`  missing [${topic}]: ${ids.length} -> ${ids.slice(0, 8).join("; ")}${ids.length > 8 ? " ..." : ""}`);
}
if (write) {
  fs.writeFileSync(TARGET, JSON.stringify(out, null, 2) + "\n");
  console.log("WROTE " + TARGET);
} else {
  console.log("(dry run; add --write to persist)");
}
