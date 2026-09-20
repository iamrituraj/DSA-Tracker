import { mkdir, readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'data/problems.raw.json';
const OUTPUTS = ['data/problems.json', 'public/data/problems.json'];
const TOPICS_OUT = ['data/topics.json', 'public/data/topics.json'];

/** Drop language/theory intros and the entire Learn-the-basics module. */
const THEORY_TITLE =
  /^(input output|cpp basics|if elseif|switch case|what are|for loops|while loops|functions\b|theory with|easy and medium|^hard$|pattern \d+|stl$|java collections|basic hashing|counting frequencies|introduction to|.*representation.*|understand recursion|print name n times|print 1 to n|print n to 1|sum of first n|factorial of a given number|print something n times)/i;

function isTheoryProblem(p) {
  if (/learn the basics/i.test(p.topic || '')) return true;
  const title = String(p.title || '').trim();
  if (THEORY_TITLE.test(title)) return true;
  if (/\btheory\b/i.test(title)) return true;
  return false;
}

function shortTopic(topic) {
  const map = [
    [/binary search trees|\bbst\b/i, 'BST'],
    [/binary search/i, 'Binary Search'],
    [/binary trees/i, 'Binary Trees'],
    [/dynamic programming/i, 'Dynamic Programming'],
    [/sliding window/i, 'Sliding Window'],
    [/linked.?list/i, 'Linked List'],
    [/bit manipulation/i, 'Bit Manipulation'],
    [/stack and queues|stack & queue/i, 'Stack & Queue'],
    [/sorting/i, 'Sorting'],
    [/arrays/i, 'Arrays'],
    [/recursion/i, 'Recursion'],
    [/heaps/i, 'Heaps'],
    [/greedy/i, 'Greedy'],
    [/graphs/i, 'Graphs'],
    [/^tries$/i, 'Tries'],
    [/strings/i, 'Strings'],
  ];
  for (const [re, label] of map) {
    if (re.test(topic)) return label;
  }
  return topic;
}

const raw = JSON.parse(await readFile(SOURCE, 'utf8'));
if (!Array.isArray(raw) || raw.length < 100) {
  throw new Error(`Expected local dataset at ${SOURCE}`);
}

const problems = raw
  .filter((p) => !isTheoryProblem(p))
  .map((p) => ({
    id: p.id,
    title: p.title,
    topic: shortTopic(p.topic),
    pattern: p.pattern,
    difficulty: p.difficulty,
    status: 'Not Started',
    url: p.url || '',
    videoUrl: p.videoUrl || '',
  }));

const topics = [...new Set(problems.map((p) => p.topic))];

for (const output of OUTPUTS) {
  await mkdir(output.split('/').slice(0, -1).join('/'), { recursive: true });
  await writeFile(output, JSON.stringify(problems, null, 2) + '\n', 'utf8');
}
for (const output of TOPICS_OUT) {
  await mkdir(output.split('/').slice(0, -1).join('/'), { recursive: true });
  await writeFile(output, JSON.stringify(topics, null, 2) + '\n', 'utf8');
}

console.log(
  `Prepared ${problems.length} practice problems (removed ${raw.length - problems.length} basic/theory). Offline — no network.`
);
