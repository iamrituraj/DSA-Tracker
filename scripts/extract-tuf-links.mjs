import { readFile, writeFile } from 'node:fs/promises';

const page = await readFile('/private/tmp/tuf-a2z.html', 'utf8');
const problems = JSON.parse(await readFile('public/data/problems.json', 'utf8'));
const text = page.replace(/\\"/g, '"').replace(/\\u0026/g, '&');
// The A2Z page embeds the complete item metadata. Items with an article use
// that detailed tutorial; all others use the corresponding TUF+ editorial.
const entries = [];
const itemStart = /\[(?:\d+),(?:\d+),"([^"]+)","item","practice","([^"]+)"/g;
let match;
while ((match = itemStart.exec(text))) {
  const [, slug, title] = match;
  const nextItem = text.indexOf('"item","practice"', itemStart.lastIndex);
  const item = text.slice(match.index, nextItem === -1 ? text.length : nextItem);
  const blog = item.match(/"(\/blogs\/data-structure-and-algorithm\/[^"]+)"/);
  entries.push({
    title,
    slug,
    href: blog
      ? `https://takeuforward.org${blog[1]}`
      : `https://takeuforward.org/plus/dsa/problems/${slug}?tab=editorial`,
    sourceUrls: [...item.matchAll(/"(https?:\\?\/\\?\/[^"\\]+)"/g)]
      .map(([, url]) => url.replace(/\\\\\//g, '/')),
  });
}

const normalize = value => String(value || '')
  .toLowerCase()
  .replace(/\[[^\]]*\]|\([^)]*\)|\|[^|]*\|/g, ' ')
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(the|a|an|algorithm|problem|implementation|using|in|of|to)\b/g, ' ')
  .replace(/\s+/g, ' ').trim();

const byTitle = new Map();
const bySourceUrl = new Map();
const bySlug = new Map();
const urlKey = value => String(value || '').replace(/#.*$/, '').replace(/\/$/, '');
const editorialUrl = problem => {
  const source = String(problem.url || '');
  const tufSlug = source.match(/\/plus\/dsa\/problems\/([^?#/]+)/)?.[1];
  const leetCodeSlug = source.match(/leetcode\.com\/problems\/([^?#/]+)/)?.[1];
  const titleSlug = String(problem.title || '')
    .replace(/\[[^\]]*\]|\([^)]*\)|\|[^|]*/g, ' ')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `https://takeuforward.org/plus/dsa/problems/${tufSlug || leetCodeSlug || titleSlug}?tab=editorial`;
};
for (const entry of entries) {
  const key = normalize(entry.title);
  if (!byTitle.has(key)) byTitle.set(key, entry.href);
  if (!bySlug.has(entry.slug)) bySlug.set(entry.slug, entry.href);
  for (const sourceUrl of entry.sourceUrls) {
    const key = urlKey(sourceUrl);
    if (!bySourceUrl.has(key)) bySourceUrl.set(key, entry.href);
  }
}

const links = {};
for (const problem of problems) {
  const key = normalize(problem.title);
  const sourceSlug = String(problem.url || '').match(/\/plus\/dsa\/problems\/([^?#/]+)/)?.[1];
  links[problem.id] = byTitle.get(key) || bySourceUrl.get(urlKey(problem.url)) || bySlug.get(sourceSlug) || editorialUrl(problem);
}

await writeFile('public/data/tuf-links.json', `${JSON.stringify(links, null, 2)}\n`);
console.log(`Extracted ${entries.length} TakeUForward solution URLs; mapped ${Object.keys(links).length}/${problems.length} tracker problems.`);
// sort topics by frequency
