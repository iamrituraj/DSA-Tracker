// Validates a batch module: schema checks + Java compile/run smoke tests.
// Usage: node scripts/verify-batch.mjs batch1 batch2 ...
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { STUBS } from "./_stubs.mjs";

const LEVELS = new Set(["Brute", "Better", "Optimal", "Optimal+"]);
const problems = JSON.parse(fs.readFileSync("public/data/problems.json", "utf8"));
const list = problems.problems || problems;
const pidSet = new Set(list.map((p) => p.id));

const names = process.argv.slice(2);
if (!names.length) { console.error("no batches given"); process.exit(1); }

let entries = {};
for (const n of names) {
  const mod = await import(new URL(`./${n}.mjs`, import.meta.url));
  Object.assign(entries, mod.default);
}

// ---- schema validation ----
let schemaErrors = 0;
for (const [id, val] of Object.entries(entries)) {
  if (!pidSet.has(id)) { console.log(`SCHEMA: unknown problem id ${id}`); schemaErrors++; continue; }
  if (!val.approaches || !val.approaches.length) { console.log(`SCHEMA: ${id} has no approaches`); schemaErrors++; continue; }
  for (const ap of val.approaches) {
    for (const f of ["id", "title", "level", "time", "space", "explanation"]) {
      if (!ap[f]) { console.log(`SCHEMA: ${id}/${ap.id||"?"} missing ${f}`); schemaErrors++; }
    }
    if (!LEVELS.has(ap.level)) { console.log(`SCHEMA: ${id}/${ap.id} bad level "${ap.level}"`); schemaErrors++; }
    if (!ap.code || !ap.code.java || !ap.code.csharp) { console.log(`SCHEMA: ${id}/${ap.id} missing java/csharp`); schemaErrors++; }
    if (ap.code && /\/\/.*=>/.test(ap.code.csharp || "")) { console.log(`SCHEMA: ${id}/${ap.id} C# arrow-comment banned pattern`); schemaErrors++; }
  }
}
console.log(`schema: ${Object.keys(entries).length} entries, ${schemaErrors} errors`);

// ---- Java compile tests (best-effort; snippets must compile) ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sbatch-"));
let compileFails = 0;
for (const [id, val] of Object.entries(entries)) {
  for (const ap of val.approaches) {
    const dir = fs.mkdtempSync(path.join(tmp, `${id}-${ap.id}-`));
    for (const [name, src] of Object.entries(STUBS))
      fs.writeFileSync(path.join(dir, name + ".java"), src);
    fs.writeFileSync(path.join(dir, "Solution.java"), "import java.util.*;\n" + ap.code.java);
    try {
      execSync("javac *.java", { cwd: dir, stdio: "pipe" });
    } catch (e) {
      compileFails++;
      console.log(`JAVAC FAIL ${id}/${ap.id}:\n${e.stdout?.toString() || e.message}`);
    }
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`javac: ${compileFails} compile failures`);

if (schemaErrors === 0 && compileFails === 0) {
  fs.writeFileSync("scripts/_merge-payload.json", JSON.stringify(entries));
  console.log("OK: payload written to scripts/_merge-payload.json");
} else {
  process.exit(2);
}
