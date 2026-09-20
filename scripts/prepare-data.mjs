import { mkdir, readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'data/problems.raw.json';
const OUTPUTS = ['data/problems.json', 'public/data/problems.json'];
const TOPICS_OUT = ['data/topics.json', 'public/data/topics.json'];
const PATTERNS_OUT = ['data/patterns.json', 'public/data/patterns.json'];

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
    [/strings \[basic/i, 'Strings'],
    [/^strings$/i, 'Advanced Strings'],
  ];
  for (const [re, label] of map) {
    if (re.test(topic)) return label;
  }
  return topic;
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * TakeUForward A2Z subcategories (offline, curated from the official sheet).
 * Each entry is matched by normalized title keywords / aliases.
 */
const TUF_PATTERNS = {
  Sorting: [
    ['Sorting-I', [/^selection sort$/, /^bubble sort$/, /^insertion sorting$/]],
    ['Sorting-II', [/merge sort/, /recursive bubble/, /recursive insertion/, /quick sort/]],
  ],
  Arrays: [
    [
      'Easy',
      [
        /largest element/,
        /second largest/,
        /array is sorted/,
        /remove duplicates from sorted array/,
        /left rotate array by one/,
        /left rotate array by k/,
        /move zeros/,
        /linear search/,
        /union of two sorted/,
        /find missing number/,
        /maximum consecutive ones/,
        /appears once.*twice/,
        /longest subarray with given sum k/,
        /longest subarray with sum k$/,
      ],
    ],
    [
      'Medium',
      [
        /^two sum$/,
        /sort an array of 0/,
        /majority element.?i\b/,
        /kadane/,
        /maximum subarray sum/,
        /stock buy and sell$/,
        /rearrange array/,
        /next permutation/,
        /leaders in an array/,
        /longest consecutive sequence/,
        /set matrix zero/,
        /rotate matrix by 90/,
        /spiral/,
        /count subarrays with given sum$/,
      ],
    ],
    [
      'Hard',
      [
        /pascal/,
        /majority element.?ii/,
        /^3 sum$/,
        /^4 sum$/,
        /largest subarray with sum 0/,
        /xor k/,
        /merge overlapping/,
        /merge two sorted arrays without extra/,
        /repeating and missing/,
        /count inversions/,
        /reverse pairs/,
        /maximum product subarray/,
      ],
    ],
  ],
  'Binary Search': [
    [
      'BS on 1D Arrays',
      [
        /search x in sorted/,
        /lower bound/,
        /upper bound/,
        /search insert/,
        /floor and ceil in sorted/,
        /first and last occurrence/,
        /count occurrences in a sorted/,
        /search in rotated sorted array/,
        /minimum in rotated sorted/,
        /how many times the array is rotated/,
        /single element in a sorted/,
        /find peak element$/,
      ],
    ],
    [
      'BS on Search Space',
      [
        /square root of a number/,
        /nth root/,
        /koko/,
        /bouquets/,
        /smallest divisor/,
        /ship packages/,
        /kth missing/,
        /aggressive cows/,
        /book allocation/,
        /split array/,
        /painter/,
        /gas station/,
        /median of 2 sorted/,
        /kth element of 2 sorted/,
      ],
    ],
    [
      'BS on 2D Arrays',
      [/row with maximum 1/, /search in a 2d matrix/, /search in 2d matrix/, /peak element.?ii/, /matrix median/],
    ],
  ],
  Strings: [
    [
      'Basic & Easy Strings',
      [
        /outermost parentheses/,
        /reverse words in a given string/,
        /largest odd number/,
        /longest common prefix/,
        /isomorphic/,
        /rotate string/,
        /anagram/,
      ],
    ],
    [
      'Medium Strings',
      [
        /sort characters by frequency/,
        /nesting depth/,
        /roman to integer/,
        /atoi/,
        /count number of substrings/,
        /longest palindromic substring/,
        /beauty of all substrings/,
        /reverse every word/,
      ],
    ],
  ],
  'Advanced Strings': [
    [
      'Hard Strings & Standard Algos',
      [
        /bracket reversals/,
        /count and say/,
        /rabin karp/,
        /z function/,
        /kmp/,
        /shortest palindrome/,
        /longest happy prefix/,
        /count palindromic subsequences/,
      ],
    ],
  ],
  'Linked List': [
    [
      '1D Linked List',
      [
        /insertion at the head of linked list/,
        /deletion of the head of ll$/,
        /length of the linked list/,
        /search in linked list/,
      ],
    ],
    [
      'Doubly Linked List',
      [
        /insert node before head in doubly/,
        /delete head of doubly/,
        /reverse a doubly linked list/,
      ],
    ],
    [
      'Medium LL',
      [
        /middle of a linkedlist/,
        /reverse a linkedlist iterative/,
        /reverse a ll$/,
        /detect a loop/,
        /starting point in ll/,
        /length of loop in ll/,
        /ll is palindrome/,
        /odd and even nodes/,
        /nth node from the back/,
        /delete the middle node in ll/,
        /sort ll$/,
        /sort a linked list of 0/,
        /intersection point of y/,
        /add one to a number represented/,
        /add two numbers in linked list/,
      ],
    ],
    [
      'Medium DLL',
      [
        /delete all occurrences of a key in dll/,
        /pairs with given sum in doubly/,
        /remove duplicates from sorted dll/,
      ],
    ],
    [
      'Hard LL',
      [/reverse ll in group/, /rotate a ll/, /flattening of ll/, /clone a ll/],
    ],
  ],
  Recursion: [
    [
      'Get a Strong Hold',
      [
        /recursive implementation of atoi/,
        /pow x n/,
        /count good numbers/,
        /sort a stack using recursion/,
        /reverse a stack/,
      ],
    ],
    [
      'Subsequences Pattern',
      [
        /generate binary strings/,
        /generate parentheses/,
        /power set/,
        /subsequences with sum k/,
        /subsequence with sum k/,
        /combination sum$/,
        /combination sum ii/,
        /combination sum iii/,
        /subsets i$/,
        /subsets ii/,
        /letter combinations/,
      ],
    ],
    [
      'Trying All Combos / Hard',
      [
        /palindrome partitioning$/,
        /word search/,
        /n queen/,
        /rat in a maze/,
        /word break/,
        /m coloring/,
        /sudoku/,
        /expression add operators/,
      ],
    ],
  ],
  'Bit Manipulation': [
    [
      'Learn Bit Manipulation',
      [
        /i th bit/,
        /number is odd/,
        /power of 2/,
        /count the number of set bits/,
        /rightmost unset bit/,
        /swap two numbers/,
        /divide two numbers without/,
      ],
    ],
    [
      'Interview Problems',
      [
        /minimum bit flips/,
        /single number i\b/,
        /power set bit/,
        /xor of numbers in a given range/,
        /single number iii/,
      ],
    ],
    [
      'Advanced Maths',
      [
        /prime factors of a number/,
        /divisors of a number/,
        /count primes in range/,
        /prime factorisation/,
        /^pow x n$/,
      ],
    ],
  ],
  'Stack & Queue': [
    [
      'Learning',
      [
        /implement stack using arrays/,
        /implement queue using arrays/,
        /implement stack using queue/,
        /implement queue using stack/,
        /implement stack using linkedlist/,
        /implement queue using linkedlist/,
        /balanced paranthesis|balanced parenthesis/,
        /implement min stack/,
      ],
    ],
    [
      'Prefix / Infix / Postfix',
      [/infix to postfix/, /prefix to infix/, /prefix to postfix/, /postfix to prefix/, /postfix to infix/, /infix to prefix/],
    ],
    [
      'Monotonic Stack',
      [
        /next greater element/,
        /next smaller element/,
        /greater elements to the right/,
        /trapping rainwater/,
        /sum of subarray minimums/,
        /asteroid collision/,
        /sum of subarray ranges/,
        /remove k digits/,
        /largest rectangle in a histogram/,
        /maximum rectangles/,
      ],
    ],
    [
      'Implementation',
      [/sliding window maximum/, /stock span/, /celebrity/, /lru cache/, /lfu cache/],
    ],
  ],
  'Sliding Window': [
    [
      'Medium',
      [
        /longest substring without repeating/,
        /max consecutive ones iii/,
        /fruit into baskets/,
        /longest repeating character replacement/,
        /binary subarrays with sum/,
        /nice subarrays/,
        /all three characters/,
        /maximum points you can obtain from cards/,
      ],
    ],
    [
      'Hard',
      [
        /at most k distinct/,
        /k different integers/,
        /minimum window substring/,
        /minimum window subsequence/,
      ],
    ],
  ],
  Heaps: [
    [
      'Learning',
      [/implement min heap/, /represents a min heap/, /convert min heap to max heap/],
    ],
    [
      'Medium',
      [
        /kth smallest element in an array/,
        /k th largest element in an array|kth largest element in an array/,
        /sort k sorted array/,
        /merge k sorted lists/,
        /replace elements by their rank/,
        /task scheduler/,
        /hand of straights/,
      ],
    ],
    [
      'Hard',
      [
        /design twitter/,
        /minimum cost to connect sticks/,
        /kth largest element in a stream/,
        /maximum sum combination/,
        /median from data stream/,
        /top k frequent/,
      ],
    ],
  ],
  Greedy: [
    [
      'Easy',
      [
        /assign cookies/,
        /fractional knapsack/,
        /lemonade change/,
        /valid paranthesis checker|valid parenthesis checker/,
      ],
    ],
    [
      'Medium / Hard',
      [
        /n meetings/,
        /jump game/,
        /platforms required/,
        /job sequencing/,
        /^candy$/,
        /shortest job first/,
        /lru page replacement/,
        /insert interval/,
        /merge intervals/,
        /non overlapping intervals/,
      ],
    ],
  ],
  'Binary Trees': [
    [
      'Traversals',
      [
        /pre post inorder in one traversal/,
        /^preorder traversal$/,
        /inorder traversal of binary tree/,
        /^postorder traversal$/,
        /level order traversal/,
        /iterative preorder/,
        /iterative inorder/,
        /post order traversal of binary tree using/,
        /preorder inorder and postorder traversal in one/,
      ],
    ],
    [
      'Medium',
      [
        /maximum depth in bt/,
        /balanced binary tree/,
        /diameter of binary tree/,
        /maximum path sum/,
        /two trees are identical/,
        /zig zag|spiral traversal/,
        /boundary traversal/,
        /vertical order traversal/,
        /top view of bt/,
        /bottom view of bt/,
        /right left view/,
        /symmetric binary tree/,
      ],
    ],
    [
      'Hard',
      [
        /root to leaf path/,
        /lca in bt/,
        /maximum width of bt/,
        /children sum property/,
        /distance of k in bt/,
        /burn the bt/,
        /count total nodes in a complete/,
        /construct a unique bt|requirements needed to construct/,
        /construct a bt from preorder and inorder/,
        /construct the binary tree from postorder/,
        /serialize and de serialize/,
        /morris preorder/,
        /morris inorder/,
        /flatten binary tree/,
      ],
    ],
  ],
  BST: [
    [
      'Concepts',
      [/search in a binary search tree/, /find min max in bst/],
    ],
    [
      'Practice Problems',
      [
        /floor and ceil in a bst/,
        /floor in a binary search tree/,
        /insert a given node in bst/,
        /delete a node in bst/,
        /kth smallest and largest/,
        /tree is a bst/,
        /lca in bst/,
        /construct a bst from a preorder/,
        /inorder successor/,
        /merge 2 bst/,
        /two sum in bst/,
        /correct bst with two nodes swapped/,
        /largest bst in binary tree/,
      ],
    ],
  ],
  Graphs: [
    [
      'Learning',
      [/connected components$/, /^dfs$/, /traversal techniques/],
    ],
    [
      'BFS / DFS Problems',
      [
        /number of provinces/,
        /connected components problem in matrix/,
        /rotten oranges/,
        /flood fill/,
        /cycle detection in undirected/,
        /detect a cycle in an undirected/,
        /distance of nearest cell/,
        /surrounded regions/,
        /number of enclaves/,
        /word ladder/,
        /number of islands$/,
        /bipartite/,
        /cycle detection in directed graph dfs/,
      ],
    ],
    [
      'Topo Sort',
      [
        /^topo sort$/,
        /kahn/,
        /detect a cycle in a directed graph$/,
        /course schedule/,
        /eventual safe states/,
        /alien dictionary/,
      ],
    ],
    [
      'Shortest Path',
      [
        /shortest path in undirected/,
        /shortest path in dag/,
        /djisktra|dijkstra/,
        /priority queue is used in djisktra/,
        /shortest distance in a binary maze/,
        /path with minimum effort/,
        /cheapest flight/,
        /network delay/,
        /ways to arrive at destination/,
        /minimum multiplications/,
        /bellman ford/,
        /floyd warshall/,
        /city with the smallest number of neighbors/,
      ],
    ],
    [
      'MST / Disjoint Set',
      [
        /prim s algorithm|prims algorithm/,
        /disjoint set/,
        /mst weight/,
        /make network connected/,
        /most stones removed/,
        /accounts merge/,
        /number of islands ii/,
        /making a large island/,
        /swim in rising water/,
      ],
    ],
    [
      'Other Algorithms',
      [/bridges in graph/, /articulation point/, /kosaraju/],
    ],
  ],
  'Dynamic Programming': [
    [
      '1D DP',
      [
        /climbing stairs/,
        /frog jump$/,
        /frog jump with k/,
        /maximum sum of non adjacent/,
        /house robber/,
      ],
    ],
    [
      '2D / Grid DP',
      [
        /ninja'?s training/,
        /grid unique paths/,
        /unique paths ii/,
        /minimum falling path sum/,
        /^triangle$/,
        /ninja and his friends/,
      ],
    ],
    [
      'DP on Subsequences',
      [
        /subset sum equal to target/,
        /partition equal subset sum/,
        /minimum absolute sum difference/,
        /count subsets with sum k/,
        /count partitions with given difference/,
        /assign cookies/,
        /minimum coins/,
        /target sum/,
        /coin change 2/,
        /unbounded knapsack/,
        /rod cutting/,
      ],
    ],
    [
      'DP on Strings',
      [
        /longest common subsequence/,
        /longest common substring/,
        /longest palindromic subsequence/,
        /minimum insertions to make string palindrome/,
        /convert string a to b/,
        /shortest common supersequence/,
        /distinct subsequences/,
        /edit distance/,
        /wildcard matching/,
      ],
    ],
    [
      'DP on Stocks',
      [/buy and sell stock/],
    ],
    [
      'DP on LIS',
      [
        /longest increasing subsequence/,
        /largest divisible subset/,
        /longest string chain/,
        /longest bitonic/,
        /number of longest increasing/,
      ],
    ],
    [
      'MCM / Partition DP',
      [
        /matrix chain multiplication/,
        /minimum cost to cut the stick/,
        /burst balloons/,
        /boolean expression/,
        /palindrome partitioning ii/,
        /partition array for maximum sum/,
      ],
    ],
    [
      'DP on Squares',
      [/maximum rectangle area with all 1/, /count square submatrices/],
    ],
  ],
  Tries: [
    [
      'Theory',
      [/trie implementation and operations$/, /trie implementation and advanced/],
    ],
    [
      'Problems',
      [
        /longest word with all prefixes/,
        /number of distinct substrings/,
        /bit prerequisites for trie/,
        /maximum xor of two numbers/,
        /maximum xor with an element/,
      ],
    ],
  ],
};

function inferPattern(title, topic) {
  const n = norm(title);
  const buckets = TUF_PATTERNS[topic];
  if (buckets) {
    for (const [pattern, rules] of buckets) {
      if (rules.some((re) => re.test(n))) return pattern;
    }
  }
  return 'General';
}

const raw = JSON.parse(await readFile(SOURCE, 'utf8'));
if (!Array.isArray(raw) || raw.length < 100) {
  throw new Error(`Expected local dataset at ${SOURCE}`);
}

const problems = raw
  .filter((p) => !isTheoryProblem(p))
  .map((p) => {
    const topic = shortTopic(p.topic);
    const title = p.title;
    return {
      id: p.id,
      title,
      topic,
      pattern: inferPattern(title, topic),
      difficulty: p.difficulty,
      status: 'Not Started',
      url: p.url || '',
      videoUrl: p.videoUrl || '',
    };
  });

const topics = [...new Set(problems.map((p) => p.topic))];
const patternCatalog = {};
for (const p of problems) {
  (patternCatalog[p.topic] ??= new Set()).add(p.pattern);
}
const patternsByTopic = Object.fromEntries(
  Object.entries(patternCatalog).map(([topic, set]) => [topic, [...set]])
);

for (const output of OUTPUTS) {
  await mkdir(output.split('/').slice(0, -1).join('/'), { recursive: true });
  await writeFile(output, JSON.stringify(problems, null, 2) + '\n', 'utf8');
}
for (const output of TOPICS_OUT) {
  await mkdir(output.split('/').slice(0, -1).join('/'), { recursive: true });
  await writeFile(output, JSON.stringify(topics, null, 2) + '\n', 'utf8');
}
for (const output of PATTERNS_OUT) {
  await mkdir(output.split('/').slice(0, -1).join('/'), { recursive: true });
  await writeFile(output, JSON.stringify(patternsByTopic, null, 2) + '\n', 'utf8');
}

const unmatched = problems.filter((p) => p.pattern === 'General');
const byTopic = {};
problems.forEach((p) => {
  byTopic[p.topic] ??= {};
  byTopic[p.topic][p.pattern] = (byTopic[p.topic][p.pattern] || 0) + 1;
});

console.log(
  `Prepared ${problems.length} problems with TakeUForward patterns (removed ${raw.length - problems.length} basic/theory).`
);
if (unmatched.length) {
  console.warn(`Unmatched patterns (${unmatched.length}):`);
  unmatched.forEach((p) => console.warn(`  [${p.topic}] ${p.title}`));
}
for (const [topic, pats] of Object.entries(byTopic)) {
  console.log(`\n${topic}`);
  for (const [pat, n] of Object.entries(pats)) console.log(`  ${n}\t${pat}`);
}
