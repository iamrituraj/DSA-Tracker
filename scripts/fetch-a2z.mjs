import { mkdir, readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'https://raw.githubusercontent.com/septilex/a2z-tracker/main/dsa_tracker/a2z_problems_simple.json';
const OUTPUTS = ['public/data/problems.json', 'data/problems.json'];

const patternRules = [
  [/binary search|lower bound|upper bound|search insert|rotated sorted|nth root|square root|koko|bouquet|smallest divisor|ship packages|kth missing|aggressive cows|book allocation|split array|painter|gas station|median of 2 sorted|kth element|matrix median|peak element/i, 'Binary Search'],
  [/sliding window|subarrays? with k|longest substring|maximum consecutive ones|fruits into baskets|character replacement|binary subarrays|nice subarrays|all 3 characters|minimum window/i, 'Sliding Window / Two Pointer'],
  [/two sum|3 sum|4 sum|rearrange array|next permutation|leaders|longest consecutive|set matrix|rotate matrix|spiral|kadane|maximum subarray|stock buy|majority element|pascal|merge intervals|count inversions|reverse pairs|maximum product/i, 'Arrays / Two Pointers'],
  [/linked.?list|clone a ll|flattening of ll/i, 'Linked List'],
  [/tree|binary tree|bst|binary search tree|lowest common ancestor|serialize|diameter|zig.?zag|boundary traversal|vertical order|top view|bottom view|burn tree/i, 'Trees'],
  [/graph|province|island|rotten|flood fill|cycle detection|bipartite|word ladder|topological|course schedule|safe states|alien dictionary|shortest path|dijkstra|bellman|floyd|network delay|cheapest flight|mst|prim|disjoint set|accounts merge|swim in rising/i, 'Graphs'],
  [/dynamic programming|dp|knapsack|target sum|subset sum|partition|frog jump|house robber|ninja|unique paths|minimum path sum|coin change|rod cutting|matrix chain|burst balloons|palindrome partition|boolean expression/i, 'Dynamic Programming'],
  [/stack|queue|parentheses|infix|postfix|prefix|monotonic|next greater|stock span|celebrity|lru|lfu|sliding window maximum/i, 'Stack / Queue'],
  [/heap|kth largest|kth smallest|priority queue|task scheduler|hand of straights|top k frequent|merge k sorted/i, 'Heaps'],
  [/greedy|fractional knapsack|lemonade|jump game|meeting|platforms|job sequencing|candy|shortest job|non-overlapping/i, 'Greedy'],
  [/trie|prefix|distinct substrings|max xor|autocomplete|file system/i, 'Tries'],
  [/bit|xor|set bits|bit flips|single number|power of two/i, 'Bit Manipulation'],
  [/string|palindrome|anagram|roman|atoi|parentheses|pattern matching|kmp|z-algorithm|count and say|version numbers/i, 'Strings'],
  [/recursion|recursive|n queen|rat in a maze|sudoku|m coloring|word search|combination|subsets|permutation|power set|generate parentheses/i, 'Recursion / Backtracking'],
  [/sort|sorting|merge sort|quick sort|bubble sort|insertion sort|selection sort/i, 'Sorting'],
  [/hash|frequency|occurring element|counting frequencies/i, 'Hashing'],
  [/digit|number|gcd|prime|armstrong|divisor|factorial|fibonacci|math/i, 'Maths'],
];

function inferPattern(name, topic) {
  for (const [regex, pattern] of patternRules) {
    if (regex.test(name)) return pattern;
  }
  if (/learn the basics/i.test(topic)) return 'Fundamentals';
  return topic;
}

async function fetchSource() {
  const response = await fetch(SOURCE, { headers: { 'User-Agent': 'dsa-tracker-build' } });
  if (!response.ok) throw new Error(`A2Z dataset request failed: HTTP ${response.status}`);
  return response.json();
}

try {
  const raw = await fetchSource();
  if (!Array.isArray(raw) || raw.length < 470) {
    throw new Error(`Expected the current A2Z dataset (~474 problems), received ${raw?.length ?? 0}`);
  }

  const problems = raw.map((p, index) => ({
    id: `a2z-${String(p.id ?? index + 1).padStart(3, '0')}`,
    title: String(p.problem_name ?? '').trim(),
    topic: p.topic,
    pattern: inferPattern(String(p.problem_name ?? ''), p.topic),
    difficulty: p.difficulty,
    status: 'Not Started',
    url: p.leetcode_url || '',
    videoUrl: p.youtube_url || ''
  }));

  if (problems.length !== 474) {
    console.warn(`Warning: source currently contains ${problems.length} problems.`);
  }

  for (const output of OUTPUTS) {
    await mkdir(output.split('/').slice(0, -1).join('/'), { recursive: true });
    await writeFile(output, JSON.stringify(problems, null, 2) + '\n', 'utf8');
  }

  console.log(`Loaded ${problems.length} A2Z problems into public/data/problems.json`);
} catch (error) {
  console.error(`Could not refresh the A2Z dataset: ${error.message}`);
  console.error('Keeping the existing local dataset so the app can still start.');
}
