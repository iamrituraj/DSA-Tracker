export default {
  "a2z-134": { approaches: [
    { id: "balance-count", title: "Track primitive groups by depth", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Maintain a balance counter; a '(' at balance 0 opens a primitive. Emit only parens that sit at depth >= 1, then strip the outer pair of each primitive.",
      code: {
        java: "class Solution {\n    String removeOuterParentheses(String s) {\n        StringBuilder sb = new StringBuilder();\n        int bal = 0;\n        for (char c : s.toCharArray()) {\n            if (c == ')') bal--;\n            if (bal > 0) sb.append(c);\n            if (c == '(') bal++;\n        }\n        return sb.toString();\n    }\n}",
        csharp: "public class Solution {\n    public string RemoveOuterParentheses(string s) {\n        StringBuilder sb = new StringBuilder();\n        int bal = 0;\n        foreach (char c in s) {\n            if (c == ')') bal--;\n            if (bal > 0) sb.Append(c);\n            if (c == '(') bal++;\n        }\n        return sb.ToString();\n    }\n}"
      } }
  ] },
  "a2z-135": { approaches: [
    { id: "split-trim", title: "Reverse the list of words", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Split on runs of spaces into words, then join them back in reverse order with single spaces.",
      code: {
        java: "class Solution {\n    String reverseWords(String s) {\n        String[] w = s.trim().split(\"\\\\s+\");\n        StringBuilder sb = new StringBuilder();\n        for (int i = w.length - 1; i >= 0; i--) {\n            sb.append(w[i]);\n            if (i > 0) sb.append(' ');\n        }\n        return sb.toString();\n    }\n}",
        csharp: "public class Solution {\n    public string ReverseWords(string s) {\n        string[] w = s.Trim().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);\n        Array.Reverse(w);\n        return string.Join(\" \", w);\n    }\n}"
      } },
    { id: "palindrome-two-pointer", title: "Palindrome check — two pointers", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Compare characters from both ends moving inward; a mismatch means it is not a palindrome.",
      code: {
        java: "class Solution {\n    boolean isPalindrome(String s) {\n        int i = 0, j = s.length() - 1;\n        while (i < j) {\n            if (s.charAt(i++) != s.charAt(j--)) return false;\n        }\n        return true;\n    }\n}",
        csharp: "public class Solution {\n    public bool IsPalindrome(string s) {\n        int i = 0, j = s.Length - 1;\n        while (i < j) {\n            if (s[i++] != s[j--]) return false;\n        }\n        return true;\n    }\n}"
      } }
  ] },
  "a2z-136": { approaches: [
    { id: "scan-odd-right", title: "Rightmost odd digit ends the answer", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "A number is odd iff its last digit is odd. Find the rightmost odd digit; the prefix up to and including it is the largest odd substring.",
      code: {
        java: "class Solution {\n    String largestOddNumber(String num) {\n        for (int i = num.length() - 1; i >= 0; i--) {\n            if ((num.charAt(i) - '0') % 2 == 1)\n                return num.substring(0, i + 1);\n        }\n        return \"\";\n    }\n}",
        csharp: "public class Solution {\n    public string LargestOddNumber(string num) {\n        for (int i = num.Length - 1; i >= 0; i--) {\n            if ((num[i] - '0') % 2 == 1)\n                return num.Substring(0, i + 1);\n        }\n        return \"\";\n    }\n}"
      } }
  ] },
  "a2z-137": { approaches: [
    { id: "char-by-char", title: "Compare column by column", level: "Optimal", time: "O(S)", space: "O(1)",
      explanation: "Walk index by index, comparing every string's character at that position to the first string's; stop at the first mismatch or shortest end.",
      code: {
        java: "class Solution {\n    String longestCommonPrefix(String[] strs) {\n        if (strs.length == 0) return \"\";\n        for (int i = 0; i < strs[0].length(); i++) {\n            char c = strs[0].charAt(i);\n            for (int j = 1; j < strs.length; j++) {\n                if (i == strs[j].length() || strs[j].charAt(i) != c)\n                    return strs[0].substring(0, i);\n            }\n        }\n        return strs[0];\n    }\n}",
        csharp: "public class Solution {\n    public string LongestCommonPrefix(string[] strs) {\n        if (strs.Length == 0) return \"\";\n        for (int i = 0; i < strs[0].Length; i++) {\n            char c = strs[0][i];\n            for (int j = 1; j < strs.Length; j++) {\n                if (i == strs[j].Length || strs[j][i] != c)\n                    return strs[0].Substring(0, i);\n            }\n        }\n        return strs[0];\n    }\n}"
      } }
  ] },
  "a2z-138": { approaches: [
    { id: "dual-map", title: "Two bijection maps", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Map s->t and t->s consistently; any conflicting mapping means the strings are not isomorphic.",
      code: {
        java: "class Solution {\n    boolean isIsomorphic(String s, String t) {\n        int[] a = new int[256], b = new int[256];\n        java.util.Arrays.fill(a, -1);\n        java.util.Arrays.fill(b, -1);\n        for (int i = 0; i < s.length(); i++) {\n            char cs = s.charAt(i), ct = t.charAt(i);\n            if (a[cs] == -1 && b[ct] == -1) {\n                a[cs] = ct;\n                b[ct] = cs;\n            } else if (a[cs] != ct || b[ct] != cs) return false;\n        }\n        return true;\n    }\n}",
        csharp: "public class Solution {\n    public bool IsIsomorphic(string s, string t) {\n        int[] a = new int[256], b = new int[256];\n        Array.Fill(a, -1);\n        Array.Fill(b, -1);\n        for (int i = 0; i < s.Length; i++) {\n            char cs = s[i], ct = t[i];\n            if (a[cs] == -1 && b[ct] == -1) {\n                a[cs] = ct;\n                b[ct] = cs;\n            } else if (a[cs] != ct || b[ct] != cs) return false;\n        }\n        return true;\n    }\n}"
      } }
  ] },
  "a2z-139": { approaches: [
    { id: "double-string", title: "Rotation test via s + s", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "goal is a rotation of s iff lengths match and the doubled string s+s contains goal as a substring.",
      code: {
        java: "class Solution {\n    boolean rotateString(String s, String goal) {\n        return s.length() == goal.length() && (s + s).contains(goal);\n    }\n}",
        csharp: "public class Solution {\n    public bool RotateString(string s, string goal) {\n        return s.Length == goal.Length && (s + s).Contains(goal);\n    }\n}"
      } }
  ] },
  "a2z-140": { approaches: [
    { id: "sort-both", title: "Sort and compare", level: "Brute", time: "O(n log n)", space: "O(n)",
      explanation: "Anagrams are equal after sorting both strings.",
      code: {
        java: "class Solution {\n    boolean isAnagram(String s, String t) {\n        if (s.length() != t.length()) return false;\n        char[] a = s.toCharArray(), b = t.toCharArray();\n        java.util.Arrays.sort(a);\n        java.util.Arrays.sort(b);\n        return java.util.Arrays.equals(a, b);\n    }\n}",
        csharp: "public class Solution {\n    public bool IsAnagram(string s, string t) {\n        if (s.Length != t.Length) return false;\n        char[] a = s.ToCharArray(), b = t.ToCharArray();\n        Array.Sort(a);\n        Array.Sort(b);\n        return a.SequenceEqual(b);\n    }\n}"
      } },
    { id: "freq-count", title: "Single frequency array", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Increment counts for s and decrement for t over a 26-letter array; a non-zero count means not an anagram.",
      code: {
        java: "class Solution {\n    boolean isAnagram(String s, String t) {\n        if (s.length() != t.length()) return false;\n        int[] cnt = new int[26];\n        for (int i = 0; i < s.length(); i++) {\n            cnt[s.charAt(i) - 'a']++;\n            cnt[t.charAt(i) - 'a']--;\n        }\n        for (int v : cnt) if (v != 0) return false;\n        return true;\n    }\n}",
        csharp: "public class Solution {\n    public bool IsAnagram(string s, string t) {\n        if (s.Length != t.Length) return false;\n        int[] cnt = new int[26];\n        for (int i = 0; i < s.Length; i++) {\n            cnt[s[i] - 'a']++;\n            cnt[t[i] - 'a']--;\n        }\n        foreach (int v in cnt) if (v != 0) return false;\n        return true;\n    }\n}"
      } }
  ] },
  "a2z-141": { approaches: [
    { id: "freq-sort", title: "Bucket by frequency, then sort", level: "Optimal", time: "O(n log n)", space: "O(n)",
      explanation: "Count each character, then emit characters ordered by decreasing frequency (ties broken arbitrarily).",
      code: {
        java: "class Solution {\n    String frequencySort(String s) {\n        int[] cnt = new int[128];\n        for (char c : s.toCharArray()) cnt[c]++;\n        Integer[] chars = new Integer[128];\n        for (int i = 0; i < 128; i++) chars[i] = i;\n        java.util.Arrays.sort(chars, (x, y) -> cnt[y] - cnt[x]);\n        StringBuilder sb = new StringBuilder();\n        for (int c : chars)\n            for (int k = 0; k < cnt[c]; k++) sb.append((char) c);\n        return sb.toString();\n    }\n}",
        csharp: "public class Solution {\n    public string FrequencySort(string s) {\n        int[] cnt = new int[128];\n        foreach (char c in s) cnt[c]++;\n        int[] chars = new int[128];\n        for (int i = 0; i < 128; i++) chars[i] = i;\n        System.Array.Sort(chars, (x, y) => cnt[y] - cnt[x]);\n        StringBuilder sb = new StringBuilder();\n        foreach (int c in chars)\n            for (int k = 0; k < cnt[c]; k++) sb.Append((char) c);\n        return sb.ToString();\n    }\n}"
      } }
  ] },
  "a2z-142": { approaches: [
    { id: "depth-scan", title: "Running depth = balance", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Track the current nesting depth via a balance counter; the maximum depth reached is the answer.",
      code: {
        java: "class Solution {\n    int maxDepth(String s) {\n        int bal = 0, ans = 0;\n        for (char c : s.toCharArray()) {\n            if (c == '(') {\n                bal++;\n                ans = Math.max(ans, bal);\n            } else if (c == ')') bal--;\n        }\n        return ans;\n    }\n}",
        csharp: "public class Solution {\n    public int MaxDepth(string s) {\n        int bal = 0, ans = 0;\n        foreach (char c in s) {\n            if (c == '(') {\n                bal++;\n                ans = Math.Max(ans, bal);\n            } else if (c == ')') bal--;\n        }\n        return ans;\n    }\n}"
      } }
  ] },
  "a2z-143": { approaches: [
    { id: "subtract-if-smaller", title: "Subtract when a smaller value precedes", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Read values left to right; if a symbol is smaller than the one after it (like IV) subtract it, otherwise add it.",
      code: {
        java: "class Solution {\n    int value(char c) {\n        switch (c) {\n            case 'I': return 1;\n            case 'V': return 5;\n            case 'X': return 10;\n            case 'L': return 50;\n            case 'C': return 100;\n            case 'D': return 500;\n            case 'M': return 1000;\n        }\n        return 0;\n    }\n    int romanToInt(String s) {\n        int total = 0;\n        for (int i = 0; i < s.length(); i++) {\n            int v = value(s.charAt(i));\n            if (i + 1 < s.length() && v < value(s.charAt(i + 1))) total -= v;\n            else total += v;\n        }\n        return total;\n    }\n}",
        csharp: "public class Solution {\n    int Value(char c) {\n        switch (c) {\n            case 'I': return 1;\n            case 'V': return 5;\n            case 'X': return 10;\n            case 'L': return 50;\n            case 'C': return 100;\n            case 'D': return 500;\n            case 'M': return 1000;\n        }\n        return 0;\n    }\n    public int RomanToInt(string s) {\n        int total = 0;\n        for (int i = 0; i < s.Length; i++) {\n            int v = Value(s[i]);\n            if (i + 1 < s.Length && v < Value(s[i + 1])) total -= v;\n            else total += v;\n        }\n        return total;\n    }\n}"
      } }
  ] },
  "a2z-144": { approaches: [
    { id: "manual-parse", title: "Skip spaces, sign, then clamp digits", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Trim leading spaces, read an optional sign, accumulate digits and clamp to the 32-bit INT_MAX/INT_MIN range on overflow.",
      code: {
        java: "class Solution {\n    int myAtoi(String s) {\n        int i = 0, n = s.length();\n        while (i < n && s.charAt(i) == ' ') i++;\n        int sign = 1;\n        if (i < n && (s.charAt(i) == '+' || s.charAt(i) == '-'))\n            sign = s.charAt(i++) == '-' ? -1 : 1;\n        long val = 0;\n        while (i < n && Character.isDigit(s.charAt(i))) {\n            val = val * 10 + (s.charAt(i++) - '0');\n            if (sign == 1 && val > Integer.MAX_VALUE) return Integer.MAX_VALUE;\n            if (sign == -1 && -val < Integer.MIN_VALUE) return Integer.MIN_VALUE;\n        }\n        return (int) (sign * val);\n    }\n}",
        csharp: "public class Solution {\n    public int MyAtoi(string s) {\n        int i = 0, n = s.Length;\n        while (i < n && s[i] == ' ') i++;\n        int sign = 1;\n        if (i < n && (s[i] == '+' || s[i] == '-'))\n            sign = s[i++] == '-' ? -1 : 1;\n        long val = 0;\n        while (i < n && char.IsDigit(s[i])) {\n            val = val * 10 + (s[i++] - '0');\n            if (sign == 1 && val > int.MaxValue) return int.MaxValue;\n            if (sign == -1 && -val < int.MinValue) return int.MinValue;\n        }\n        return (int) (sign * val);\n    }\n}"
      } }
  ] },
  "a2z-145": { approaches: [
    { id: "last-positions", title: "Count via last seen of each character", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "For substrings needing at least one of '0','1','2': at each end index, the number of valid starts equals 1 + min(last-positions of the three). Sum over all ends.",
      code: {
        java: "class Solution {\n    int countSubstrings(String s) {\n        int[] last = { -1, -1, -1 };\n        long ans = 0;\n        for (int i = 0; i < s.length(); i++) {\n            last[s.charAt(i) - '0'] = i;\n            ans += 1 + Math.min(last[0], Math.min(last[1], last[2]));\n        }\n        return (int) ans;\n    }\n}",
        csharp: "public class Solution {\n    public int CountSubstrings(string s) {\n        int[] last = { -1, -1, -1 };\n        long ans = 0;\n        for (int i = 0; i < s.Length; i++) {\n            last[s[i] - '0'] = i;\n            ans += 1 + Math.Min(last[0], Math.Min(last[1], last[2]));\n        }\n        return (int) ans;\n    }\n}"
      } }
  ] },
  "a2z-146": { approaches: [
    { id: "expand-center", title: "Expand around every center", level: "Optimal", time: "O(n^2)", space: "O(1)",
      explanation: "Try all 2n-1 odd and even centers, expanding while the mirrored characters match; keep the longest span.",
      code: {
        java: "class Solution {\n    String longestPalindrome(String s) {\n        if (s.length() < 2) return s;\n        int start = 0, max = 0;\n        for (int i = 0; i < s.length(); i++) {\n            int l1 = expand(s, i, i);\n            int l2 = expand(s, i, i + 1);\n            int len = Math.max(l1, l2);\n            if (len > max) {\n                max = len;\n                start = i - (len - 1) / 2;\n            }\n        }\n        return s.substring(start, start + max);\n    }\n    int expand(String s, int l, int r) {\n        while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) {\n            l--;\n            r++;\n        }\n        return r - l - 1;\n    }\n}",
        csharp: "public class Solution {\n    public string LongestPalindrome(string s) {\n        if (s.Length < 2) return s;\n        int start = 0, max = 0;\n        for (int i = 0; i < s.Length; i++) {\n            int l1 = Expand(s, i, i);\n            int l2 = Expand(s, i, i + 1);\n            int len = Math.Max(l1, l2);\n            if (len > max) {\n                max = len;\n                start = i - (len - 1) / 2;\n            }\n        }\n        return s.Substring(start, max);\n    }\n    int Expand(string s, int l, int r) {\n        while (l >= 0 && r < s.Length && s[l] == s[r]) {\n            l--;\n            r++;\n        }\n        return r - l - 1;\n    }\n}"
      } }
  ] },
  "a2z-147": { approaches: [
    { id: "freq-scan", title: "Frequency array per substring", level: "Optimal", time: "O(n^2)", space: "O(1)",
      explanation: "For every start, extend the end and maintain a 26-count array; beauty = maxFreq - minFreq (over present letters). Accumulate.",
      code: {
        java: "class Solution {\n    int beautySum(String s) {\n        int n = s.length(), total = 0;\n        for (int i = 0; i < n; i++) {\n            int[] cnt = new int[26];\n            for (int j = i; j < n; j++) {\n                cnt[s.charAt(j) - 'a']++;\n                int max = 0, min = Integer.MAX_VALUE;\n                for (int c : cnt) {\n                    if (c > 0) {\n                        max = Math.max(max, c);\n                        min = Math.min(min, c);\n                    }\n                }\n                if (j - i + 1 >= 3) total += max - min;\n            }\n        }\n        return total;\n    }\n}",
        csharp: "public class Solution {\n    public int BeautySum(string s) {\n        int n = s.Length, total = 0;\n        for (int i = 0; i < n; i++) {\n            int[] cnt = new int[26];\n            for (int j = i; j < n; j++) {\n                cnt[s[j] - 'a']++;\n                int max = 0, min = int.MaxValue;\n                foreach (int c in cnt) {\n                    if (c > 0) {\n                        max = Math.Max(max, c);\n                        min = Math.Min(min, c);\n                    }\n                }\n                if (j - i + 1 >= 3) total += max - min;\n            }\n        }\n        return total;\n    }\n}"
      } }
  ] },
  "a2z-148": { approaches: [
    { id: "reverse-each-word", title: "Reverse characters inside each word", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Split into words and reverse the characters of each word in place, keeping the words in their original order.",
      code: {
        java: "class Solution {\n    String reverseEachWord(String s) {\n        String[] w = s.split(\" \");\n        StringBuilder out = new StringBuilder();\n        for (int i = 0; i < w.length; i++) {\n            out.append(new StringBuilder(w[i]).reverse());\n            if (i + 1 < w.length) out.append(' ');\n        }\n        return out.toString();\n    }\n}",
        csharp: "public class Solution {\n    public string ReverseEachWord(string s) {\n        string[] w = s.Split(' ');\n        for (int i = 0; i < w.Length; i++) {\n            char[] c = w[i].ToCharArray();\n            Array.Reverse(c);\n            w[i] = new string(c);\n        }\n        return string.Join(\" \", w);\n    }\n}"
      } }
  ] }
};
