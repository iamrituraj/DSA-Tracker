export default {
  "a2z-122": { approaches: [
    { id: "bs-max-dist", title: "Binary search the largest minimum distance", level: "Optimal", time: "O(n log range)", space: "O(1)",
      explanation: "Greedily place cows keeping at least d apart; feasibility is monotone in d, so binary search the maximum d that fits c cows.",
      code: {
        java: "class Solution {\n    boolean canPlace(int[] stalls, int c, int d) {\n        int placed = 1, last = stalls[0];\n        for (int i = 1; i < stalls.length && placed < c; i++) {\n            if (stalls[i] - last >= d) {\n                placed++;\n                last = stalls[i];\n            }\n        }\n        return placed >= c;\n    }\n    int aggressiveCows(int[] stalls, int k) {\n        java.util.Arrays.sort(stalls);\n        int lo = 1, hi = stalls[stalls.length - 1] - stalls[0], ans = 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (canPlace(stalls, k, mid)) {\n                ans = mid;\n                lo = mid + 1;\n            } else hi = mid - 1;\n        }\n        return ans;\n    }\n}",
        csharp: "public class Solution {\n    bool CanPlace(int[] stalls, int c, int d) {\n        int placed = 1, last = stalls[0];\n        for (int i = 1; i < stalls.Length && placed < c; i++) {\n            if (stalls[i] - last >= d) {\n                placed++;\n                last = stalls[i];\n            }\n        }\n        return placed >= c;\n    }\n    public int AggressiveCows(int[] stalls, int k) {\n        System.Array.Sort(stalls);\n        int lo = 1, hi = stalls[stalls.Length - 1] - stalls[0], ans = 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            if (CanPlace(stalls, k, mid)) {\n                ans = mid;\n                lo = mid + 1;\n            } else hi = mid - 1;\n        }\n        return ans;\n    }\n}"
      } }
  ] },
  "a2z-123": { approaches: [
    { id: "bs-max-pages", title: "Binary search the maximum pages per student", level: "Optimal", time: "O(n log sum)", space: "O(1)",
      explanation: "Assign books in order to at most m students without any student exceeding the cap; the cap is monotone, so binary search the smallest feasible cap.",
      code: {
        java: "class Solution {\n    int findPages(int[] a, int n, int m) {\n        if (m > n) return -1;\n        int lo = 0, hi = 0;\n        for (int v : a) { lo = Math.max(lo, v); hi += v; }\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2, students = 1, load = 0;\n            for (int v : a) {\n                if (load + v > mid) {\n                    students++;\n                    load = 0;\n                }\n                load += v;\n            }\n            if (students <= m) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}",
        csharp: "public class Solution {\n    public int FindPages(int[] a, int n, int m) {\n        if (m > n) return -1;\n        int lo = 0, hi = 0;\n        foreach (int v in a) { lo = Math.Max(lo, v); hi += v; }\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2, students = 1, load = 0;\n            foreach (int v in a) {\n                if (load + v > mid) {\n                    students++;\n                    load = 0;\n                }\n                load += v;\n            }\n            if (students <= m) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}"
      } }
  ] },
  "a2z-124": { approaches: [
    { id: "bs-largest-sum", title: "Binary search the largest subarray sum", level: "Optimal", time: "O(n log sum)", space: "O(1)",
      explanation: "Same monotone split as book allocation: greedy count of subarrays with sum <= cap; find the smallest cap allowing k subarrays.",
      code: {
        java: "class Solution {\n    int splitArray(int[] a, int k) {\n        int n = a.length;\n        long lo = 0, hi = 0;\n        for (int v : a) { lo = Math.max(lo, v); hi += v; }\n        while (lo < hi) {\n            long mid = lo + (hi - lo) / 2, sum = 0;\n            int parts = 1;\n            for (int v : a) {\n                if (sum + v > mid) {\n                    parts++;\n                    sum = 0;\n                }\n                sum += v;\n            }\n            if (parts <= k) hi = mid;\n            else lo = mid + 1;\n        }\n        return (int) lo;\n    }\n}",
        csharp: "public class Solution {\n    public int SplitArray(int[] a, int k) {\n        long lo = 0, hi = 0;\n        foreach (int v in a) { lo = Math.Max(lo, v); hi += v; }\n        while (lo < hi) {\n            long mid = lo + (hi - lo) / 2, sum = 0;\n            int parts = 1;\n            foreach (int v in a) {\n                if (sum + v > mid) {\n                    parts++;\n                    sum = 0;\n                }\n                sum += v;\n            }\n            if (parts <= k) hi = mid;\n            else lo = mid + 1;\n        }\n        return (int) lo;\n    }\n}"
      } }
  ] },
  "a2z-125": { approaches: [
    { id: "bs-max-board", title: "Binary search the maximum board units per painter", level: "Optimal", time: "O(n log sum)", space: "O(1)",
      explanation: "Painter's partition is identical to book allocation: binary search the smallest per-painter cap that lets k painters finish all boards in order.",
      code: {
        java: "class Solution {\n    int minTime(int[] boards, int k) {\n        long lo = 0, hi = 0;\n        for (int v : boards) { lo = Math.max(lo, v); hi += v; }\n        while (lo < hi) {\n            long mid = lo + (hi - lo) / 2, time = 0;\n            int painters = 1;\n            for (int v : boards) {\n                if (time + v > mid) {\n                    painters++;\n                    time = 0;\n                }\n                time += v;\n            }\n            if (painters <= k) hi = mid;\n            else lo = mid + 1;\n        }\n        return (int) lo;\n    }\n}",
        csharp: "public class Solution {\n    public int MinTime(int[] boards, int k) {\n        long lo = 0, hi = 0;\n        foreach (int v in boards) { lo = Math.Max(lo, v); hi += v; }\n        while (lo < hi) {\n            long mid = lo + (hi - lo) / 2, time = 0;\n            int painters = 1;\n            foreach (int v in boards) {\n                if (time + v > mid) {\n                    painters++;\n                    time = 0;\n                }\n                time += v;\n            }\n            if (painters <= k) hi = mid;\n            else lo = mid + 1;\n        }\n        return (int) lo;\n    }\n}"
      } }
  ] },
  "a2z-126": { approaches: [
    { id: "bs-additional-stations", title: "Binary search the real max distance", level: "Optimal", time: "O(n log(range/eps))", space: "O(1)",
      explanation: "For a real candidate d, a gap needs ceil(gap/d)-1 extra stations. Binary search d on [0, maxGap] to 1e-6 and take the smallest feasible d.",
      code: {
        java: "class Solution {\n    double minMaxDistance(int[] stations, int k) {\n        int n = stations.length;\n        double lo = 0, hi = 0;\n        for (int i = 0; i < n - 1; i++) hi = Math.max(hi, stations[i + 1] - stations[i]);\n        while (hi - lo > 1e-6) {\n            double mid = (lo + hi) / 2;\n            int used = 0;\n            for (int i = 0; i < n - 1; i++)\n                used += (int) Math.ceil((stations[i + 1] - stations[i]) / mid) - 1;\n            if (used > k) lo = mid; else hi = mid;\n        }\n        return hi;\n    }\n}",
        csharp: "public class Solution {\n    public double MinMaxDistance(int[] stations, int k) {\n        int n = stations.Length;\n        double lo = 0, hi = 0;\n        for (int i = 0; i < n - 1; i++) hi = Math.Max(hi, stations[i + 1] - stations[i]);\n        while (hi - lo > 1e-6) {\n            double mid = (lo + hi) / 2;\n            int used = 0;\n            for (int i = 0; i < n - 1; i++)\n                used += (int) Math.Ceiling((stations[i + 1] - stations[i]) / mid) - 1;\n            if (used > k) lo = mid; else hi = mid;\n        }\n        return hi;\n    }\n}"
      } }
  ] },
  "a2z-127": { approaches: [
    { id: "merge-count", title: "Merge counting to the median index", level: "Brute", time: "O(m + n)", space: "O(1)",
      explanation: "Two-pointer merge until reaching the middle index; keeps both halves of the merged order without building the array.",
      code: {
        java: "class Solution {\n    double findMedianSortedArrays(int[] a, int[] b) {\n        int m = a.length, n = b.length, total = m + n;\n        int i = 0, j = 0, last = 0, secondLast = 0;\n        for (int k = 0; k <= total / 2; k++) {\n            last = secondLast;\n            if (i < m && (j >= n || a[i] <= b[j])) secondLast = a[i++];\n            else secondLast = b[j++];\n        }\n        if (total % 2 == 1) return secondLast;\n        return (last + secondLast) / 2.0;\n    }\n}",
        csharp: "public class Solution {\n    public double FindMedianSortedArrays(int[] a, int[] b) {\n        int m = a.Length, n = b.Length, total = m + n;\n        int i = 0, j = 0, last = 0, secondLast = 0;\n        for (int k = 0; k <= total / 2; k++) {\n            last = secondLast;\n            if (i < m && (j >= n || a[i] <= b[j])) secondLast = a[i++];\n            else secondLast = b[j++];\n        }\n        if (total % 2 == 1) return secondLast;\n        return (last + secondLast) / 2.0;\n    }\n}"
      } },
    { id: "partition-bs", title: "Binary search the partition", level: "Optimal", time: "O(log min(m,n))", space: "O(1)",
      explanation: "Cut the smaller array at i and derive j so the left half has the right size; binary search i until maxLeft <= minRight across both arrays.",
      code: {
        java: "class Solution {\n    double findMedianSortedArrays(int[] a, int[] b) {\n        if (a.length > b.length) return findMedianSortedArrays(b, a);\n        int m = a.length, n = b.length, lo = 0, hi = m;\n        while (lo <= hi) {\n            int i = (lo + hi) / 2, j = (m + n + 1) / 2 - i;\n            int aL = i == 0 ? Integer.MIN_VALUE : a[i - 1];\n            int aR = i == m ? Integer.MAX_VALUE : a[i];\n            int bL = j == 0 ? Integer.MIN_VALUE : b[j - 1];\n            int bR = j == n ? Integer.MAX_VALUE : b[j];\n            if (aL <= bR && bL <= aR) {\n                if ((m + n) % 2 == 1) return Math.max(aL, bL);\n                return (Math.max(aL, bL) + Math.min(aR, bR)) / 2.0;\n            } else if (aL > bR) hi = i - 1;\n            else lo = i + 1;\n        }\n        return 0;\n    }\n}",
        csharp: "public class Solution {\n    public double FindMedianSortedArrays(int[] a, int[] b) {\n        if (a.Length > b.Length) return FindMedianSortedArrays(b, a);\n        int m = a.Length, n = b.Length, lo = 0, hi = m;\n        while (lo <= hi) {\n            int i = (lo + hi) / 2, j = (m + n + 1) / 2 - i;\n            int aL = i == 0 ? int.MinValue : a[i - 1];\n            int aR = i == m ? int.MaxValue : a[i];\n            int bL = j == 0 ? int.MinValue : b[j - 1];\n            int bR = j == n ? int.MaxValue : b[j];\n            if (aL <= bR && bL <= aR) {\n                if ((m + n) % 2 == 1) return Math.Max(aL, bL);\n                return (Math.Max(aL, bL) + Math.Min(aR, bR)) / 2.0;\n            } else if (aL > bR) hi = i - 1;\n            else lo = i + 1;\n        }\n        return 0;\n    }\n}"
      } }
  ] },
  "a2z-128": { approaches: [
    { id: "merge-k", title: "Merge to the k-th element", level: "Brute", time: "O(k)", space: "O(1)",
      explanation: "Two-pointer merge, consuming the smaller head until k elements have been emitted.",
      code: {
        java: "class Solution {\n    int kthElement(int[] a, int[] b, int k) {\n        int m = a.length, n = b.length, i = 0, j = 0, val = 0;\n        for (int c = 0; c < k; c++) {\n            if (i < m && (j >= n || a[i] <= b[j])) val = a[i++];\n            else val = b[j++];\n        }\n        return val;\n    }\n}",
        csharp: "public class Solution {\n    public int KthElement(int[] a, int[] b, int k) {\n        int m = a.Length, n = b.Length, i = 0, j = 0, val = 0;\n        for (int c = 0; c < k; c++) {\n            if (i < m && (j >= n || a[i] <= b[j])) val = a[i++];\n            else val = b[j++];\n        }\n        return val;\n    }\n}"
      } },
    { id: "eliminate-halves", title: "Discard k/2 elements each round", level: "Optimal", time: "O(log k)", space: "O(1)",
      explanation: "Compare the k/2-th remaining element of each array and discard the smaller block, since it cannot contain the k-th element.",
      code: {
        java: "class Solution {\n    int kthElement(int[] a, int[] b, int k) {\n        return kth(a, 0, b, 0, k);\n    }\n    int kth(int[] a, int i, int[] b, int j, int k) {\n        if (i >= a.length) return b[j + k - 1];\n        if (j >= b.length) return a[i + k - 1];\n        if (k == 1) return Math.min(a[i], b[j]);\n        int ni = Math.min(a.length, i + k / 2) - 1;\n        int nj = Math.min(b.length, j + k / 2) - 1;\n        if (a[ni] <= b[nj]) return kth(a, ni + 1, b, j, k - (ni + 1 - i));\n        else return kth(a, i, b, nj + 1, k - (nj + 1 - j));\n    }\n}",
        csharp: "public class Solution {\n    public int KthElement(int[] a, int[] b, int k) {\n        return Kth(a, 0, b, 0, k);\n    }\n    int Kth(int[] a, int i, int[] b, int j, int k) {\n        if (i >= a.Length) return b[j + k - 1];\n        if (j >= b.Length) return a[i + k - 1];\n        if (k == 1) return Math.Min(a[i], b[j]);\n        int ni = Math.Min(a.Length, i + k / 2) - 1;\n        int nj = Math.Min(b.Length, j + k / 2) - 1;\n        if (a[ni] <= b[nj]) return Kth(a, ni + 1, b, j, k - (ni + 1 - i));\n        else return Kth(a, i, b, nj + 1, k - (nj + 1 - j));\n    }\n}"
      } }
  ] },
  "a2z-129": { approaches: [
    { id: "per-row-lb", title: "Lower bound of 1 in each row", level: "Optimal", time: "O(m log n)", space: "O(1)",
      explanation: "Rows are sorted with 1s first, so the count of 1s is n - lowerBound(1). Track the row with the maximum.",
      code: {
        java: "class Solution {\n    int rowWithMax1s(int[][] m) {\n        int cols = m[0].length, best = -1, maxOnes = 0;\n        for (int r = 0; r < m.length; r++) {\n            int lo = 0, hi = cols;\n            while (lo < hi) {\n                int mid = lo + (hi - lo) / 2;\n                if (m[r][mid] >= 1) hi = mid; else lo = mid + 1;\n            }\n            int ones = cols - lo;\n            if (ones > maxOnes) {\n                maxOnes = ones;\n                best = r;\n            }\n        }\n        return best;\n    }\n}",
        csharp: "public class Solution {\n    public int RowWithMax1s(int[][] m) {\n        int cols = m[0].Length, best = -1, maxOnes = 0;\n        for (int r = 0; r < m.Length; r++) {\n            int lo = 0, hi = cols;\n            while (lo < hi) {\n                int mid = lo + (hi - lo) / 2;\n                if (m[r][mid] >= 1) hi = mid; else lo = mid + 1;\n            }\n            int ones = cols - lo;\n            if (ones > maxOnes) {\n                maxOnes = ones;\n                best = r;\n            }\n        }\n        return best;\n    }\n}"
      } }
  ] },
  "a2z-130": { approaches: [
    { id: "flatten-bs", title: "Binary search over the flattened index", level: "Optimal", time: "O(log(mn))", space: "O(1)",
      explanation: "Treat the matrix as one sorted array of length m*n; map a virtual mid back to (mid/n, mid%n).",
      code: {
        java: "class Solution {\n    boolean searchMatrix(int[][] m, int target) {\n        int rows = m.length, cols = m[0].length, lo = 0, hi = rows * cols - 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            int v = m[mid / cols][mid % cols];\n            if (v == target) return true;\n            if (v < target) lo = mid + 1;\n            else hi = mid - 1;\n        }\n        return false;\n    }\n}",
        csharp: "public class Solution {\n    public bool SearchMatrix(int[][] m, int target) {\n        int rows = m.Length, cols = m[0].Length, lo = 0, hi = rows * cols - 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            int v = m[mid / cols, mid % cols];\n            if (v == target) return true;\n            if (v < target) lo = mid + 1;\n            else hi = mid - 1;\n        }\n        return false;\n    }\n}"
      } }
  ] },
  "a2z-131": { approaches: [
    { id: "staircase", title: "Staircase walk from top-right", level: "Optimal", time: "O(m + n)", space: "O(1)",
      explanation: "Rows and columns ascend. Start top-right: move left if the value is too big, down if too small — each step eliminates a row or column.",
      code: {
        java: "class Solution {\n    boolean searchMatrix(int[][] m, int target) {\n        int r = 0, c = m[0].length - 1;\n        while (r < m.length && c >= 0) {\n            if (m[r][c] == target) return true;\n            if (m[r][c] > target) c--;\n            else r++;\n        }\n        return false;\n    }\n}",
        csharp: "public class Solution {\n    public bool SearchMatrix(int[][] m, int target) {\n        int r = 0, c = m[0].Length - 1;\n        while (r < m.Length && c >= 0) {\n            if (m[r, c] == target) return true;\n            if (m[r, c] > target) c--;\n            else r++;\n        }\n        return false;\n    }\n}"
      } }
  ] },
  "a2z-132": { approaches: [
    { id: "col-bs", title: "Binary search on columns with row scan", level: "Optimal", time: "O(m log n)", space: "O(1)",
      explanation: "Pick the middle column, take its row-maximum; if that cell beats its horizontal neighbours it is a peak, else recurse toward the larger side.",
      code: {
        java: "class Solution {\n    int[] findPeakGrid(int[][] m) {\n        int rows = m.length, lo = 0, hi = m[0].length - 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            int bestRow = 0;\n            for (int r = 0; r < rows; r++)\n                if (m[r][mid] > m[bestRow][mid]) bestRow = r;\n            int left = mid > 0 ? m[bestRow][mid - 1] : -1;\n            int right = mid < m[0].length - 1 ? m[bestRow][mid + 1] : -1;\n            if (m[bestRow][mid] >= left && m[bestRow][mid] >= right)\n                return new int[] { bestRow, mid };\n            if (m[bestRow][mid] < right) lo = mid + 1;\n            else hi = mid - 1;\n        }\n        return new int[] { -1, -1 };\n    }\n}",
        csharp: "public class Solution {\n    public int[] FindPeakGrid(int[][] m) {\n        int rows = m.Length, lo = 0, hi = m[0].Length - 1;\n        while (lo <= hi) {\n            int mid = lo + (hi - lo) / 2;\n            int bestRow = 0;\n            for (int r = 0; r < rows; r++)\n                if (m[r, mid] > m[bestRow, mid]) bestRow = r;\n            int left = mid > 0 ? m[bestRow, mid - 1] : -1;\n            int right = mid < m[0].Length - 1 ? m[bestRow, mid + 1] : -1;\n            if (m[bestRow, mid] >= left && m[bestRow, mid] >= right)\n                return new int[] { bestRow, mid };\n            if (m[bestRow, mid] < right) lo = mid + 1;\n            else hi = mid - 1;\n        }\n        return new int[] { -1, -1 };\n    }\n}"
      } }
  ] },
  "a2z-133": { approaches: [
    { id: "value-bs-count", title: "Binary search the value by count <= mid", level: "Optimal", time: "O(m log n log V)", space: "O(1)",
      explanation: "Rows are sorted, so count elements <= a candidate value via upper bound per row. The median is the smallest value with count >= (m*n+1)/2.",
      code: {
        java: "class Solution {\n    int matrixMedian(int[][] m) {\n        int rows = m.length, cols = m[0].length, need = (rows * cols + 1) / 2;\n        int lo = 1, hi = 1000000000;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2, count = 0;\n            for (int r = 0; r < rows; r++) {\n                int l = 0, h = cols;\n                while (l < h) {\n                    int b = l + (h - l) / 2;\n                    if (m[r][b] <= mid) l = b + 1; else h = b;\n                }\n                count += l;\n            }\n            if (count >= need) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}",
        csharp: "public class Solution {\n    public int MatrixMedian(int[][] m) {\n        int rows = m.Length, cols = m[0].Length, need = (rows * cols + 1) / 2;\n        int lo = 1, hi = 1000000000;\n        while (lo < hi) {\n            int mid = lo + (hi - lo) / 2, count = 0;\n            for (int r = 0; r < rows; r++) {\n                int l = 0, h = cols;\n                while (l < h) {\n                    int b = l + (h - l) / 2;\n                    if (m[r, b] <= mid) l = b + 1; else h = b;\n                }\n                count += l;\n            }\n            if (count >= need) hi = mid;\n            else lo = mid + 1;\n        }\n        return lo;\n    }\n}"
      } }
  ] }
};
