export default {
  "a2z-265": { approaches: [
    { id: "max-heap-k", title: "Max-heap of size K", level: "Optimal", time: "O(n log k)", space: "O(k)",
      explanation: "Maintain a max-heap of size k; for each new element, replace the top if smaller.",
      code: {
        java: "class Solution {\n    int kthSmallest(int[] a, int k) {\n        java.util.PriorityQueue<Integer> pq = new java.util.PriorityQueue<>(java.util.Collections.reverseOrder());\n        for (int x : a) {\n            pq.offer(x);\n            if (pq.size() > k) pq.poll();\n        }\n        return pq.peek();\n    }\n}",
        csharp: "public class Solution {\n    public int KthSmallest(int[] a, int k) {\n        var pq = new PriorityQueue<int, int>((x, y) => y.CompareTo(x));\n        foreach (int x in a) { pq.Enqueue(x, x); if (pq.Count > k) pq.Dequeue(); }\n        return pq.Peek();\n    }\n}"
      } }
  ] },
  "a2z-267": { approaches: [
    { id: "array-heap", title: "Array-based min-heap with sift", level: "Optimal", time: "O(log n) insert/delete", space: "O(n)",
      explanation: "Standard binary-heap in an array: insert at end and sift-up; extract-min swaps root with last and sifts-down.",
      code: {
        java: "class Solution {\n    static class MinHeap {\n        int[] h = new int[128]; int sz;\n        void insert(int v) {\n            if (sz == h.length) h = java.util.Arrays.copyOf(h, sz * 2);\n            h[sz] = v; siftUp(sz); sz++;\n        }\n        int extractMin() {\n            int min = h[0]; h[0] = h[--sz]; siftDown(0); return min;\n        }\n        void siftUp(int i) { while (i > 0 && h[i] < h[(i-1)/2]) { swap(i, (i-1)/2); i = (i-1)/2; } }\n        void siftDown(int i) {\n            while (true) {\n                int s = i, l = 2*i+1, r = 2*i+2;\n                if (l < sz && h[l] < h[s]) s = l;\n                if (r < sz && h[r] < h[s]) s = r;\n                if (s == i) break; swap(i, s); i = s;\n            }\n        }\n        void swap(int a, int b) { int t = h[a]; h[a] = h[b]; h[b] = t; }\n        int size() { return sz; }\n    }\n}",
        csharp: "public class MinHeap {\n    int[] h = new int[128]; int sz;\n    public void Insert(int v) { if (sz == h.Length) System.Array.Resize(ref h, sz * 2); h[sz] = v; SiftUp(sz); sz++; }\n    public int ExtractMin() { int min = h[0]; h[0] = h[--sz]; SiftDown(0); return min; }\n    void SiftUp(int i) { while (i > 0 && h[i] < h[(i-1)/2]) { Swap(i, (i-1)/2); i = (i-1)/2; } }\n    void SiftDown(int i) {\n        while (true) {\n            int s = i, l = 2*i+1, r = 2*i+2;\n            if (l < sz && h[l] < h[s]) s = l;\n            if (r < sz && h[r] < h[s]) s = r;\n            if (s == i) break; Swap(i, s); i = s;\n        }\n    }\n    void Swap(int a, int b) { (h[a], h[b]) = (h[b], h[a]); }\n    public int Size() => sz;\n}"
      } }
  ] },
  "a2z-268": { approaches: [
    { id: "check-heap", title: "Verify heap property on array", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "For every index i, check that children at 2i+1 and 2i+2 are >= h[i].",
      code: {
        java: "class Solution {\n    boolean isMinHeap(int[] h) {\n        int n = h.length;\n        for (int i = 0; i < n; i++) {\n            int l = 2*i+1, r = 2*i+2;\n            if (l < n && h[i] > h[l]) return false;\n            if (r < n && h[i] > h[r]) return false;\n        }\n        return true;\n    }\n}",
        csharp: "public class Solution {\n    public bool IsMinHeap(int[] h) {\n        int n = h.Length;\n        for (int i = 0; i < n; i++) {\n            int l = 2*i+1, r = 2*i+2;\n            if (l < n && h[i] > h[l]) return false;\n            if (r < n && h[i] > h[r]) return false;\n        }\n        return true;\n    }\n}"
      } }
  ] },
  "a2z-269": { approaches: [
    { id: "reheapify", title: "Build max-heap from min-heap array", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "A min-heap array is a valid complete binary tree; just run heapify-down (max-variant) from n/2-1 to 0.",
      code: {
        java: "class Solution {\n    int[] minToMaxHeap(int[] h) {\n        int n = h.length;\n        for (int i = n / 2 - 1; i >= 0; i--) siftDownMax(h, i, n);\n        return h;\n    }\n    void siftDownMax(int[] h, int i, int n) {\n        while (true) {\n            int s = i, l = 2*i+1, r = 2*i+2;\n            if (l < n && h[l] > h[s]) s = l;\n            if (r < n && h[r] > h[s]) s = r;\n            if (s == i) break;\n            int t = h[i]; h[i] = h[s]; h[s] = t; i = s;\n        }\n    }\n}",
        csharp: "public class Solution {\n    public int[] MinToMaxHeap(int[] h) {\n        int n = h.Length;\n        for (int i = n / 2 - 1; i >= 0; i--) SiftDownMax(h, i, n);\n        return h;\n    }\n    void SiftDownMax(int[] h, int i, int n) {\n        while (true) {\n            int s = i, l = 2*i+1, r = 2*i+2;\n            if (l < n && h[l] > h[s]) s = l;\n            if (r < n && h[r] > h[s]) s = r;\n            if (s == i) break;\n            (h[i], h[s]) = (h[s], h[i]); i = s;\n        }\n    }\n}"
      } }
  ] },
  "a2z-270": { approaches: [
    { id: "min-heap-k", title: "Min-heap of size K", level: "Optimal", time: "O(n log k)", space: "O(k)",
      explanation: "Maintain a min-heap of size k; top is the k-th largest.",
      code: {
        java: "class Solution {\n    int kthLargest(int[] a, int k) {\n        java.util.PriorityQueue<Integer> pq = new java.util.PriorityQueue<>();\n        for (int x : a) { pq.offer(x); if (pq.size() > k) pq.poll(); }\n        return pq.peek();\n    }\n}",
        csharp: "public class Solution {\n    public int KthLargest(int[] a, int k) {\n        var pq = new PriorityQueue<int, int>();\n        foreach (int x in a) { pq.Enqueue(x, x); if (pq.Count > k) pq.Dequeue(); }\n        return pq.Peek();\n    }\n}"
      } }
  ] },
  "a2z-271": { approaches: [
    { id: "min-heap-sort", title: "Min-heap sort for k-sorted array", level: "Optimal", time: "O(n log k)", space: "O(k)",
      explanation: "Insert first k+1 elements into a min-heap; slide: extract-min into the output, then insert the next element.",
      code: {
        java: "class Solution {\n    int[] sortKSorted(int[] a, int k) {\n        int n = a.length;\n        java.util.PriorityQueue<Integer> pq = new java.util.PriorityQueue<>();\n        int[] res = new int[n]; int idx = 0;\n        for (int i = 0; i < n; i++) {\n            pq.offer(a[i]);\n            if (pq.size() > k) res[idx++] = pq.poll();\n        }\n        while (!pq.isEmpty()) res[idx++] = pq.poll();\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public int[] SortKSorted(int[] a, int k) {\n        int n = a.Length; var pq = new PriorityQueue<int, int>();\n        int[] res = new int[n]; int idx = 0;\n        foreach (int x in a) { pq.Enqueue(x, x); if (pq.Count > k) res[idx++] = pq.Dequeue(); }\n        while (pq.Count > 0) res[idx++] = pq.Dequeue();\n        return res;\n    }\n}"
      } }
  ] },
  "a2z-272": { approaches: [
    { id: "pq-merge", title: "Priority queue merge", level: "Optimal", time: "O(N log k)", space: "O(k)",
      explanation: "Push heads of all k lists; pop-min, advance that list, push the next node. Builds the merged list.",
      code: {
        java: "class Solution {\n    ListNode mergeKLists(ListNode[] lists) {\n        java.util.PriorityQueue<ListNode> pq = new java.util.PriorityQueue<>((a, b) -> a.val - b.val);\n        for (ListNode n : lists) if (n != null) pq.offer(n);\n        ListNode dummy = new ListNode(0), cur = dummy;\n        while (!pq.isEmpty()) {\n            ListNode min = pq.poll();\n            cur.next = min; cur = min;\n            if (min.next != null) pq.offer(min.next);\n        }\n        return dummy.next;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode MergeKLists(ListNode[] lists) {\n        var pq = new PriorityQueue<ListNode, int>();\n        foreach (var n in lists) if (n != null) pq.Enqueue(n, n.val);\n        var dummy = new ListNode(0); var cur = dummy;\n        while (pq.Count > 0) {\n            var min = pq.Dequeue(); cur.next = min; cur = min;\n            if (min.next != null) pq.Enqueue(min.next, min.next.val);\n        }\n        return dummy.next;\n    }\n}"
      } }
  ] },
  "a2z-273": { approaches: [
    { id: "sorted-dedup-rank", title: "Sort unique values, assign ranks", level: "Optimal", time: "O(n log n)", space: "O(n)",
      explanation: "Collect distinct values in sorted order; rank = position in that order (1-indexed). Map back.",
      code: {
        java: "class Solution {\n    int[] arrayRankTransform(int[] arr) {\n        java.util.TreeSet<Integer> ts = new java.util.TreeSet<>();\n        for (int x : arr) ts.add(x);\n        java.util.Map<Integer, Integer> rank = new java.util.HashMap<>();\n        int r = 1;\n        for (int x : ts) rank.put(x, r++);\n        int[] res = new int[arr.length];\n        for (int i = 0; i < arr.length; i++) res[i] = rank.get(arr[i]);\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public int[] ArrayRankTransform(int[] arr) {\n        var sorted = new SortedSet<int>(arr);\n        var rank = new Dictionary<int, int>();\n        int r = 1;\n        foreach (int x in sorted) rank[x] = r++;\n        return System.Array.ConvertAll(arr, x => rank[x]);\n    }\n}"
      } }
  ] },
  "a2z-274": { approaches: [
    { id: "greedy-cooldown", title: "Sort by frequency, fill gaps", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "If the most-frequent task has count f, it creates f-1 gaps of size n between them. Answer = max(total, (f-1)*(n+1)+numMax).",
      code: {
        java: "class Solution {\n    int leastInterval(char[] tasks, int n) {\n        int[] cnt = new int[26];\n        for (char c : tasks) cnt[c - 'A']++;\n        int maxF = 0, numMax = 0;\n        for (int c : cnt) { if (c > maxF) { maxF = c; numMax = 1; } else if (c == maxF) numMax++; }\n        return Math.max(tasks.length, (maxF - 1) * (n + 1) + numMax);\n    }\n}",
        csharp: "public class Solution {\n    public int LeastInterval(char[] tasks, int n) {\n        int[] cnt = new int[26];\n        foreach (char c in tasks) cnt[c - 'A']++;\n        int maxF = 0, numMax = 0;\n        foreach (int c in cnt) { if (c > maxF) { maxF = c; numMax = 1; } else if (c == maxF) numMax++; }\n        return System.Math.Max(tasks.Length, (maxF - 1) * (n + 1) + numMax);\n    }\n}"
      } }
  ] },
  "a2z-275": { approaches: [
    { id: "freq-tree-map", title: "TreeMap group by value, consume groups", level: "Optimal", time: "O(n log n)", space: "O(n)",
      explanation: "Count each card value; greedily form groups of consecutive size groupSize using a sorted frequency map.",
      code: {
        java: "class Solution {\n    boolean isNStraightHand(int[] hand, int gs) {\n        if (hand.length % gs != 0) return false;\n        java.util.TreeMap<Integer, Integer> cnt = new java.util.TreeMap<>();\n        for (int x : hand) cnt.merge(x, 1, Integer::sum);\n        while (!cnt.isEmpty()) {\n            int start = cnt.firstKey();\n            for (int i = 0; i < gs; i++) {\n                int k = start + i;\n                if (!cnt.containsKey(k)) return false;\n                if (cnt.get(k) == 1) cnt.remove(k); else cnt.put(k, cnt.get(k) - 1);\n            }\n        }\n        return true;\n    }\n}",
        csharp: "public class Solution {\n    public bool IsNStraightHand(int[] hand, int gs) {\n        if (hand.Length % gs != 0) return false;\n        var cnt = new SortedDictionary<int, int>();\n        foreach (int x in hand) { cnt.TryGetValue(x, out int v); cnt[x] = v + 1; }\n        while (cnt.Count > 0) {\n            int start = 0; bool first = true;\n            foreach (int k in cnt.Keys) { start = k; first = false; break; }\n            for (int i = 0; i < gs; i++) {\n                int k = start + i;\n                if (!cnt.ContainsKey(k)) return false;\n                if (cnt[k] == 1) cnt.Remove(k); else cnt[k]--;\n            }\n        }\n        return true;\n    }\n}"
      } }
  ] },
  "a2z-276": { approaches: [
    { id: "merge-tweets", title: "HashMap + merge with min-heap top 10", level: "Optimal", time: "O(F log 10)", space: "O(F)",
      explanation: "Store user→follows set and user→tweet-list. For getNewsFeed, merge tweets of self+followed using a min-heap of size 10.",
      code: {
        java: "class Solution {\n    static class Twitter {\n        int time;\n        java.util.Map<Integer, java.util.Set<Integer>> follows = new java.util.HashMap<>();\n        java.util.Map<Integer, java.util.List<int[]>> tweets = new java.util.HashMap<>();\n        void postTweet(int userId, int tweetId) { tweets.computeIfAbsent(userId, x -> new java.util.ArrayList<>()).add(new int[]{tweetId, time++}); }\n        java.util.List<Integer> getNewsFeed(int userId) {\n            java.util.PriorityQueue<int[]> pq = new java.util.PriorityQueue<>((a, b) -> a[1] - b[1]);\n            java.util.Set<Integer> users = new java.util.HashSet<>(); users.add(userId);\n            if (follows.containsKey(userId)) users.addAll(follows.get(userId));\n            for (int u : users) {\n                if (!tweets.containsKey(u)) continue;\n                for (int[] t : tweets.get(u)) { pq.offer(t); if (pq.size() > 10) pq.poll(); }\n            }\n            java.util.List<Integer> res = new java.util.ArrayList<>();\n            while (!pq.isEmpty()) res.add(pq.poll()[0]);\n            java.util.Collections.reverse(res);\n            return res;\n        }\n        void follow(int fId, int tId) { follows.computeIfAbsent(fId, x -> new java.util.HashSet<>()).add(tId); }\n        void unfollow(int fId, int tId) { if (follows.containsKey(fId)) follows.get(fId).remove(tId); }\n    }\n}",
        csharp: "public class Twitter {\n    int time; Dictionary<int, HashSet<int>> follows = new(); Dictionary<int, List<(int tid, int t)>> tweets = new();\n    public void PostTweet(int userId, int tweetId) { if (!tweets.ContainsKey(userId)) tweets[userId] = new(); tweets[userId].Add((tweetId, time++)); }\n    public IList<int> GetNewsFeed(int userId) {\n        var pq = new PriorityQueue<(int, int), int>();\n        var users = new HashSet<int> { userId };\n        if (follows.ContainsKey(userId)) users.UnionWith(follows[userId]);\n        foreach (int u in users) { if (!tweets.ContainsKey(u)) continue; foreach (var t in tweets[u]) { pq.Enqueue(t, t.t); if (pq.Count > 10) pq.Dequeue(); } }\n        var res = new List<int>(); while (pq.Count > 0) res.Add(pq.Dequeue().Item1); res.Reverse(); return res;\n    }\n    public void Follow(int fId, int tId) { if (!follows.ContainsKey(fId)) follows[fId] = new(); follows[fId].Add(tId); }\n    public void Unfollow(int fId, int tId) { if (follows.ContainsKey(fId)) follows[fId].Remove(tId); }\n}"
      } }
  ] },
  "a2z-277": { approaches: [
    { id: "min-heap-merge", title: "Min-heap Huffman-style merge", level: "Optimal", time: "O(n log n)", space: "O(n)",
      explanation: "Always merge the two smallest sticks; total cost accumulates the merged length.",
      code: {
        java: "class Solution {\n    int connectSticks(int[] sticks) {\n        java.util.PriorityQueue<Integer> pq = new java.util.PriorityQueue<>();\n        for (int s : sticks) pq.offer(s);\n        int cost = 0;\n        while (pq.size() > 1) {\n            int sum = pq.poll() + pq.poll();\n            cost += sum;\n            pq.offer(sum);\n        }\n        return cost;\n    }\n}",
        csharp: "public class Solution {\n    public int ConnectSticks(int[] sticks) {\n        var pq = new PriorityQueue<int, int>();\n        foreach (int s in sticks) pq.Enqueue(s, s);\n        int cost = 0;\n        while (pq.Count > 1) { int sum = pq.Dequeue() + pq.Dequeue(); cost += sum; pq.Enqueue(sum, sum); }\n        return cost;\n    }\n}"
      } }
  ] },
  "a2z-278": { approaches: [
    { id: "min-heap-k", title: "Min-heap of size K for running kth largest", level: "Optimal", time: "O(log k) add", space: "O(k)",
      explanation: "Keep the k largest elements in a min-heap; the root is the k-th largest at any point.",
      code: {
        java: "class Solution {\n    static class KthLargest {\n        int k; java.util.PriorityQueue<Integer> pq;\n        KthLargest(int k, int[] nums) {\n            this.k = k; pq = new java.util.PriorityQueue<>();\n            for (int x : nums) { pq.offer(x); if (pq.size() > k) pq.poll(); }\n        }\n        int add(int val) { pq.offer(val); if (pq.size() > k) pq.poll(); return pq.peek(); }\n    }\n}",
        csharp: "public class KthLargest {\n    int k; PriorityQueue<int, int> pq = new();\n    public KthLargest(int k, int[] nums) { this.k = k; foreach (int x in nums) { pq.Enqueue(x, x); if (pq.Count > k) pq.Dequeue(); } }\n    public int Add(int val) { pq.Enqueue(val, val); if (pq.Count > k) pq.Dequeue(); return pq.Peek(); }\n}"
      } }
  ] },
  "a2z-279": { approaches: [
    { id: "max-heap-pairs", title: "Max-heap seeded with (i,0) pairs", level: "Optimal", time: "O(k log n)", space: "O(n)",
      explanation: "Push (A[i]+B[0], i, 0); each pop outputs one combination then pushes (i, j+1). Avoid duplicates via visited set.",
      code: {
        java: "class Solution {\n    int[] maxCombinations(int[] A, int[] B, int k) {\n        int n = A.length;\n        java.util.Arrays.sort(A); java.util.Arrays.sort(B);\n        java.util.PriorityQueue<int[]> pq = new java.util.PriorityQueue<>((a, b) -> (A[b[1]] + B[b[2]]) - (A[a[1]] + B[a[2]]));\n        java.util.HashSet<String> vis = new java.util.HashSet<>();\n        int[] res = new int[k];\n        for (int i = n - 1; i >= 0; i--) { pq.offer(new int[]{A[i] + B[n-1], i, n - 1}); vis.add(i + \",\" + (n-1)); }\n        for (int t = 0; t < k; t++) {\n            int[] top = pq.poll();\n            res[t] = top[0];\n            int i = top[1], j = top[2];\n            if (j > 0 && !vis.contains(i + \",\" + (j-1))) { pq.offer(new int[]{A[i]+B[j-1], i, j-1}); vis.add(i + \",\" + (j-1)); }\n            if (i > 0 && !vis.contains((i-1) + \",\" + j)) { pq.offer(new int[]{A[i-1]+B[j], i-1, j}); vis.add((i-1) + \",\" + j); }\n        }\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public int[] MaxCombinations(int[] A, int[] B, int k) {\n        int n = A.Length;\n        System.Array.Sort(A); System.Array.Sort(B);\n        var pq = new PriorityQueue<(int sum, int i, int j), int>();\n        var vis = new HashSet<string>();\n        int[] res = new int[k];\n        for (int i = n - 1; i >= 0; i--) { pq.Enqueue((A[i]+B[n-1], i, n-1), -(A[i]+B[n-1])); vis.Add($\"{i},{n-1}\"); }\n        for (int t = 0; t < k; t++) {\n            var top = pq.Dequeue(); res[t] = top.sum;\n            int i = top.i, j = top.j;\n            if (j > 0 && vis.Add($\"{i},{j-1}\")) pq.Enqueue((A[i]+B[j-1], i, j-1), -(A[i]+B[j-1]));\n            if (i > 0 && vis.Add($\"{i-1},{j}\")) pq.Enqueue((A[i-1]+B[j], i-1, j), -(A[i-1]+B[j]));\n        }\n        return res;\n    }\n}"
      } }
  ] },
  "a2z-280": { approaches: [
    { id: "two-heaps", title: "Max-heap low + Min-heap high", level: "Optimal", time: "O(log n) add", space: "O(n)",
      explanation: "Balance so sizes differ by at most 1; median is the top of the larger heap or average of both tops.",
      code: {
        java: "class Solution {\n    static class MedianFinder {\n        java.util.PriorityQueue<Integer> lo = new java.util.PriorityQueue<>(java.util.Collections.reverseOrder());\n        java.util.PriorityQueue<Integer> hi = new java.util.PriorityQueue<>();\n        void addNum(int num) {\n            lo.offer(num);\n            hi.offer(lo.poll());\n            if (hi.size() > lo.size()) lo.offer(hi.poll());\n        }\n        double findMedian() {\n            return lo.size() > hi.size() ? lo.peek() : (lo.peek() + hi.peek()) / 2.0;\n        }\n    }\n}",
        csharp: "public class MedianFinder {\n    PriorityQueue<int, int> lo = new(); PriorityQueue<int, int> hi = new();\n    public void AddNum(int num) { lo.Enqueue(num, -num); hi.Enqueue(lo.Dequeue(), lo.Peek() == 0 ? 0 : -lo.Peek()); if (hi.Count > lo.Count) lo.Enqueue(hi.Dequeue(), -hi.Peek()); }\n    public double FindMedian() { return lo.Count > hi.Count ? -lo.Peek() : (-lo.Peek() + hi.Peek()) / 2.0; }\n}"
      } }
  ] },
  "a2z-281": { approaches: [
    { id: "bucket-freq", title: "Bucket sort by frequency", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Count frequencies, place into buckets indexed by count, then collect the top k from highest bucket downward.",
      code: {
        java: "class Solution {\n    int[] topKFrequent(int[] nums, int k) {\n        java.util.Map<Integer, Integer> freq = new java.util.HashMap<>();\n        for (int x : nums) freq.merge(x, 1, Integer::sum);\n        java.util.List<Integer>[] bucket = new java.util.List[nums.length + 1];\n        for (var e : freq.entrySet()) { int f = e.getValue(); if (bucket[f] == null) bucket[f] = new java.util.ArrayList<>(); bucket[f].add(e.getKey()); }\n        int[] res = new int[k]; int idx = 0;\n        for (int i = bucket.length - 1; i >= 0 && idx < k; i--)\n            if (bucket[i] != null) for (int v : bucket[i]) { if (idx >= k) break; res[idx++] = v; }\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public int[] TopKFrequent(int[] nums, int k) {\n        var freq = new Dictionary<int, int>();\n        foreach (int x in nums) { freq.TryGetValue(x, out int v); freq[x] = v + 1; }\n        var buckets = new List<int>[nums.Length + 1];\n        foreach (var e in freq) { if (buckets[e.Value] == null) buckets[e.Value] = new(); buckets[e.Value].Add(e.Key); }\n        int[] res = new int[k]; int idx = 0;\n        for (int i = buckets.Length - 1; i >= 0 && idx < k; i--)\n            if (buckets[i] != null) foreach (int v in buckets[i]) { if (idx >= k) break; res[idx++] = v; }\n        return res;\n    }\n}"
      } }
  ] }
};
