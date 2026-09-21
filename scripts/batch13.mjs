export default {
  "a2z-282": { approaches: [
    { id: "sort-two-pointers", title: "Sort both, greedy match", level: "Optimal", time: "O(n log n)", space: "O(1)",
      explanation: "Sort children and cookies; for each cookie (smallest first) satisfy the least-greedy child it can.",
      code: {
        java: "class Solution {\n    int findContentChildren(int[] g, int[] s) {\n        java.util.Arrays.sort(g); java.util.Arrays.sort(s);\n        int i = 0, j = 0;\n        while (i < g.length && j < s.length) {\n            if (s[j] >= g[i]) i++;\n            j++;\n        }\n        return i;\n    }\n}",
        csharp: "public class Solution {\n    public int FindContentChildren(int[] g, int[] s) {\n        System.Array.Sort(g); System.Array.Sort(s);\n        int i = 0, j = 0;\n        while (i < g.Length && j < s.Length) { if (s[j] >= g[i]) i++; j++; }\n        return i;\n    }\n}"
      } }
  ] },
  "a2z-283": { approaches: [
    { id: "ratio-sort", title: "Sort by value/weight descending", level: "Optimal", time: "O(n log n)", space: "O(1)",
      explanation: "Take items in decreasing value-per-weight ratio; fractionally take the last item that doesn't fully fit.",
      code: {
        java: "class Solution {\n    double fractionalKnapsack(int[] val, int[] wt, int cap) {\n        int n = val.length;\n        Integer[] idx = new Integer[n];\n        for (int i = 0; i < n; i++) idx[i] = i;\n        java.util.Arrays.sort(idx, (a, b) -> Double.compare((double) val[b] / wt[b], (double) val[a] / wt[a]));\n        double res = 0;\n        for (int i : idx) {\n            if (cap >= wt[i]) { res += val[i]; cap -= wt[i]; }\n            else { res += (double) val[i] * cap / wt[i]; break; }\n        }\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public double FractionalKnapsack(int[] val, int[] wt, int cap) {\n        int n = val.Length;\n        var idx = Enumerable.Range(0, n).OrderByDescending(i => (double) val[i] / wt[i]).ToArray();\n        double res = 0;\n        foreach (int i in idx) {\n            if (cap >= wt[i]) { res += val[i]; cap -= wt[i]; }\n            else { res += (double) val[i] * cap / wt[i]; break; }\n        }\n        return res;\n    }\n}"
      } }
  ] },
  "a2z-284": { approaches: [
    { id: "greedy-change", title: "Give largest bill first", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Track $5 and $10 bills; give change greedily ($10+$5 before 3x$5). Return false if change impossible.",
      code: {
        java: "class Solution {\n    boolean lemonadeChange(int[] bills) {\n        int f5 = 0, f10 = 0;\n        for (int b : bills) {\n            if (b == 5) f5++;\n            else if (b == 10) { if (f5 == 0) return false; f5--; f10++; }\n            else {\n                if (f10 > 0 && f5 > 0) { f10--; f5--; }\n                else if (f5 >= 3) { f5 -= 3; }\n                else return false;\n            }\n        }\n        return true;\n    }\n}",
        csharp: "public class Solution {\n    public bool LemonadeChange(int[] bills) {\n        int f5 = 0, f10 = 0;\n        foreach (int b in bills) {\n            if (b == 5) f5++;\n            else if (b == 10) { if (f5 == 0) return false; f5--; f10++; }\n            else { if (f10 > 0 && f5 > 0) { f10--; f5--; } else if (f5 >= 3) f5 -= 3; else return false; }\n        }\n        return true;\n    }\n}"
      } }
  ] },
  "a2z-285": { approaches: [
    { id: "wildcard-two-pass", title: "Greedy with star backtracking", level: "Optimal", time: "O(n+m)", space: "O(1)",
      explanation: "Match char-by-char; on '*', save positions and allow the star to consume extra chars on mismatch.",
      code: {
        java: "class Solution {\n    boolean checkValidString(String s) {\n        int lo = 0, hi = 0;\n        for (char c : s.toCharArray()) {\n            if (c == '(') { lo++; hi++; }\n            else if (c == ')') { lo--; hi--; }\n            else { lo--; hi++; }\n            if (hi < 0) return false;\n            lo = Math.max(lo, 0);\n        }\n        return lo == 0;\n    }\n}",
        csharp: "public class Solution {\n    public bool CheckValidString(string s) {\n        int lo = 0, hi = 0;\n        foreach (char c in s) {\n            if (c == '(') { lo++; hi++; }\n            else if (c == ')') { lo--; hi--; }\n            else { lo--; hi++; }\n            if (hi < 0) return false;\n            lo = System.Math.Max(lo, 0);\n        }\n        return lo == 0;\n    }\n}"
      } }
  ] },
  "a2z-286": { approaches: [
    { id: "sort-finish-time", title: "Sort by end time, greedy select", level: "Optimal", time: "O(n log n)", space: "O(1)",
      explanation: "Sort meetings by finish time; take each meeting whose start is >= the last taken finish.",
      code: {
        java: "class Solution {\n    int maxMeetings(int[] start, int[] end, int n) {\n        Integer[] idx = new Integer[n];\n        for (int i = 0; i < n; i++) idx[i] = i;\n        java.util.Arrays.sort(idx, (a, b) -> end[a] - end[b]);\n        int cnt = 0, lastEnd = -1;\n        for (int i : idx) {\n            if (start[i] > lastEnd) { cnt++; lastEnd = end[i]; }\n        }\n        return cnt;\n    }\n}",
        csharp: "public class Solution {\n    public int MaxMeetings(int[] start, int[] end, int n) {\n        var idx = Enumerable.Range(0, n).OrderBy(i => end[i]).ToArray();\n        int cnt = 0, lastEnd = -1;\n        foreach (int i in idx) if (start[i] > lastEnd) { cnt++; lastEnd = end[i]; }\n        return cnt;\n    }\n}"
      } }
  ] },
  "a2z-287": { approaches: [
    { id: "greedy-reach", title: "Track farthest reachable index", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Maintain the farthest index reachable; if at any point i exceeds it, return false.",
      code: {
        java: "class Solution {\n    boolean canJump(int[] nums) {\n        int reach = 0;\n        for (int i = 0; i < nums.length; i++) {\n            if (i > reach) return false;\n            reach = Math.max(reach, i + nums[i]);\n        }\n        return true;\n    }\n}",
        csharp: "public class Solution {\n    public bool CanJump(int[] nums) {\n        int reach = 0;\n        for (int i = 0; i < nums.Length; i++) {\n            if (i > reach) return false;\n            reach = System.Math.Max(reach, i + nums[i]);\n        }\n        return true;\n    }\n}"
      } }
  ] },
  "a2z-288": { approaches: [
    { id: "greedy-jumps", title: "BFS-level greedy", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Track current jump's range [i, curEnd]; when i exceeds curEnd, increment jumps and update to farthest reach.",
      code: {
        java: "class Solution {\n    int jump(int[] nums) {\n        int jumps = 0, curEnd = 0, farthest = 0;\n        for (int i = 0; i < nums.length - 1; i++) {\n            farthest = Math.max(farthest, i + nums[i]);\n            if (i == curEnd) { jumps++; curEnd = farthest; }\n        }\n        return jumps;\n    }\n}",
        csharp: "public class Solution {\n    public int Jump(int[] nums) {\n        int jumps = 0, curEnd = 0, farthest = 0;\n        for (int i = 0; i < nums.Length - 1; i++) {\n            farthest = System.Math.Max(farthest, i + nums[i]);\n            if (i == curEnd) { jumps++; curEnd = farthest; }\n        }\n        return jumps;\n    }\n}"
      } }
  ] },
  "a2z-289": { approaches: [
    { id: "sorted-sweep", title: "Sort arrivals/departures, sweep", level: "Optimal", time: "O(n log n)", space: "O(1)",
      explanation: "Sort arrival and departure times; sweep with two pointers tracking concurrent trains.",
      code: {
        java: "class Solution {\n    int findPlatform(int[] arr, int[] dep) {\n        java.util.Arrays.sort(arr); java.util.Arrays.sort(dep);\n        int n = arr.length, i = 1, j = 0, plat = 1, maxPlat = 1;\n        while (i < n && j < n) {\n            if (arr[i] <= dep[j]) { plat++; i++; maxPlat = Math.max(maxPlat, plat); }\n            else { plat--; j++; }\n        }\n        return maxPlat;\n    }\n}",
        csharp: "public class Solution {\n    public int FindPlatform(int[] arr, int[] dep) {\n        System.Array.Sort(arr); System.Array.Sort(dep);\n        int n = arr.Length, i = 1, j = 0, plat = 1, maxPlat = 1;\n        while (i < n && j < n) {\n            if (arr[i] <= dep[j]) { plat++; i++; maxPlat = System.Math.Max(maxPlat, plat); }\n            else { plat--; j++; }\n        }\n        return maxPlat;\n    }\n}"
      } }
  ] },
  "a2z-290": { approaches: [
    { id: "sort-profit-slot", title: "Sort by profit, fill latest slot", level: "Optimal", time: "O(n^2)", space: "O(n)",
      explanation: "Sort jobs by profit descending; for each job, place it in the latest free slot <= its deadline.",
      code: {
        java: "class Solution {\n    int[] jobScheduling(int[] deadline, int[] profit, int n) {\n        Integer[] idx = new Integer[n];\n        for (int i = 0; i < n; i++) idx[i] = i;\n        java.util.Arrays.sort(idx, (a, b) -> profit[b] - profit[a]);\n        boolean[] slot = new boolean[n + 1];\n        int cnt = 0, maxProfit = 0;\n        for (int i : idx) {\n            for (int j = Math.min(deadline[i], n); j >= 1; j--) {\n                if (!slot[j]) { slot[j] = true; cnt += 1; maxProfit += profit[i]; break; }\n            }\n        }\n        return new int[]{cnt, maxProfit};\n    }\n}",
        csharp: "public class Solution {\n    public int[] JobScheduling(int[] deadline, int[] profit, int n) {\n        var idx = Enumerable.Range(0, n).OrderByDescending(i => profit[i]).ToArray();\n        bool[] slot = new bool[n + 1];\n        int cnt = 0, maxProfit = 0;\n        foreach (int i in idx)\n            for (int j = System.Math.Min(deadline[i], n); j >= 1; j--)\n                if (!slot[j]) { slot[j] = true; cnt++; maxProfit += profit[i]; break; }\n        return new int[] { cnt, maxProfit };\n    }\n}"
      } }
  ] },
  "a2z-291": { approaches: [
    { id: "two-pass-sweep", title: "Left-to-right then right-to-left", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "First pass ensures rising ratings get +1; second pass ensures falling ratings get +1; take max per child.",
      code: {
        java: "class Solution {\n    int candy(int[] ratings) {\n        int n = ratings.length;\n        int[] c = new int[n];\n        java.util.Arrays.fill(c, 1);\n        for (int i = 1; i < n; i++)\n            if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;\n        for (int i = n - 2; i >= 0; i--)\n            if (ratings[i] > ratings[i + 1]) c[i] = Math.max(c[i], c[i + 1] + 1);\n        int sum = 0;\n        for (int x : c) sum += x;\n        return sum;\n    }\n}",
        csharp: "public class Solution {\n    public int Candy(int[] ratings) {\n        int n = ratings.Length;\n        int[] c = new int[n];\n        Array.Fill(c, 1);\n        for (int i = 1; i < n; i++) if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;\n        for (int i = n - 2; i >= 0; i--) if (ratings[i] > ratings[i + 1]) c[i] = System.Math.Max(c[i], c[i + 1] + 1);\n        return c.Sum();\n    }\n}"
      } }
  ] },
  "a2z-292": { approaches: [
    { id: "sort-burst", title: "Sort by burst time, compute avg wait", level: "Optimal", time: "O(n log n)", space: "O(1)",
      explanation: "SJF = shortest-job-first: sort by burst, accumulate weighted completion time.",
      code: {
        java: "class Solution {\n    float solve(int[] burst, int n) {\n        java.util.Arrays.sort(burst);\n        int totalWait = 0, currTime = 0;\n        for (int i = 0; i < n; i++) {\n            totalWait += currTime;\n            currTime += burst[i];\n        }\n        return (float) totalWait / n;\n    }\n}",
        csharp: "public class Solution {\n    public float Solve(int[] burst, int n) {\n        System.Array.Sort(burst);\n        int totalWait = 0, currTime = 0;\n        for (int i = 0; i < n; i++) { totalWait += currTime; currTime += burst[i]; }\n        return (float) totalWait / n;\n    }\n}"
      } }
  ] },
  "a2z-293": { approaches: [
    { id: "future-use-map", title: "Evict page used farthest in future", level: "Optimal", time: "O(n * pages)", space: "O(pages)",
      explanation: "LRU simulation: on a page fault, evict the in-memory page whose next use is farthest (or never).",
      code: {
        java: "class Solution {\n    int pageFaults(int[] pages, int n, int cap) {\n        java.util.LinkedHashSet<Integer> mem = new java.util.LinkedHashSet<>();\n        int faults = 0;\n        for (int i = 0; i < n; i++) {\n            if (mem.contains(pages[i])) { mem.remove(pages[i]); mem.add(pages[i]); continue; }\n            faults++;\n            if (mem.size() >= cap) mem.remove(mem.iterator().next());\n            mem.add(pages[i]);\n        }\n        return faults;\n    }\n}",
        csharp: "public class Solution {\n    public int PageFaults(int[] pages, int n, int cap) {\n        var mem = new List<int>();\n        int faults = 0;\n        for (int i = 0; i < n; i++) {\n            int idx = mem.IndexOf(pages[i]);\n            if (idx >= 0) { mem.RemoveAt(idx); mem.Add(pages[i]); continue; }\n            faults++;\n            if (mem.Count >= cap) mem.RemoveAt(0);\n            mem.Add(pages[i]);\n        }\n        return faults;\n    }\n}"
      } }
  ] },
  "a2z-294": { approaches: [
    { id: "sort-merge", title: "Sort by start, merge overlapping", level: "Optimal", time: "O(n log n)", space: "O(n)",
      explanation: "Insert the new interval then merge all overlapping intervals in sorted order.",
      code: {
        java: "class Solution {\n    int[][] insert(int[][] intervals, int[] newInterval) {\n        java.util.List<int[]> res = new java.util.ArrayList<>();\n        int i = 0, n = intervals.length;\n        while (i < n && intervals[i][1] < newInterval[0]) res.add(intervals[i++]);\n        while (i < n && intervals[i][0] <= newInterval[1]) {\n            newInterval[0] = Math.min(newInterval[0], intervals[i][0]);\n            newInterval[1] = Math.max(newInterval[1], intervals[i][1]);\n            i++;\n        }\n        res.add(newInterval);\n        while (i < n) res.add(intervals[i++]);\n        return res.toArray(new int[0][]);\n    }\n}",
        csharp: "public class Solution {\n    public int[][] Insert(int[][] intervals, int[] newInterval) {\n        var res = new List<int[]>();\n        int i = 0, n = intervals.Length;\n        while (i < n && intervals[i][1] < newInterval[0]) res.Add(intervals[i++]);\n        while (i < n && intervals[i][0] <= newInterval[1]) {\n            newInterval[0] = System.Math.Min(newInterval[0], intervals[i][0]);\n            newInterval[1] = System.Math.Max(newInterval[1], intervals[i][1]);\n            i++;\n        }\n        res.Add(newInterval);\n        while (i < n) res.Add(intervals[i++]);\n        return res.ToArray();\n    }\n}"
      } }
  ] },
  "a2z-295": { approaches: [
    { id: "sort-merge-int", title: "Sort by start, coalesce overlaps", level: "Optimal", time: "O(n log n)", space: "O(n)",
      explanation: "Sort intervals by start; merge current into last result if overlapping, else append.",
      code: {
        java: "class Solution {\n    int[][] merge(int[][] intervals) {\n        java.util.Arrays.sort(intervals, (a, b) -> a[0] - b[0]);\n        java.util.List<int[]> res = new java.util.ArrayList<>();\n        for (int[] iv : intervals) {\n            if (!res.isEmpty() && iv[0] <= res.get(res.size() - 1)[1])\n                res.get(res.size() - 1)[1] = Math.max(res.get(res.size() - 1)[1], iv[1]);\n            else res.add(iv);\n        }\n        return res.toArray(new int[0][]);\n    }\n}",
        csharp: "public class Solution {\n    public int[][] Merge(int[][] intervals) {\n        System.Array.Sort(intervals, (a, b) => a[0] - b[0]);\n        var res = new List<int[]>();\n        foreach (var iv in intervals) {\n            if (res.Count > 0 && iv[0] <= res[^1][1]) res[^1][1] = System.Math.Max(res[^1][1], iv[1]);\n            else res.Add(iv);\n        }\n        return res.ToArray();\n    }\n}"
      } }
  ] },
  "a2z-296": { approaches: [
    { id: "sort-end-greedy", title: "Sort by end, skip overlaps", level: "Optimal", time: "O(n log n)", space: "O(1)",
      explanation: "Sort by end time; keep the interval with smallest end and remove all that overlap it; count removals.",
      code: {
        java: "class Solution {\n    int eraseOverlapIntervals(int[][] intervals) {\n        java.util.Arrays.sort(intervals, (a, b) -> a[1] - b[1]);\n        int removed = 0, end = Integer.MIN_VALUE;\n        for (int[] iv : intervals) {\n            if (iv[0] >= end) end = iv[1];\n            else removed++;\n        }\n        return removed;\n    }\n}",
        csharp: "public class Solution {\n    public int EraseOverlapIntervals(int[][] intervals) {\n        System.Array.Sort(intervals, (a, b) => a[1] - b[1]);\n        int removed = 0, end = int.MinValue;\n        foreach (var iv in intervals) { if (iv[0] >= end) end = iv[1]; else removed++; }\n        return removed;\n    }\n}"
      } }
  ] }
};
