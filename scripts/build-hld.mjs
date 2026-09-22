// Build clean standalone HLD revision sheets from the saved pages in hld/
// into public/hld/ so the in-app HLD Lab can embed them as iframes.
//
// - "H3 + Redis Rider Matching" and "Notification System" were saved from a
//   Claude frame: the real document lives in <name>_files/saved_resource.html
//   behind a frame-runtime <script> block, with assets/links pointing at the
//   remote frame origin. We strip the runtime, restore the Google Fonts link
//   and localize every frame URL.
// - job-scheduler.html is already self-contained and is copied as-is.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "hld");

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

const SHEETS = [
  {
    out: "rider-matching.html",
    src: path.join(ROOT, "hld", "H3 + Redis Rider Matching — Revision Sheet_files", "saved_resource.html"),
    frame: true,
  },
  {
    out: "notification-system.html",
    src: path.join(ROOT, "hld", "Notification System — Revision Sheet_files", "saved_resource.html"),
    frame: true,
  },
  {
    out: "job-scheduler.html",
    src: path.join(ROOT, "hld", "job-scheduler.html"),
    frame: false,
  },
];

// Make a sheet honor ?theme=light|dark regardless of the system setting:
// clone the light media-query block into an explicit `:root[data-theme="light"]`
// rule and add a tiny bootstrap script that reads the query param.
function addThemeParamSupport(doc) {
  const light = doc.match(/@media \(prefers-color-scheme: light\)\s*\{\s*:root:not\(\[data-theme="dark"\]\)\s*\{([^}]*)\}/);
  if (!light) throw new Error("light-theme override block not found");
  const bootstrap = "<script>try{var t=new URLSearchParams(location.search).get('theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark')}else if(t==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}</" + "script>";
  doc = doc.replace(/<style>/, bootstrap + "<style>\n  :root[data-theme=\"light\"]{" + light[1] + "}");
  return doc;
}

function cleanFrameDoc(raw) {
  // Keep only the real document: everything from the first post-runtime meta
  // onward (the frame-runtime block is two <script>s before it).
  const start = raw.indexOf('<meta name="viewport"');
  if (start === -1) throw new Error("viewport meta not found");
  let doc = raw.slice(start);
  // Drop saved-by / runtime artifacts.
  doc = doc.replace(/<!--\s*\/?frame-runtime\s*-->/g, "");
  // Restore the Google Fonts link (the browser saved it as a local ./css2 file).
  doc = doc.replace(/href="\.\/css2"/, `href="${FONTS_HREF}"`);
  // Turn absolute frame URLs into in-page anchors / relative URLs.
  doc = doc.replace(/https:\/\/[^"']*?\.frame\.claudeusercontent\.com\/_f\/[^"']*?#/g, "#");
  doc = doc.replace(/https:\/\/[^"']*?\.frame\.claudeusercontent\.com\/_f\/[^"']*?/g, "#");
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n${doc}`;
}

await mkdir(OUT, { recursive: true });
for (const sheet of SHEETS) {
  const raw = await readFile(sheet.src, "utf8");
  let doc = sheet.frame ? cleanFrameDoc(raw) : raw;
  doc = addThemeParamSupport(doc);
  // Sanity checks: no frame leftovers, no local css2 ref, balanced body tags.
  if (/frame\.claudeusercontent\.com|__FRAME_PREAMBLE|href="\.\/css2"/.test(doc)) {
    throw new Error(`${sheet.out}: frame artifacts still present`);
  }
  if (!/<title>/.test(doc) || !doc.includes("</body>")) {
    throw new Error(`${sheet.out}: document looks truncated`);
  }
  await writeFile(path.join(OUT, sheet.out), doc);
  console.log(`wrote public/hld/${sheet.out} (${(doc.length / 1024).toFixed(1)} kb)`);
}
