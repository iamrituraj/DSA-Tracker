export default {
  "a2z-059": { approaches: [
    { id: "recursive-bubble", title: "Recursive bubble sort — bubble the max to the end", level: "Optimal", time: "O(n²)", space: "O(n) stack",
      explanation: "One pass bubbles the largest of a[0..n-1] to index n-1; then recurse on the first n-1 elements.",
      code: {
        java: "class Solution {\n    void bubbleSort(int[] a, int n) {\n        if (n <= 1) return;\n        for (int j = 0; j < n - 1; j++) {\n            if (a[j] > a[j + 1]) {\n                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;\n            }\n        }\n        bubbleSort(a, n - 1);\n    }\n}",
        csharp: "public class Solution {\n    public void BubbleSort(int[] a, int n) {\n        if (n <= 1) return;\n        for (int j = 0; j < n - 1; j++) {\n            if (a[j] > a[j + 1]) {\n                (a[j], a[j + 1]) = (a[j + 1], a[j]);\n            }\n        }\n        BubbleSort(a, n - 1);\n    }\n}"
      } }
  ] },
  "a2z-060": { approaches: [
    { id: "recursive-insertion", title: "Recursive insertion sort — insert the last element", level: "Optimal", time: "O(n²)", space: "O(n) stack",
      explanation: "Sort the prefix of size n-1 recursively, then insert a[n-1] into its place by shifting larger elements right.",
      code: {
        java: "class Solution {\n    void insertionSort(int[] a, int n) {\n        if (n <= 1) return;\n        insertionSort(a, n - 1);\n        int key = a[n - 1], j = n - 2;\n        while (j >= 0 && a[j] > key) {\n            a[j + 1] = a[j];\n            j--;\n        }\n        a[j + 1] = key;\n    }\n}",
        csharp: "public class Solution {\n    public void InsertionSort(int[] a, int n) {\n        if (n <= 1) return;\n        InsertionSort(a, n - 1);\n        int key = a[n - 1], j = n - 2;\n        while (j >= 0 && a[j] > key) {\n            a[j + 1] = a[j];\n            j--;\n        }\n        a[j + 1] = key;\n    }\n}"
      } }
  ] },
  "a2z-102": { approaches: [
    { id: "linear-scan", title: "Linear scan", level: "Brute", time: "O(n)", space: "O(1)",
      explanation: "Check every element against x; return the index on the first match, otherwise -1.",
      code: {
        java: "class Solution {\n    int search(int[] a, int x) {\n        for (int i = 0; i < a.length; i++)\n            if (a[i] == x) return i;\n        return -1;\n    }\n}",
        csharp: "public class Solution {\n    public int Search(int[] a, int x) {\n        for (int i = 0; i < a.Length; i++)\n            if (a[i] == x) return i;\n        return -1;\n    }\n}"
      } },
    { id: "binary-search", title: "Binary search — halve the sorted range", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "Compare the middle element with x and discard the half that cannot contain it.",
      code: {
        java: "class Solution {\n    int search(int[] a, int x) {\n        int lo = 0, hi = a.length - 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] == x) return mid;\n            if (a[mid] < x) lo = mid + 1;\n            else hi = mid - 1;\n        }\n        return -1;\n    }\n}",
        csharp: "public class Solution {\n    public int Search(int[] a, int x) {\n        int lo = 0, hi = a.Length - 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] == x) return mid;\n            if (a[mid] < x) lo = mid + 1;\n            else hi = mid - 1;\n        }\n        return -1;\n    }\n}"
      } }
  ] },
  "a2z-103": { approaches: [
    { id: "lower-bound", title: "Binary search on the answer", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "Lower bound = smallest index with a[idx] >= x. If a[mid] >= x it is a candidate, record it and move left; otherwise move right.",
      code: {
        java: "class Solution {\n    int lowerBound(int[] a, int x) {\n        int lo = 0, hi = a.length - 1, ans = a.length;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] >= x) {\n                ans = mid;\n                hi = mid - 1;\n            } else {\n                lo = mid + 1;\n            }\n        }\n        return ans;\n    }\n}",
        csharp: "public class Solution {\n    public int LowerBound(int[] a, int x) {\n        int lo = 0, hi = a.Length - 1, ans = a.Length;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] >= x) {\n                ans = mid;\n                hi = mid - 1;\n            } else {\n                lo = mid + 1;\n            }\n        }\n        return ans;\n    }\n}"
      } }
  ] },
  "a2z-104": { approaches: [
    { id: "upper-bound", title: "Binary search on the answer", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "Upper bound = smallest index with a[idx] > x. Only strictly greater middles are candidates, so move left on a[mid] > x.",
      code: {
        java: "class Solution {\n    int upperBound(int[] a, int x) {\n        int lo = 0, hi = a.length - 1, ans = a.length;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] > x) {\n                ans = mid;\n                hi = mid - 1;\n            } else {\n                lo = mid + 1;\n            }\n        }\n        return ans;\n    }\n}",
        csharp: "public class Solution {\n    public int UpperBound(int[] a, int x) {\n        int lo = 0, hi = a.Length - 1, ans = a.Length;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] > x) {\n                ans = mid;\n                hi = mid - 1;\n            } else {\n                lo = mid + 1;\n            }\n        }\n        return ans;\n    }\n}"
      } }
  ] },
  "a2z-105": { approaches: [
    { id: "lower-bound-insert", title: "Lower bound gives the slot", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "The insert position is exactly the lower bound of target — the first index whose value is >= target (or n if none).",
      code: {
        java: "class Solution {\n    int searchInsert(int[] a, int target) {\n        int lo = 0, hi = a.length;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] >= target) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}",
        csharp: "public class Solution {\n    public int SearchInsert(int[] a, int target) {\n        int lo = 0, hi = a.Length;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] >= target) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}"
      } }
  ] },
  "a2z-106": { approaches: [
    { id: "lb-ceil-floors", title: "Floor = ceil - 1 via one lower bound", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "The lower bound idx is the first element >= x, so it is the ceil; the floor is the element at idx - 1. Both are -1 when out of range.",
      code: {
        java: "class Solution {\n    int[] getFloorAndCeil(int[] a, int x) {\n        int lo = 0, hi = a.length - 1, ub = a.length;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] >= x) {\n                ub = mid;\n                hi = mid - 1;\n            } else {\n                lo = mid + 1;\n            }\n        }\n        int floor = ub - 1 >= 0 ? a[ub - 1] : -1;\n        int ceil = ub < a.length ? a[ub] : -1;\n        return new int[] { floor, ceil };\n    }\n}",
        csharp: "public class Solution {\n    public int[] GetFloorAndCeil(int[] a, int x) {\n        int lo = 0, hi = a.Length - 1, ub = a.Length;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] >= x) {\n                ub = mid;\n                hi = mid - 1;\n            } else {\n                lo = mid + 1;\n            }\n        }\n        int floor = ub - 1 >= 0 ? a[ub - 1] : -1;\n        int ceil = ub < a.Length ? a[ub] : -1;\n        return new int[] { floor, ceil };\n    }\n}"
      } }
  ] },
  "a2z-107": { approaches: [
    { id: "count-array", title: "Bucket positions by value", level: "Brute", time: "O(n + maxA)", space: "O(maxA)",
      explanation: "Store every occurrence index per value in buckets, then read the bucket of x. Linear but ignores the sorted order.",
      code: {
        java: "class Solution {\n    int[] firstAndLastPosition(int[] a, int n, int x) {\n        java.util.List<Integer>[] pos = new java.util.ArrayList[1000001];\n        for (int i = 0; i < n; i++) {\n            if (pos[a[i]] == null) pos[a[i]] = new java.util.ArrayList<>();\n            pos[a[i]].add(i);\n        }\n        if (pos[x] == null || pos[x].isEmpty()) return new int[] { -1, -1 };\n        return new int[] { pos[x].get(0), pos[x].get(pos[x].size() - 1) };\n    }\n}",
        csharp: "public class Solution {\n    public int[] FirstAndLastPosition(int[] a, int n, int x) {\n        System.Collections.Generic.List<int>[] pos = new System.Collections.Generic.List<int>[1000001];\n        for (int i = 0; i < n; i++) {\n            pos[a[i]] ??= new System.Collections.Generic.List<int>();\n            pos[a[i]].Add(i);\n        }\n        if (pos[x] == null || pos[x].Count == 0) return new int[] { -1, -1 };\n        return new int[] { pos[x][0], pos[x][pos[x].Count - 1] };\n    }\n}"
      } },
    { id: "two-bounds", title: "Lower bound + upper bound", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "First occurrence = lower bound of x; last = upper bound of x minus 1. Verify the bound actually points at x.",
      code: {
        java: "class Solution {\n    int[] firstAndLastPosition(int[] a, int n, int x) {\n        int lo = 0, hi = n - 1, first = n;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] >= x) {\n                first = mid;\n                hi = mid - 1;\n            } else lo = mid + 1;\n        }\n        if (first == n || a[first] != x) return new int[] { -1, -1 };\n        lo = 0; hi = n - 1;\n        int last = -1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] <= x) {\n                last = mid;\n                lo = mid + 1;\n            } else hi = mid - 1;\n        }\n        return new int[] { first, last };\n    }\n}",
        csharp: "public class Solution {\n    public int[] FirstAndLastPosition(int[] a, int n, int x) {\n        int lo = 0, hi = n - 1, first = n;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] >= x) {\n                first = mid;\n                hi = mid - 1;\n            } else lo = mid + 1;\n        }\n        if (first == n || a[first] != x) return new int[] { -1, -1 };\n        lo = 0; hi = n - 1;\n        int last = -1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] <= x) {\n                last = mid;\n                lo = mid + 1;\n            } else hi = mid - 1;\n        }\n        return new int[] { first, last };\n    }\n}"
      } }
  ] },
  "a2z-108": { approaches: [
    { id: "count-map", title: "Frequency map", level: "Brute", time: "O(n)", space: "O(n)",
      explanation: "Count every value in a hash map and answer each query in O(1). Ignores the sorted structure.",
      code: {
        java: "class Solution {\n    int[] occurrencesCount(int[] a, int n, int[] x, int m) {\n        java.util.Map<Integer, Integer> freq = new java.util.HashMap<>();\n        for (int v : a) freq.put(v, freq.getOrDefault(v, 0) + 1);\n        int[] res = new int[m];\n        for (int i = 0; i < m; i++) res[i] = freq.getOrDefault(x[i], 0);\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public int[] OccurrencesCount(int[] a, int n, int[] x, int m) {\n        System.Collections.Generic.Dictionary<int, int> freq = new System.Collections.Generic.Dictionary<int, int>();\n        foreach (int v in a) freq[v] = freq.TryGetValue(v, out int c) ? c + 1 : 1;\n        int[] res = new int[m];\n        for (int i = 0; i < m; i++) res[i] = freq.TryGetValue(x[i], out int c) ? c : 0;\n        return res;\n    }\n}"
      } },
    { id: "bounds-diff", title: "upperBound(x) - lowerBound(x)", level: "Optimal", time: "O(m log n)", space: "O(1)",
      explanation: "In a sorted array all copies of x form a contiguous block whose size equals upper bound minus lower bound. Repeat per query.",
      code: {
        java: "class Solution {\n    int lowerBound(int[] a, int x) {\n        int lo = 0, hi = a.length;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] >= x) hi = mid; else lo = mid + 1;\n        }\n        return lo;\n    }\n    int upperBound(int[] a, int x) {\n        int lo = 0, hi = a.length;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] > x) hi = mid; else lo = mid + 1;\n        }\n        return lo;\n    }\n    int[] occurrencesCount(int[] a, int n, int[] x, int m) {\n        int[] res = new int[m];\n        for (int i = 0; i < m; i++) res[i] = upperBound(a, x[i]) - lowerBound(a, x[i]);\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    int LowerBound(int[] a, int x) {\n        int lo = 0, hi = a.Length;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] >= x) hi = mid; else lo = mid + 1;\n        }\n        return lo;\n    }\n    int UpperBound(int[] a, int x) {\n        int lo = 0, hi = a.Length;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] > x) hi = mid; else lo = mid + 1;\n        }\n        return lo;\n    }\n    public int[] OccurrencesCount(int[] a, int n, int[] x, int m) {\n        int[] res = new int[m];\n        for (int i = 0; i < m; i++) res[i] = UpperBound(a, x[i]) - LowerBound(a, x[i]);\n        return res;\n    }\n}"
      } }
  ] },
  "a2z-109": { approaches: [
    { id: "sorted-half-check", title: "Binary search keeping one sorted half", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "At each middle, one of the two halves is sorted. If x lies inside that sorted half, search it; otherwise search the other half.",
      code: {
        java: "class Solution {\n    int search(int[] a, int x) {\n        int lo = 0, hi = a.length - 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] == x) return mid;\n            if (a[lo] <= a[mid]) {\n                if (a[lo] <= x && x < a[mid]) hi = mid - 1;\n                else lo = mid + 1;\n            } else {\n                if (a[mid] < x && x <= a[hi]) lo = mid + 1;\n                else hi = mid - 1;\n            }\n        }\n        return -1;\n    }\n}",
        csharp: "public class Solution {\n    public int Search(int[] a, int x) {\n        int lo = 0, hi = a.Length - 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] == x) return mid;\n            if (a[lo] <= a[mid]) {\n                if (a[lo] <= x && x < a[mid]) hi = mid - 1;\n                else lo = mid + 1;\n            } else {\n                if (a[mid] < x && x <= a[hi]) lo = mid + 1;\n                else hi = mid - 1;\n            }\n        }\n        return -1;\n    }\n}"
      } }
  ] },
  "a2z-110": { approaches: [
    { id: "skip-ambiguity", title: "Sorted-half check with duplicate skipping", level: "Optimal", time: "O(log n) avg, O(n) worst", space: "O(1)",
      explanation: "Same as rotated search I, but when a[lo] == a[mid] == a[hi] we cannot tell which half is sorted, so shrink both ends by one.",
      code: {
        java: "class Solution {\n    boolean search(int[] a, int x) {\n        int lo = 0, hi = a.length - 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] == x) return true;\n            if (a[lo] == a[mid] && a[mid] == a[hi]) {\n                lo++; hi--;\n            } else if (a[lo] <= a[mid]) {\n                if (a[lo] <= x && x < a[mid]) hi = mid - 1;\n                else lo = mid + 1;\n            } else {\n                if (a[mid] < x && x <= a[hi]) lo = mid + 1;\n                else hi = mid - 1;\n            }\n        }\n        return false;\n    }\n}",
        csharp: "public class Solution {\n    public bool Search(int[] a, int x) {\n        int lo = 0, hi = a.Length - 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] == x) return true;\n            if (a[lo] == a[mid] && a[mid] == a[hi]) {\n                lo++; hi--;\n            } else if (a[lo] <= a[mid]) {\n                if (a[lo] <= x && x < a[mid]) hi = mid - 1;\n                else lo = mid + 1;\n            } else {\n                if (a[mid] < x && x <= a[hi]) lo = mid + 1;\n                else hi = mid - 1;\n            }\n        }\n        return false;\n    }\n}"
      } }
  ] },
  "a2z-111": { approaches: [
    { id: "sorted-half-min", title: "Push toward the unsorted half", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "If the range is already sorted, a[lo] is the minimum. Otherwise the pivot lives in the unsorted half, so compare with a[hi] and move there.",
      code: {
        java: "class Solution {\n    int findMin(int[] a) {\n        int lo = 0, hi = a.length - 1, ans = Integer.MAX_VALUE;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[lo] <= a[hi]) {\n                ans = Math.min(ans, a[lo]);\n                break;\n            }\n            if (a[mid] >= a[lo]) {\n                ans = Math.min(ans, a[lo]);\n                lo = mid + 1;\n            } else {\n                ans = Math.min(ans, a[mid]);\n                hi = mid - 1;\n            }\n        }\n        return ans;\n    }\n}",
        csharp: "public class Solution {\n    public int FindMin(int[] a) {\n        int lo = 0, hi = a.Length - 1, ans = int.MaxValue;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[lo] <= a[hi]) {\n                ans = Math.Min(ans, a[lo]);\n                break;\n            }\n            if (a[mid] >= a[lo]) {\n                ans = Math.Min(ans, a[lo]);\n                lo = mid + 1;\n            } else {\n                ans = Math.Min(ans, a[mid]);\n                hi = mid - 1;\n            }\n        }\n        return ans;\n    }\n}"
      } }
  ] },
  "a2z-112": { approaches: [
    { id: "index-of-min", title: "Rotation count = index of the minimum", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "The array was rotated right by k, so the smallest element sits at index k. Binary search for it; a sorted range means k = 0.",
      code: {
        java: "class Solution {\n    int findRotationCount(int[] a) {\n        int lo = 0, hi = a.length - 1;\n        while (lo <= hi) {\n            if (a[lo] <= a[hi]) return lo;\n            int mid = lo + (hi - lo) / 2;\n            int prev = (mid + a.length - 1) % a.length, next = (mid + 1) % a.length;\n            if (a[mid] <= a[prev] && a[mid] <= a[next]) return mid;\n            if (a[lo] <= a[mid]) lo = mid + 1;\n            else hi = mid - 1;\n        }\n        return -1;\n    }\n}",
        csharp: "public class Solution {\n    public int FindRotationCount(int[] a) {\n        int lo = 0, hi = a.Length - 1;\n        while (lo <= hi) {\n            if (a[lo] <= a[hi]) return lo;\n            int mid = lo + (hi - lo) / 2;\n            int prev = (mid + a.Length - 1) % a.Length, next = (mid + 1) % a.Length;\n            if (a[mid] <= a[prev] && a[mid] <= a[next]) return mid;\n            if (a[lo] <= a[mid]) lo = mid + 1;\n            else hi = mid - 1;\n        }\n        return -1;\n    }\n}"
      } }
  ] },
  "a2z-113": { approaches: [
    { id: "xor-all", title: "XOR everything", level: "Brute", time: "O(n)", space: "O(1)",
      explanation: "Pairs cancel under XOR, so XOR of the whole array leaves the single element.",
      code: {
        java: "class Solution {\n    int singleNonDuplicate(int[] a) {\n        int x = 0;\n        for (int v : a) x ^= v;\n        return x;\n    }\n}",
        csharp: "public class Solution {\n    public int SingleNonDuplicate(int[] a) {\n        int x = 0;\n        foreach (int v in a) x ^= v;\n        return x;\n    }\n}"
      } },
    { id: "binary-search-parity", title: "Binary search on the pair structure", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "Before the single element, pairs start at even indices. If mid is even (or odd with its partner on the left), the left side is intact, so go right; otherwise go left.",
      code: {
        java: "class Solution {\n    int singleNonDuplicate(int[] a) {\n        int lo = 0, hi = a.length - 2;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (mid % 2 == 0) {\n                if (a[mid] == a[mid + 1]) lo = mid + 1;\n                else hi = mid - 1;\n            } else {\n                if (a[mid - 1] == a[mid]) lo = mid + 1;\n                else hi = mid - 1;\n            }\n        }\n        return a[lo];\n    }\n}",
        csharp: "public class Solution {\n    public int SingleNonDuplicate(int[] a) {\n        int lo = 0, hi = a.Length - 2;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (mid % 2 == 0) {\n                if (a[mid] == a[mid + 1]) lo = mid + 1;\n                else hi = mid - 1;\n            } else {\n                if (a[mid - 1] == a[mid]) lo = mid + 1;\n                else hi = mid - 1;\n            }\n        }\n        return a[lo];\n    }\n}"
      } }
  ] },
  "a2z-114": { approaches: [
    { id: "linear-peak", title: "Linear scan for a local max", level: "Brute", time: "O(n)", space: "O(1)",
      explanation: "Return the first index whose value beats both neighbours (edges count as -infinity).",
      code: {
        java: "class Solution {\n    int findPeakElement(int[] a) {\n        int n = a.length;\n        for (int i = 0; i < n; i++) {\n            if ((i == 0 || a[i] > a[i - 1]) && (i == n - 1 || a[i] > a[i + 1]))\n                return i;\n        }\n        return -1;\n    }\n}",
        csharp: "public class Solution {\n    public int FindPeakElement(int[] a) {\n        int n = a.Length;\n        for (int i = 0; i < n; i++) {\n            if ((i == 0 || a[i] > a[i - 1]) && (i == n - 1 || a[i] > a[i + 1]))\n                return i;\n        }\n        return -1;\n    }\n}"
      } },
    { id: "binary-search-slope", title: "Climb the slope with binary search", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "If a[mid] < a[mid+1] a peak is guaranteed on the right; otherwise a peak exists at mid or on the left. Never need both neighbours.",
      code: {
        java: "class Solution {\n    int findPeakElement(int[] a) {\n        int lo = 0, hi = a.length - 1;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] < a[mid + 1]) lo = mid + 1;\n            else hi = mid;\n        }\n        return lo;\n    }\n}",
        csharp: "public class Solution {\n    public int FindPeakElement(int[] a) {\n        int lo = 0, hi = a.Length - 1;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] < a[mid + 1]) lo = mid + 1;\n            else hi = mid;\n        }\n        return lo;\n    }\n}"
      } }
  ] },
  "a2z-115": { approaches: [
    { id: "incremental", title: "Grow the root one step at a time", level: "Brute", time: "O(sqrt(n))", space: "O(1)",
      explanation: "Keep adding 1 to i while i*i fits in n; the answer is i - 1.",
      code: {
        java: "class Solution {\n    int floorSqrt(int n) {\n        long i = 1;\n        while (i * i <= n) i++;\n        return (int) (i - 1);\n    }\n}",
        csharp: "public class Solution {\n    public int FloorSqrt(int n) {\n        long i = 1;\n        while (i * i <= n) i++;\n        return (int) (i - 1);\n    }\n}"
      } },
    { id: "binary-search-sq", title: "Binary search on the answer", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "Search i in [1, n]; a mid is a candidate when mid*mid <= n, then push lo up to find the largest such i.",
      code: {
        java: "class Solution {\n    int floorSqrt(int n) {\n        long lo = 1, hi = n, ans = 0;\n        while (lo <= hi) {\n            long mid = lo + (hi - lo) / 2;\n            if (mid * mid <= n) {\n                ans = mid;\n                lo = mid + 1;\n            } else hi = mid - 1;\n        }\n        return (int) ans;\n    }\n}",
        csharp: "public class Solution {\n    public int FloorSqrt(int n) {\n        long lo = 1, hi = n, ans = 0;\n        while (lo <= hi) {\n            long mid = lo + (hi - lo) / 2;\n            if (mid * mid <= n) {\n                ans = mid;\n                lo = mid + 1;\n            } else hi = mid - 1;\n        }\n        return (int) ans;\n    }\n}"
      } }
  ] },
  "a2z-116": { approaches: [
    { id: "binary-search-root", title: "Binary search for the greatest i with i^n <= m", level: "Optimal", time: "O(n log m)", space: "O(1)",
      explanation: "Search i in [1, m]; multiply i by itself n times (capping at m to avoid overflow) and keep the largest i whose power does not exceed m.",
      code: {
        java: "class Solution {\n    int nthRoot(int n, int m) {\n        long lo = 1, hi = m, ans = -1;\n        while (lo <= hi) {\n            long mid = lo + (hi - lo) / 2;\n            long p = 1;\n            for (int i = 0; i < n && p <= m; i++) p *= mid;\n            if (p == m) return (int) mid;\n            if (p < m) {\n                ans = mid;\n                lo = mid + 1;\n            } else hi = mid - 1;\n        }\n        return (int) ans;\n    }\n}",
        csharp: "public class Solution {\n    public int NthRoot(int n, int m) {\n        long lo = 1, hi = m, ans = -1;\n        while (lo <= hi) {\n            long mid = lo + (hi - lo) / 2;\n            long p = 1;\n            for (int i = 0; i < n && p <= m; i++) p *= mid;\n            if (p == m) return (int) mid;\n            if (p < m) {\n                ans = mid;\n                lo = mid + 1;\n            } else hi = mid - 1;\n        }\n        return (int) ans;\n    }\n}"
      } }
  ] },
  "a2z-117": { approaches: [
    { id: "binary-search-k", title: "Binary search the speed k", level: "Optimal", time: "O(n log maxPiles)", space: "O(1)",
      explanation: "Feasibility is monotone in k: if speed k finishes in h hours, so does any larger speed. For a candidate k the hours needed are sum of ceil(pile / k).",
      code: {
        java: "class Solution {\n    int minEatingSpeed(int[] piles, int h) {\n        int lo = 1, hi = 0;\n        for (int p : piles) hi = Math.max(hi, p);\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            long hours = 0;\n            for (int p : piles) hours += (p + (long) mid - 1) / mid;\n            if (hours <= h) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}",
        csharp: "public class Solution {\n    public int MinEatingSpeed(int[] piles, int h) {\n        int lo = 1, hi = 0;\n        foreach (int p in piles) hi = Math.Max(hi, p);\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            long hours = 0;\n            foreach (int p in piles) hours += (p + (long) mid - 1) / mid;\n            if (hours <= h) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}"
      } }
  ] },
  "a2z-118": { approaches: [
    { id: "binary-search-days", title: "Binary search the day count", level: "Optimal", time: "O(n log n)", space: "O(1)",
      explanation: "For a candidate day d, count bouquets made from windows of k adjacent bloomed roses (using an earliest-last-bloom running counter) and check against m.",
      code: {
        java: "class Solution {\n    int minDays(int[] bloomDay, int m, int k) {\n        if ((long) m * k > bloomDay.length) return -1;\n        int lo = 1, hi = 0;\n        for (int d : bloomDay) hi = Math.max(hi, d);\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            long bouquets = 0, roses = 0;\n            for (int d : bloomDay) {\n                if (d <= mid) {\n                    roses++;\n                    if (roses == k) {\n                        bouquets++;\n                        roses = 0;\n                    }\n                } else roses = 0;\n            }\n            if (bouquets >= m) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}",
        csharp: "public class Solution {\n    public int MinDays(int[] bloomDay, int m, int k) {\n        if ((long) m * k > bloomDay.Length) return -1;\n        int lo = 1, hi = 0;\n        foreach (int d in bloomDay) hi = Math.Max(hi, d);\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            long bouquets = 0, roses = 0;\n            foreach (int d in bloomDay) {\n                if (d <= mid) {\n                    roses++;\n                    if (roses == k) {\n                        bouquets++;\n                        roses = 0;\n                    }\n                } else roses = 0;\n            }\n            if (bouquets >= m) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}"
      } }
  ] },
  "a2z-119": { approaches: [
    { id: "binary-search-divisor", title: "Binary search the divisor", level: "Optimal", time: "O(n log maxA)", space: "O(1)",
      explanation: "The divisibility sum is monotone decreasing in the divisor, so binary search the smallest d with sum of ceil(a/d) <= threshold.",
      code: {
        java: "class Solution {\n    int smallestDivisor(int[] a, int threshold) {\n        int lo = 1, hi = 0;\n        for (int v : a) hi = Math.max(hi, v);\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2, sum = 0;\n            for (int v : a) sum += (v + mid - 1) / mid;\n            if (sum <= threshold) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}",
        csharp: "public class Solution {\n    public int SmallestDivisor(int[] a, int threshold) {\n        int lo = 1, hi = 0;\n        foreach (int v in a) hi = Math.Max(hi, v);\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2, sum = 0;\n            foreach (int v in a) sum += (v + mid - 1) / mid;\n            if (sum <= threshold) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}"
      } }
  ] },
  "a2z-120": { approaches: [
    { id: "binary-search-capacity", title: "Binary search the ship capacity", level: "Optimal", time: "O(n log sumW)", space: "O(1)",
      explanation: "Capacity is monotone: greedy-loading days in order, a larger cap never needs more days. Lower bound = max weight, upper = total weight.",
      code: {
        java: "class Solution {\n    int shipWithinDays(int[] w, int days) {\n        int lo = 0, hi = 0;\n        for (int v : w) {\n            lo = Math.max(lo, v);\n            hi += v;\n        }\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2, need = 1, load = 0;\n            for (int v : w) {\n                if (load + v > mid) {\n                    need++;\n                    load = 0;\n                }\n                load += v;\n            }\n            if (need <= days) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}",
        csharp: "public class Solution {\n    public int ShipWithinDays(int[] w, int days) {\n        int lo = 0, hi = 0;\n        foreach (int v in w) {\n            lo = Math.Max(lo, v);\n            hi += v;\n        }\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2, need = 1, load = 0;\n            foreach (int v in w) {\n                if (load + v > mid) {\n                    need++;\n                    load = 0;\n                }\n                load += v;\n            }\n            if (need <= days) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}"
      } }
  ] },
  "a2z-121": { approaches: [
    { id: "linear-scan-k", title: "Walk the array decrementing k", level: "Brute", time: "O(n)", space: "O(1)",
      explanation: "Each present number a[i] <= k removes one candidate, so shrink k as you scan; the final k is the missing one.",
      code: {
        java: "class Solution {\n    int findKthPositive(int[] a, int k) {\n        for (int v : a) {\n            if (v <= k) k++;\n            else break;\n        }\n        return k;\n    }\n}",
        csharp: "public class Solution {\n    public int FindKthPositive(int[] a, int k) {\n        foreach (int v in a) {\n            if (v <= k) k++;\n            else break;\n        }\n        return k;\n    }\n}"
      } },
    { id: "binary-search-missing", title: "Binary search on missing count", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "a[i] - (i + 1) numbers are missing up to index i and this count is non-decreasing, so binary search the first index with at least k missing and derive the answer from there.",
      code: {
        java: "class Solution {\n    int findKthPositive(int[] a, int k) {\n        int lo = 0, hi = a.length;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] - (mid + 1) >= k) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo == 0 ? k : a[lo - 1] + k - (a[lo - 1] - lo);\n    }\n}",
        csharp: "public class Solution {\n    public int FindKthPositive(int[] a, int k) {\n        int lo = 0, hi = a.Length;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (a[mid] - (mid + 1) >= k) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo == 0 ? k : a[lo - 1] + k - (a[lo - 1] - lo);\n    }\n}"
      } }
  ] }
};
