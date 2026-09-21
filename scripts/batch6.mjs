export default {
  "a2z-180": { approaches: [
    { id: "recursive-atoi", title: "Recurse over the digit suffix", level: "Optimal", time: "O(n)", space: "O(n) stack",
      explanation: "Peel the last digit off recursively: atoi(s[0..n-1]) * 10 + lastDigit, stopping at a non-digit.",
      code: {
        java: "class Solution {\n    int myAtoi(char[] s, int n) {\n        if (n <= 0) return 0;\n        int digit = s[n - 1] - '0';\n        if (digit < 0 || digit > 9) return myAtoi(s, n - 1);\n        return myAtoi(s, n - 1) * 10 + digit;\n    }\n}",
        csharp: "public class Solution {\n    public int MyAtoi(char[] s, int n) {\n        if (n <= 0) return 0;\n        int digit = s[n - 1] - '0';\n        if (digit < 0 || digit > 9) return MyAtoi(s, n - 1);\n        return MyAtoi(s, n - 1) * 10 + digit;\n    }\n}"
      } }
  ] },
  "a2z-181": { approaches: [
    { id: "fast-power", title: "Divide-and-conquer power", level: "Optimal", time: "O(log n)", space: "O(log n)",
      explanation: "x^n = (x^(n/2))^2, multiplying by one extra x when n is odd; handle negative n via 1/x^|n|.",
      code: {
        java: "class Solution {\n    double myPow(double x, int n) {\n        long e = n;\n        if (e < 0) { x = 1 / x; e = -e; }\n        return fastPow(x, e);\n    }\n    double fastPow(double x, long n) {\n        if (n == 0) return 1.0;\n        double half = fastPow(x, n / 2);\n        return n % 2 == 0 ? half * half : half * half * x;\n    }\n}",
        csharp: "public class Solution {\n    public double MyPow(double x, int n) {\n        long e = n;\n        if (e < 0) { x = 1 / x; e = -e; }\n        return FastPow(x, e);\n    }\n    double FastPow(double x, long n) {\n        if (n == 0) return 1.0;\n        double half = FastPow(x, n / 2);\n        return n % 2 == 0 ? half * half : half * half * x;\n    }\n}"
      } }
  ] },
  "a2z-182": { approaches: [
    { id: "mod-exp", title: "Count = 4^a * 5^b with fast power", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "At odd positions only prime digits (4 choices) are allowed and at even positions any even digit (5 choices); multiply the two modular powers.",
      code: {
        java: "class Solution {\n    long MOD = 1_000_000_007L;\n    long pow(long b, long e) {\n        long r = 1;\n        b %= MOD;\n        while (e > 0) {\n            if ((e & 1) == 1) r = r * b % MOD;\n            b = b * b % MOD;\n            e >>= 1;\n        }\n        return r;\n    }\n    int countGoodNumbers(long n) {\n        long even = (n + 1) / 2, odd = n / 2;\n        return (int) (pow(5, even) * pow(4, odd) % MOD);\n    }\n}",
        csharp: "public class Solution {\n    long MOD = 1_000_000_007L;\n    long Pow(long b, long e) {\n        long r = 1;\n        b %= MOD;\n        while (e > 0) {\n            if ((e & 1) == 1) r = r * b % MOD;\n            b = b * b % MOD;\n            e >>= 1;\n        }\n        return r;\n    }\n    public int CountGoodNumbers(long n) {\n        long even = (n + 1) / 2, odd = n / 2;\n        return (int) (Pow(5, even) * Pow(4, odd) % MOD);\n    }\n}"
      } }
  ] },
  "a2z-183": { approaches: [
    { id: "insert-sorted", title: "Sort the stack with recursion only", level: "Optimal", time: "O(n^2)", space: "O(n) stack",
      explanation: "Pop all elements, then insert each back at its sorted position using a recursive insert that parks larger values temporarily.",
      code: {
        java: "class Solution {\n    void sortStack(java.util.Stack<Integer> s) {\n        if (!s.isEmpty()) {\n            int top = s.pop();\n            sortStack(s);\n            insertSorted(s, top);\n        }\n    }\n    void insertSorted(java.util.Stack<Integer> s, int x) {\n        if (s.isEmpty() || x >= s.peek()) {\n            s.push(x);\n            return;\n        }\n        int top = s.pop();\n        insertSorted(s, x);\n        s.push(top);\n    }\n}",
        csharp: "public class Solution {\n    public void SortStack(System.Collections.Generic.Stack<int> s) {\n        if (s.Count > 0) {\n            int top = s.Pop();\n            SortStack(s);\n            InsertSorted(s, top);\n        }\n    }\n    void InsertSorted(System.Collections.Generic.Stack<int> s, int x) {\n        if (s.Count == 0 || x >= s.Peek()) {\n            s.Push(x);\n            return;\n        }\n        int top = s.Pop();\n        InsertSorted(s, x);\n        s.Push(top);\n    }\n}"
      } }
  ] },
  "a2z-184": { approaches: [
    { id: "reverse-recursion", title: "Insert the bottom on unwind", level: "Optimal", time: "O(n^2)", space: "O(n) stack",
      explanation: "Pop to the bottom, then on the way back insert each popped element at the stack's bottom recursively.",
      code: {
        java: "class Solution {\n    void reverseStack(java.util.Stack<Integer> s) {\n        if (!s.isEmpty()) {\n            int top = s.pop();\n            reverseStack(s);\n            insertBottom(s, top);\n        }\n    }\n    void insertBottom(java.util.Stack<Integer> s, int x) {\n        if (s.isEmpty()) {\n            s.push(x);\n            return;\n        }\n        int top = s.pop();\n        insertBottom(s, x);\n        s.push(top);\n    }\n}",
        csharp: "public class Solution {\n    public void ReverseStack(System.Collections.Generic.Stack<int> s) {\n        if (s.Count > 0) {\n            int top = s.Pop();\n            ReverseStack(s);\n            InsertBottom(s, top);\n        }\n    }\n    void InsertBottom(System.Collections.Generic.Stack<int> s, int x) {\n        if (s.Count == 0) {\n            s.Push(x);\n            return;\n        }\n        int top = s.Pop();\n        InsertBottom(s, x);\n        s.Push(top);\n    }\n}"
      } }
  ] },
  "a2z-185": { approaches: [
    { id: "backtrack-bits", title: "Append 0 always, 1 only after 0", level: "Optimal", time: "O(2^n)", space: "O(n)",
      explanation: "Grow the string one bit at a time; place a 0 freely and a 1 only when the previous bit was 0, forbidding consecutive 1s.",
      code: {
        java: "class Solution {\n    java.util.List<String> generate(int n) {\n        java.util.List<String> res = new java.util.ArrayList<>();\n        gen(res, new StringBuilder(), n, '0');\n        return res;\n    }\n    void gen(java.util.List<String> res, StringBuilder sb, int n, char last) {\n        if (sb.length() == n) {\n            res.add(sb.toString());\n            return;\n        }\n        sb.append('0');\n        gen(res, sb, n, '0');\n        sb.deleteCharAt(sb.length() - 1);\n        if (last == '0') {\n            sb.append('1');\n            gen(res, sb, n, '1');\n            sb.deleteCharAt(sb.length() - 1);\n        }\n    }\n}",
        csharp: "public class Solution {\n    public IList<string> Generate(int n) {\n        var res = new List<string>();\n        Gen(res, new StringBuilder(), n, '0');\n        return res;\n    }\n    void Gen(List<string> res, StringBuilder sb, int n, char last) {\n        if (sb.Length == n) {\n            res.Add(sb.ToString());\n            return;\n        }\n        sb.Append('0');\n        Gen(res, sb, n, '0');\n        sb.Length--;\n        if (last == '0') {\n            sb.Append('1');\n            Gen(res, sb, n, '1');\n            sb.Length--;\n        }\n    }\n}"
      } }
  ] },
  "a2z-186": { approaches: [
    { id: "open-close-count", title: "Track open/close budgets", level: "Optimal", time: "O(4^n/sqrt n)", space: "O(n)",
      explanation: "Add '(' while opens remain and ')' while closes exceed opens; emit when n pairs are used.",
      code: {
        java: "class Solution {\n    java.util.List<String> generateParenthesis(int n) {\n        java.util.List<String> res = new java.util.ArrayList<>();\n        bt(res, new StringBuilder(), 0, 0, n);\n        return res;\n    }\n    void bt(java.util.List<String> res, StringBuilder sb, int open, int close, int n) {\n        if (sb.length() == 2 * n) {\n            res.add(sb.toString());\n            return;\n        }\n        if (open < n) {\n            sb.append('(');\n            bt(res, sb, open + 1, close, n);\n            sb.deleteCharAt(sb.length() - 1);\n        }\n        if (close < open) {\n            sb.append(')');\n            bt(res, sb, open, close + 1, n);\n            sb.deleteCharAt(sb.length() - 1);\n        }\n    }\n}",
        csharp: "public class Solution {\n    public IList<string> GenerateParenthesis(int n) {\n        var res = new List<string>();\n        Bt(res, new StringBuilder(), 0, 0, n);\n        return res;\n    }\n    void Bt(List<string> res, StringBuilder sb, int open, int close, int n) {\n        if (sb.Length == 2 * n) {\n            res.Add(sb.ToString());\n            return;\n        }\n        if (open < n) {\n            sb.Append('(');\n            Bt(res, sb, open + 1, close, n);\n            sb.Length--;\n        }\n        if (close < open) {\n            sb.Append(')');\n            Bt(res, sb, open, close + 1, n);\n            sb.Length--;\n        }\n    }\n}"
      } }
  ] },
  "a2z-187": { approaches: [
    { id: "include-exclude", title: "Take-or-skip each element", level: "Optimal", time: "O(2^n)", space: "O(n)",
      explanation: "Standard power-set recursion: for each index branch on excluding and including the element.",
      code: {
        java: "class Solution {\n    java.util.List<String> powerSet(String s) {\n        java.util.List<String> res = new java.util.ArrayList<>();\n        bt(res, new StringBuilder(), s, 0);\n        return res;\n    }\n    void bt(java.util.List<String> res, StringBuilder sb, String s, int i) {\n        if (i == s.length()) {\n            res.add(sb.toString());\n            return;\n        }\n        bt(res, sb, s, i + 1);\n        sb.append(s.charAt(i));\n        bt(res, sb, s, i + 1);\n        sb.deleteCharAt(sb.length() - 1);\n    }\n}",
        csharp: "public class Solution {\n    public IList<string> PowerSet(string s) {\n        var res = new List<string>();\n        Bt(res, new StringBuilder(), s, 0);\n        return res;\n    }\n    void Bt(List<string> res, StringBuilder sb, string s, int i) {\n        if (i == s.Length) {\n            res.Add(sb.ToString());\n            return;\n        }\n        Bt(res, sb, s, i + 1);\n        sb.Append(s[i]);\n        Bt(res, sb, s, i + 1);\n        sb.Length--;\n    }\n}"
      } }
  ] },
  "a2z-189": { approaches: [
    { id: "count-subseq", title: "Take-or-skip counted recursively", level: "Optimal", time: "O(2^n)", space: "O(n)",
      explanation: "f(i, sum) = f(i+1, sum) + f(i+1, sum - a[i]) counting branches that reach exactly k at the end.",
      code: {
        java: "class Solution {\n    int countSubsetSumK(int[] a, int k) {\n        return f(a, 0, k);\n    }\n    int f(int[] a, int i, int sum) {\n        if (i == a.length) return sum == 0 ? 1 : 0;\n        int take = 0, not = f(a, i + 1, sum);\n        if (sum >= a[i]) take = f(a, i + 1, sum - a[i]);\n        return take + not;\n    }\n}",
        csharp: "public class Solution {\n    public int CountSubsetSumK(int[] a, int k) {\n        return F(a, 0, k);\n    }\n    int F(int[] a, int i, int sum) {\n        if (i == a.Length) return sum == 0 ? 1 : 0;\n        int take = 0, not = F(a, i + 1, sum);\n        if (sum >= a[i]) take = F(a, i + 1, sum - a[i]);\n        return take + not;\n    }\n}"
      } }
  ] },
  "a2z-190": { approaches: [
    { id: "exists-subseq", title: "Any branch reaching the sum", level: "Optimal", time: "O(2^n)", space: "O(n)",
      explanation: "Return true if either skipping or taking the current element eventually reaches sum 0.",
      code: {
        java: "class Solution {\n    boolean subsetExists(int[] a, int k) {\n        return f(a, 0, k);\n    }\n    boolean f(int[] a, int i, int sum) {\n        if (i == a.length) return sum == 0;\n        if (sum == 0) return true;\n        if (sum >= a[i] && f(a, i + 1, sum - a[i])) return true;\n        return f(a, i + 1, sum);\n    }\n}",
        csharp: "public class Solution {\n    public bool SubsetExists(int[] a, int k) {\n        return F(a, 0, k);\n    }\n    bool F(int[] a, int i, int sum) {\n        if (i == a.Length) return sum == 0;\n        if (sum == 0) return true;\n        if (sum >= a[i] && F(a, i + 1, sum - a[i])) return true;\n        return F(a, i + 1, sum);\n    }\n}"
      } }
  ] },
  "a2z-191": { approaches: [
    { id: "pick-allow-reuse", title: "Reuse the same index freely", level: "Optimal", time: "O(2^t)", space: "O(t)",
      explanation: "At each step stay on the same candidate (reuse allowed) until the target is met, then move forward to avoid duplicate combinations.",
      code: {
        java: "class Solution {\n    java.util.List<java.util.List<Integer>> combinationSum(int[] c, int target) {\n        java.util.List<java.util.List<Integer>> res = new java.util.ArrayList<>();\n        bt(res, new java.util.ArrayList<>(), c, 0, target);\n        return res;\n    }\n    void bt(java.util.List<java.util.List<Integer>> res, java.util.List<Integer> cur, int[] c, int i, int left) {\n        if (i == c.length) {\n            if (left == 0) res.add(new java.util.ArrayList<>(cur));\n            return;\n        }\n        if (c[i] <= left) {\n            cur.add(c[i]);\n            bt(res, cur, c, i, left - c[i]);\n            cur.remove(cur.size() - 1);\n        }\n        bt(res, cur, c, i + 1, left);\n    }\n}",
        csharp: "public class Solution {\n    public IList<IList<int>> CombinationSum(int[] c, int target) {\n        var res = new List<IList<int>>();\n        Bt(res, new List<int>(), c, 0, target);\n        return res;\n    }\n    void Bt(List<IList<int>> res, List<int> cur, int[] c, int i, int left) {\n        if (i == c.Length) {\n            if (left == 0) res.Add(new List<int>(cur));\n            return;\n        }\n        if (c[i] <= left) {\n            cur.Add(c[i]);\n            Bt(res, cur, c, i, left - c[i]);\n            cur.RemoveAt(cur.Count - 1);\n        }\n        Bt(res, cur, c, i + 1, left);\n    }\n}"
      } }
  ] },
  "a2z-192": { approaches: [
    { id: "sort-skip-dup", title: "Sort then skip duplicate picks per level", level: "Optimal", time: "O(2^n n)", space: "O(n)",
      explanation: "Each candidate is used at most once per branch; after returning, skip equal neighbours to avoid duplicate combinations.",
      code: {
        java: "class Solution {\n    java.util.List<java.util.List<Integer>> combinationSum2(int[] c, int target) {\n        java.util.Arrays.sort(c);\n        java.util.List<java.util.List<Integer>> res = new java.util.ArrayList<>();\n        bt(res, new java.util.ArrayList<>(), c, 0, target);\n        return res;\n    }\n    void bt(java.util.List<java.util.List<Integer>> res, java.util.List<Integer> cur, int[] c, int i, int left) {\n        if (left == 0) {\n            res.add(new java.util.ArrayList<>(cur));\n            return;\n        }\n        for (int j = i; j < c.length; j++) {\n            if (j > i && c[j] == c[j - 1]) continue;\n            if (c[j] > left) break;\n            cur.add(c[j]);\n            bt(res, cur, c, j + 1, left - c[j]);\n            cur.remove(cur.size() - 1);\n        }\n    }\n}",
        csharp: "public class Solution {\n    public IList<IList<int>> CombinationSum2(int[] c, int target) {\n        System.Array.Sort(c);\n        var res = new List<IList<int>>();\n        Bt(res, new List<int>(), c, 0, target);\n        return res;\n    }\n    void Bt(List<IList<int>> res, List<int> cur, int[] c, int i, int left) {\n        if (left == 0) {\n            res.Add(new List<int>(cur));\n            return;\n        }\n        for (int j = i; j < c.Length; j++) {\n            if (j > i && c[j] == c[j - 1]) continue;\n            if (c[j] > left) break;\n            cur.Add(c[j]);\n            Bt(res, cur, c, j + 1, left - c[j]);\n            cur.RemoveAt(cur.Count - 1);\n        }\n    }\n}"
      } }
  ] },
  "a2z-193": { approaches: [
    { id: "take-skip", title: "Power set via take-or-skip", level: "Optimal", time: "O(2^n n)", space: "O(n)",
      explanation: "Recursively exclude and include each element, snapshotting the current subset at the leaves.",
      code: {
        java: "class Solution {\n    java.util.List<java.util.List<Integer>> subsets(int[] a) {\n        java.util.List<java.util.List<Integer>> res = new java.util.ArrayList<>();\n        bt(res, new java.util.ArrayList<>(), a, 0);\n        return res;\n    }\n    void bt(java.util.List<java.util.List<Integer>> res, java.util.List<Integer> cur, int[] a, int i) {\n        if (i == a.length) {\n            res.add(new java.util.ArrayList<>(cur));\n            return;\n        }\n        bt(res, cur, a, i + 1);\n        cur.add(a[i]);\n        bt(res, cur, a, i + 1);\n        cur.remove(cur.size() - 1);\n    }\n}",
        csharp: "public class Solution {\n    public IList<IList<int>> Subsets(int[] a) {\n        var res = new List<IList<int>>();\n        Bt(res, new List<int>(), a, 0);\n        return res;\n    }\n    void Bt(List<IList<int>> res, List<int> cur, int[] a, int i) {\n        if (i == a.Length) {\n            res.Add(new List<int>(cur));\n            return;\n        }\n        Bt(res, cur, a, i + 1);\n        cur.Add(a[i]);\n        Bt(res, cur, a, i + 1);\n        cur.RemoveAt(cur.Count - 1);\n    }\n}"
      } }
  ] },
  "a2z-194": { approaches: [
    { id: "sort-skip-dup-subset", title: "Sort then branch skipping duplicates", level: "Optimal", time: "O(2^n n)", space: "O(n)",
      explanation: "Include a value, then when skipping move past all its equal copies so no duplicate subset is produced.",
      code: {
        java: "class Solution {\n    java.util.List<java.util.List<Integer>> subsetsWithDup(int[] a) {\n        java.util.Arrays.sort(a);\n        java.util.List<java.util.List<Integer>> res = new java.util.ArrayList<>();\n        bt(res, new java.util.ArrayList<>(), a, 0);\n        return res;\n    }\n    void bt(java.util.List<java.util.List<Integer>> res, java.util.List<Integer> cur, int[] a, int i) {\n        res.add(new java.util.ArrayList<>(cur));\n        for (int j = i; j < a.length; j++) {\n            if (j > i && a[j] == a[j - 1]) continue;\n            cur.add(a[j]);\n            bt(res, cur, a, j + 1);\n            cur.remove(cur.size() - 1);\n        }\n    }\n}",
        csharp: "public class Solution {\n    public IList<IList<int>> SubsetsWithDup(int[] a) {\n        System.Array.Sort(a);\n        var res = new List<IList<int>>();\n        Bt(res, new List<int>(), a, 0);\n        return res;\n    }\n    void Bt(List<IList<int>> res, List<int> cur, int[] a, int i) {\n        res.Add(new List<int>(cur));\n        for (int j = i; j < a.Length; j++) {\n            if (j > i && a[j] == a[j - 1]) continue;\n            cur.Add(a[j]);\n            Bt(res, cur, a, j + 1);\n            cur.RemoveAt(cur.Count - 1);\n        }\n    }\n}"
      } }
  ] }
};
