import { readFile, writeFile } from 'node:fs/promises';

const page = await readFile('/private/tmp/tuf-a2z.html', 'utf8');
const problems = JSON.parse(await readFile('public/data/problems.json', 'utf8'));
const text = page.replace(/\\"/g, '"').replace(/\\u0026/g, '&');
const entries = [...text.matchAll(/"label":"([^"]+)","kind":"problem","href":"([^"?]+(?:\?[^" ]*)?)"/g)]
  .map(([, title, href]) => ({ title, href: `https://takeuforward.org${href}` }));

const normalize = value => String(value || '')
  .toLowerCase()
  .replace(/\[[^\]]*\]|\([^)]*\)|\|[^|]*\|/g, ' ')
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(the|a|an|algorithm|problem|implementation|using|in|of|to)\b/g, ' ')
  .replace(/\s+/g, ' ').trim();

const byTitle = new Map();
for (const entry of entries) {
  const key = normalize(entry.title);
  if (!byTitle.has(key)) byTitle.set(key, entry.href);
}

const links = {};
for (const problem of problems) {
  const key = normalize(problem.title);
  const exact = byTitle.get(key);
  if (exact) links[problem.id] = exact;
}

await writeFile('public/data/tuf-links.json', `${JSON.stringify(links, null, 2)}\n`);
console.log(`Extracted ${entries.length} official URLs; mapped ${Object.keys(links).length}/${problems.length} tracker problems.`);
