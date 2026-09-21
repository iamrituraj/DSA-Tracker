export default {
  "a2z-253": { approaches: [
    { id: "window-set", title: "Sliding window with last-seen map", level: "Optimal", time: "O(n)", space: "O(min(n,charset))",
      explanation: "Expand right; if a duplicate is found, jump left past its previous occurrence. Track max window size.",
      code: {
        java: "class Solution {\n    int lengthOfLongestSubstring(String s) {\n        java.util.Map<Character, Integer> last = new java.util.HashMap<>();\n        int best = 0, l = 0;\n        for (int r = 0; r < s.length(); r++) {\n            char c = s.charAt(r);\n            if (last.containsKey(c) && last.get(c) >= l) l = last.get(c) + 1;\n            last.put(c, r);\n            best = Math.max(best, r - l + 1);\n        }\n        return best;\n    }\n}",
        csharp: "public class Solution {\n    public int LengthOfLongestSubstring(string s) {\n        var last = new Dictionary<char, int>();\n        int best = 0, l = 0;\n        for (int r = 0; r < s.Length; r++) {\n            char c = s[r];\n            if (last.ContainsKey(c) && last[c] >= l) l = last[c] + 1;\n            last[c] = r;\n            best = System.Math.Max(best, r - l + 1);\n        }\n        return best;\n    }\n}"
      } }
  ] },
  "a2z-254": { approaches: [
    { id: "flip-k-zeros", title: "Window with at most K zeros", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Expand right; count zeros in window. Shrink left when zeros exceed K. Max window length is the answer.",
      code: {
        java: "class Solution {\n    int longestOnes(int[] nums, int k) {\n        int l = 0, zeros = 0, best = 0;\n        for (int r = 0; r < nums.length; r++) {\n            if (nums[r] == 0) zeros++;\n            while (zeros > k) { if (nums[l] == 0) zeros--; l++; }\n            best = Math.max(best, r - l + 1);\n        }\n        return best;\n    }\n}",
        csharp: "public class Solution {\n    public int LongestOnes(int[] nums, int k) {\n        int l = 0, zeros = 0, best = 0;\n        for (int r = 0; r < nums.Length; r++) {\n            if (nums[r] == 0) zeros++;\n            while (zeros > k) { if (nums[l] == 0) zeros--; l++; }\n            best = System.Math.Max(best, r - l + 1);\n        }\n        return best;\n    }\n}"
      } }
  ] },
  "a2z-255": { approaches: [
    { id: "at-most-2-types", title: "Window with at most 2 fruit types", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Standard at-most-K-distinct sliding window with a frequency map; shrink when types exceed 2.",
      code: {
        java: "class Solution {\n    int totalFruit(int[] fruits) {\n        java.util.Map<Integer, Integer> freq = new java.util.HashMap<>();\n        int l = 0, best = 0;\n        for (int r = 0; r < fruits.length; r++) {\n            freq.merge(fruits[r], 1, Integer::sum);\n            while (freq.size() > 2) {\n                int f = freq.get(fruits[l]);\n                if (f == 1) freq.remove(fruits[l]); else freq.put(fruits[l], f - 1);\n                l++;\n            }\n            best = Math.max(best, r - l + 1);\n        }\n        return best;\n    }\n}",
        csharp: "public class Solution {\n    public int TotalFruit(int[] fruits) {\n        var freq = new Dictionary<int, int>();\n        int l = 0, best = 0;\n        for (int r = 0; r < fruits.Length; r++) {\n            if (!freq.TryAdd(fruits[r], 1)) freq[fruits[r]]++;\n            while (freq.Count > 2) {\n                freq[fruits[l]]--;\n                if (freq[fruits[l]] == 0) freq.Remove(fruits[l]);\n                l++;\n            }\n            best = System.Math.Max(best, r - l + 1);\n        }\n        return best;\n    }\n}"
      } }
  ] },
  "a2z-256": { approaches: [
    { id: "max-freq-window", title: "Window sized by dominant char", level: "Optimal", time: "O(26n)", space: "O(1)",
      explanation: "Track max frequency in window; valid if windowLen - maxFreq <= k (replacements needed). Shrink left when invalid.",
      code: {
        java: "class Solution {\n    int characterReplacement(String s, int k) {\n        int[] cnt = new int[26];\n        int l = 0, maxF = 0, best = 0;\n        for (int r = 0; r < s.length(); r++) {\n            cnt[s.charAt(r) - 'A']++;\n            maxF = Math.max(maxF, cnt[s.charAt(r) - 'A']);\n            while (r - l + 1 - maxF > k) { cnt[s.charAt(l) - 'A']--; l++; }\n            best = Math.max(best, r - l + 1);\n        }\n        return best;\n    }\n}",
        csharp: "public class Solution {\n    public int CharacterReplacement(string s, int k) {\n        int[] cnt = new int[26];\n        int l = 0, maxF = 0, best = 0;\n        for (int r = 0; r < s.Length; r++) {\n            cnt[s[r] - 'A']++;\n            maxF = System.Math.Max(maxF, cnt[s[r] - 'A']);\n            while (r - l + 1 - maxF > k) { cnt[s[l] - 'A']--; l++; }\n            best = System.Math.Max(best, r - l + 1);\n        }\n        return best;\n    }\n}"
      } }
  ] },
  "a2z-257": { approaches: [
    { id: "prefix-count", title: "Prefix-sum count of subarrays equal to goal", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Count prefixes with sum (total-goal); at each index the number of valid subarrays ending here equals how many earlier prefixes had that sum.",
      code: {
        java: "class Solution {\n    int numSubarraysWithSum(int[] nums, int goal) {\n        int res = 0, prefix = 0;\n        java.util.Map<Integer, Integer> cnt = new java.util.HashMap<>();\n        cnt.put(0, 1);\n        for (int x : nums) {\n            prefix += x;\n            res += cnt.getOrDefault(prefix - goal, 0);\n            cnt.merge(prefix, 1, Integer::sum);\n        }\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public int NumSubarraysWithSum(int[] nums, int goal) {\n        int res = 0, prefix = 0;\n        var cnt = new Dictionary<int, int> { { 0, 1 } };\n        foreach (int x in nums) {\n            prefix += x;\n            if (cnt.TryGetValue(prefix - goal, out int v)) res += v;\n            if (!cnt.TryAdd(prefix, 1)) cnt[prefix]++;\n        }\n        return res;\n    }\n}"
      } }
  ] },
  "a2z-258": { approaches: [
    { id: "bitwise-disjoint-window", title: "Sliding window with bitwise AND", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Maintain a window where all elements are bitwise disjoint (used | nums[r] has no overlap); XOR out left elements until clear.",
      code: {
        java: "class Solution {\n    int longestNiceSubarray(int[] nums) {\n        int best = 0, l = 0, used = 0;\n        for (int r = 0; r < nums.length; r++) {\n            while ((used & nums[r]) != 0) { used ^= nums[l]; l++; }\n            used |= nums[r];\n            best = Math.max(best, r - l + 1);\n        }\n        return best;\n    }\n}",
        csharp: "public class Solution {\n    public int LongestNiceSubarray(int[] nums) {\n        int best = 0, l = 0, used = 0;\n        for (int r = 0; r < nums.Length; r++) {\n            while ((used & nums[r]) != 0) { used ^= nums[l]; l++; }\n            used |= nums[r];\n            best = System.Math.Max(best, r - l + 1);\n        }\n        return best;\n    }\n}"
      } }
  ] },
  "a2z-259": { approaches: [
    { id: "count-abc-window", title: "Complement counting with window", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Count substrings NOT containing all three; subtract from total. Or: last positions of a,b,c; add min(lastA,lastB,lastC)+1 at each step.",
      code: {
        java: "class Solution {\n    int numSubstringsWithAllThree(String s) {\n        int res = 0, a = -1, b = -1, c = -1;\n        for (int i = 0; i < s.length(); i++) {\n            if (s.charAt(i) == 'a') a = i;\n            else if (s.charAt(i) == 'b') b = i;\n            else if (s.charAt(i) == 'c') c = i;\n            res += Math.min(a, Math.min(b, c)) + 1;\n        }\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public int NumSubstringsWithAllThree(string s) {\n        int res = 0, a = -1, b = -1, c = -1;\n        for (int i = 0; i < s.Length; i++) {\n            if (s[i] == 'a') a = i;\n            else if (s[i] == 'b') b = i;\n            else if (s[i] == 'c') c = i;\n            res += System.Math.Min(a, System.Math.Min(b, c)) + 1;\n        }\n        return res;\n    }\n}"
      } }
  ] },
  "a2z-260": { approaches: [
    { id: "fixed-window-sum", title: "Minimize window excluded from middle", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Equivalently, find the minimum-sum subarray of length n-k in the circular array; answer = total - minWindow.",
      code: {
        java: "class Solution {\n    int maxScore(int[] cardPoints, int k) {\n        int n = cardPoints.length, total = 0;\n        for (int x : cardPoints) total += x;\n        int win = n - k, curSum = 0, minSum = 0;\n        for (int i = 0; i < win; i++) curSum += cardPoints[i];\n        minSum = curSum;\n        for (int i = win; i < n; i++) {\n            curSum += cardPoints[i] - cardPoints[i - win];\n            minSum = Math.min(minSum, curSum);\n        }\n        return total - minSum;\n    }\n}",
        csharp: "public class Solution {\n    public int MaxScore(int[] cardPoints, int k) {\n        int n = cardPoints.Length, total = 0;\n        foreach (int x in cardPoints) total += x;\n        int win = n - k, curSum = 0;\n        for (int i = 0; i < win; i++) curSum += cardPoints[i];\n        int minSum = curSum;\n        for (int i = win; i < n; i++) {\n            curSum += cardPoints[i] - cardPoints[i - win];\n            minSum = System.Math.Min(minSum, curSum);\n        }\n        return total - minSum;\n    }\n}"
      } }
  ] },
  "a2z-261": { approaches: [
    { id: "at-most-k-distinct", title: "Window with at most K distinct", level: "Optimal", time: "O(n)", space: "O(K)",
      explanation: "Expand right; maintain a frequency map. Shrink left while distinct count exceeds K. Track max window.",
      code: {
        java: "class Solution {\n    int longestKDistinct(String s, int k) {\n        java.util.Map<Character, Integer> freq = new java.util.HashMap<>();\n        int l = 0, best = 0;\n        for (int r = 0; r < s.length(); r++) {\n            freq.merge(s.charAt(r), 1, Integer::sum);\n            while (freq.size() > k) {\n                char c = s.charAt(l++);\n                int f = freq.get(c);\n                if (f == 1) freq.remove(c); else freq.put(c, f - 1);\n            }\n            best = Math.max(best, r - l + 1);\n        }\n        return best;\n    }\n}",
        csharp: "public class Solution {\n    public int LongestKDistinct(string s, int k) {\n        var freq = new Dictionary<char, int>();\n        int l = 0, best = 0;\n        for (int r = 0; r < s.Length; r++) {\n            if (!freq.TryAdd(s[r], 1)) freq[s[r]]++;\n            while (freq.Count > k) {\n                char c = s[l++];\n                freq[c]--;\n                if (freq[c] == 0) freq.Remove(c);\n            }\n            best = System.Math.Max(best, r - l + 1);\n        }\n        return best;\n    }\n}"
      } }
  ] },
  "a2z-262": { approaches: [
    { id: "atmost-diff", title: "atMost(K) - atMost(K-1) distinct", level: "Optimal", time: "O(n)", space: "O(K)",
      explanation: "Exactly K distinct = atMost(K) minus atMost(K-1); both computed via the standard sliding window.",
      code: {
        java: "class Solution {\n    int subarraysWithKDistinct(int[] a, int k) {\n        return atMost(a, k) - atMost(a, k - 1);\n    }\n    int atMost(int[] a, int k) {\n        java.util.Map<Integer, Integer> freq = new java.util.HashMap<>();\n        int l = 0, res = 0;\n        for (int r = 0; r < a.length; r++) {\n            freq.merge(a[r], 1, Integer::sum);\n            while (freq.size() > k) {\n                int f = freq.get(a[l]);\n                if (f == 1) freq.remove(a[l]); else freq.put(a[l], f - 1);\n                l++;\n            }\n            res += r - l + 1;\n        }\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public int SubarraysWithKDistinct(int[] a, int k) => AtMost(a, k) - AtMost(a, k - 1);\n    int AtMost(int[] a, int k) {\n        var freq = new Dictionary<int, int>();\n        int l = 0, res = 0;\n        for (int r = 0; r < a.Length; r++) {\n            if (!freq.TryAdd(a[r], 1)) freq[a[r]]++;\n            while (freq.Count > k) {\n                freq[a[l]]--;\n                if (freq[a[l]] == 0) freq.Remove(a[l]);\n                l++;\n            }\n            res += r - l + 1;\n        }\n        return res;\n    }\n}"
      } }
  ] },
  "a2z-263": { approaches: [
    { id: "need-have-window", title: "Two-pointer with need/have maps", level: "Optimal", time: "O(n)", space: "O(K)",
      explanation: "Expand right until all chars of t are satisfied, then contract left while still valid. Track minimum-length window.",
      code: {
        java: "class Solution {\n    String minWindow(String s, String t) {\n        if (t.length() > s.length()) return \"\";\n        int[] need = new int[128], have = new int[128];\n        for (char c : t.toCharArray()) need[c]++;\n        int needCnt = t.length(), formed = 0, l = 0, bestL = 0, bestLen = Integer.MAX_VALUE;\n        for (int r = 0; r < s.length(); r++) {\n            char c = s.charAt(r);\n            have[c]++;\n            if (need[c] > 0 && have[c] <= need[c]) formed++;\n            while (formed == needCnt) {\n                if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestL = l; }\n                char lc = s.charAt(l++);\n                have[lc]--;\n                if (need[lc] > 0 && have[lc] < need[lc]) formed--;\n            }\n        }\n        return bestLen == Integer.MAX_VALUE ? \"\" : s.substring(bestL, bestL + bestLen);\n    }\n}",
        csharp: "public class Solution {\n    public string MinWindow(string s, string t) {\n        if (t.Length > s.Length) return \"\";\n        int[] need = new int[128], have = new int[128];\n        foreach (char c in t) need[c]++;\n        int needCnt = t.Length, formed = 0, l = 0, bestL = 0, bestLen = int.MaxValue;\n        for (int r = 0; r < s.Length; r++) {\n            char c = s[r]; have[c]++;\n            if (need[c] > 0 && have[c] <= need[c]) formed++;\n            while (formed == needCnt) {\n                if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestL = l; }\n                char lc = s[l++]; have[lc]--;\n                if (need[lc] > 0 && have[lc] < need[lc]) formed--;\n            }\n        }\n        return bestLen == int.MaxValue ? \"\" : s.Substring(bestL, bestLen);\n    }\n}"
      } }
  ] },
  "a2z-264": { approaches: [
    { id: "window-subseq", title: "Forward-backward window for subsequence", level: "Optimal", time: "O(n*m)", space: "O(1)",
      explanation: "Find a forward match of t in s, then walk backward to shrink; record the minimum-length window and repeat.",
      code: {
        java: "class Solution {\n    String minWindow(String s, String t) {\n        int m = t.length(), n = s.length();\n        int best = Integer.MAX_VALUE, start = 0;\n        int j = 0;\n        for (int i = 0; i < n; i++) {\n            if (s.charAt(i) == t.charAt(j)) j++;\n            if (j == m) {\n                int end = i + 1;\n                j--;\n                while (j >= 0) { i--; if (s.charAt(i) == t.charAt(j)) j--; }\n                i++; j++;\n                if (end - i < best) { best = end - i; start = i; }\n            }\n        }\n        return best == Integer.MAX_VALUE ? \"\" : s.substring(start, start + best);\n    }\n}",
        csharp: "public class Solution {\n    public string MinWindowSubseq(string s, string t) {\n        int m = t.Length, n = s.Length;\n        int best = int.MaxValue, start = 0;\n        int j = 0;\n        for (int i = 0; i < n; i++) {\n            if (s[i] == t[j]) j++;\n            if (j == m) {\n                int end = i + 1;\n                j--;\n                while (j >= 0) { i--; if (s[i] == t[j]) j--; }\n                i++; j++;\n                if (end - i < best) { best = end - i; start = i; }\n            }\n        }\n        return best == int.MaxValue ? \"\" : s.Substring(start, best);\n    }\n}"
      } }
  ] }
};
