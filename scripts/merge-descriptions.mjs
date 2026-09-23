// Merge validated description batches into data/descriptions.json.
// Batches live in scripts/desc-batch*.json as { problemId: { description, examples } }.
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

const batchFiles = fs
  .readdirSync(SCRIPTS_DIR)
  .filter((f) => /^desc-batch.*\.json$/.test(f))
  .sort();
if (!batchFiles.length) throw new Error("No scripts/desc-batch*.json files found");

const merged = {};
const seen = new Map(); // id -> batch file it came from
const errors = [];
for (const file of batchFiles) {
  const batch = JSON.parse(fs.readFileSync(path.join(SCRIPTS_DIR, file), "utf8"));
  for (const [id, entry] of Object.entries(batch)) {
    if (!known.has(id)) { errors.push(`${file}: "${id}" is not a problem id in the catalog`); continue; }
    if (seen.has(id)) { errors.push(`${file}: "${id}" already authored in ${seen.get(id)}`); continue; }
    seen.set(id, file);
    if (!entry || typeof entry !== "object") { errors.push(`${file}: ${id} entry must be an object`); continue; }
    const d = entry.description;
    if (typeof d !== "string" || d.trim().length < 30) { errors.push(`${file}: ${id} description too short (<30 chars)`); continue; }
    if (!Array.isArray(entry.examples) || entry.examples.length < 1 || entry.examples.length > 3) {
      errors.push(`${file}: ${id} needs 1-3 examples`);
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
    merged[id] = { description: d.trim(), examples: entry.examples };
  }
}

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
console.log(`batches: ${batchFiles.join(", ")}`);
console.log(`new entries: ${Object.keys(merged).length} (overwriting ${Object.keys(merged).filter((id) => existing[id]).length})`);
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
