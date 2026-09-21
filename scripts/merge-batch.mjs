// Merge verified batch payloads into public/data/solutions.json.
// Usage: node scripts/merge-batch.mjs batch1 batch2 ...   (dry-run without --write)
import fs from "node:fs";

const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const write = process.argv.includes("--write");

let add = {};
for (const n of names) {
  const mod = (await import(new URL(`./${n}.mjs`, import.meta.url))).default;
  Object.assign(add, mod);
}
const target = "public/data/solutions.json";
const cur = JSON.parse(fs.readFileSync(target, "utf8"));
const problems = JSON.parse(fs.readFileSync("public/data/problems.json", "utf8"));
const list = problems.problems || problems;
const order = list.map((p) => p.id);

let overwrites = 0;
for (const id of Object.keys(add)) {
  if (cur[id]) overwrites++;
  cur[id] = add[id];
}
// rebuild in catalog order
const out = {};
for (const id of order) if (cur[id]) out[id] = cur[id];
for (const id of Object.keys(cur)) if (!(id in out)) out[id] = cur[id];

const before = Object.keys(JSON.parse(fs.readFileSync(target, "utf8"))).length;
console.log(`adding ${Object.keys(add).length} entries (overwriting ${overwrites})`);
console.log(`total before ${before} -> after ${Object.keys(out).length}`);
const missing = order.filter((id) => !out[id]);
console.log(`still missing: ${missing.length}`);
if (write) {
  fs.writeFileSync(target, JSON.stringify(out, null, 2));
  console.log("WROTE " + target);
} else {
  console.log("(dry run; add --write to persist)");
}
