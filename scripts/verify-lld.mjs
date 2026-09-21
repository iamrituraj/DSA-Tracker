/**
 * Smoke-compiles every Java snippet in the LLD Lab chapters.
 *
 * Each chapter's `files[].java` is written to a temp dir as <Name>.java (default package)
 * and handed to javac in one invocation, so cross-file references are resolved the same way
 * an interviewer would read them on a whiteboard.
 *
 * Usage: node scripts/verify-lld.mjs [chapterId ...]
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const OUT = join(ROOT, ".tmp-lld-javac");

const { LLD_CHAPTERS } = await import(pathToFileURL(join(ROOT, "src/lld-data.js")).href);

const only = process.argv.slice(2);
const chapters = only.length ? LLD_CHAPTERS.filter((c) => only.includes(c.id)) : LLD_CHAPTERS;

let failed = 0;

for (const chapter of chapters) {
  const dir = join(OUT, chapter.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const names = chapter.files.map((f) => `${f.name}.java`);
  chapter.files.forEach((f, i) => writeFileSync(join(dir, names[i]), f.java + "\n"));

  try {
    execFileSync("javac", ["-nowarn", "-Xlint:none", "-d", dir, ...names], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    console.log(`ok    ${chapter.id.padEnd(18)} ${names.length} files`);
  } catch (err) {
    failed++;
    const out = `${err.stdout || ""}${err.stderr || ""}`;
    // Line numbers in the error map back to the generated <Name>.java files.
    console.log(`FAIL  ${chapter.id}\n${out.trim().split("\n").slice(0, 40).join("\n")}`);
  }
}

rmSync(OUT, { recursive: true, force: true });
console.log(failed ? `\n${failed} chapter(s) failed to compile` : "\nall java snippets compile");
process.exit(failed ? 1 : 0);
