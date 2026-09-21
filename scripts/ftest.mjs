// Generic functional tester. Usage: node scripts/ftest.mjs <batch> <cases.json>
// cases.json: [{id, approach(index from end, -1=last), file:javaSrc(autofilled), main: "..."}]
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { STUBS } from "./_stubs.mjs";

const [batchFile, casesFile] = process.argv.slice(2);
const mod = (await import(new URL(`./${batchFile}`, import.meta.url))).default;
const cases = JSON.parse(fs.readFileSync(casesFile, "utf8"));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ft-"));
let fails = 0;
for (const c of cases) {
  if (!mod[c.id]) continue;
  const aps = mod[c.id].approaches;
  const java = aps[aps.length + c.approach].code.java;
  const dir = fs.mkdtempSync(path.join(tmp, c.id + "-"));
  for (const [name, src] of Object.entries(STUBS))
    fs.writeFileSync(path.join(dir, name + ".java"), src);
  fs.writeFileSync(path.join(dir, "Solution.java"), "import java.util.*;\n" + java);
  fs.writeFileSync(path.join(dir, "Main.java"), c.main);
  try {
    execSync("javac *.java", { cwd: dir, stdio: "pipe" });
    const out = execSync("java Main", { cwd: dir }).toString().trim();
    const ok = !/FAIL|Exception/.test(out) && /PASS/.test(out);
    if (!ok) fails++;
    console.log(`${ok ? "PASS" : "FAIL"} ${c.id}#${c.approach}: ${out.replace(/\n/g, " | ")}`);
  } catch (e) {
    fails++;
    console.log(`ERR ${c.id}#${c.approach}: ${(e.stdout?.toString() || e.message).split("\n").slice(0, 4).join(" ")}`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILING` : "\nALL BATCH OK");
process.exit(fails ? 1 : 0);
