export default {
  "a2z-206": { approaches: [
    { id: "bit-mask", title: "AND with shifted 1", level: "Optimal", time: "O(1)", space: "O(1)",
      explanation: "Shift 1 left by i positions and AND with n; a non-zero result means bit i is set.",
      code: {
        java: "class Solution {\n    boolean isIthBitSet(int n, int i) {\n        return (n & (1 << i)) != 0;\n    }\n}",
        csharp: "public class Solution {\n    public bool IsIthBitSet(int n, int i) {\n        return (n & (1 << i)) != 0;\n    }\n}"
      } }
  ] },
  "a2z-207": { approaches: [
    { id: "lsb-check", title: "Check the least-significant bit", level: "Optimal", time: "O(1)", space: "O(1)",
      explanation: "A number is odd iff its last bit is 1; n & 1 isolates that bit.",
      code: {
        java: "class Solution {\n    boolean isOdd(int n) {\n        return (n & 1) == 1;\n    }\n}",
        csharp: "public class Solution {\n    public bool IsOdd(int n) {\n        return (n & 1) == 1;\n    }\n}"
      } }
  ] },
  "a2z-208": { approaches: [
    { id: "n-and-n-1", title: "n & (n-1) == 0 trick", level: "Optimal", time: "O(1)", space: "O(1)",
      explanation: "A power of 2 has exactly one bit set; subtracting 1 flips all lower bits so n&(n-1) yields 0.",
      code: {
        java: "class Solution {\n    boolean isPowerOfTwo(int n) {\n        return n > 0 && (n & (n - 1)) == 0;\n    }\n}",
        csharp: "public class Solution {\n    public bool IsPowerOfTwo(int n) {\n        return n > 0 && (n & (n - 1)) == 0;\n    }\n}"
      } }
  ] },
  "a2z-209": { approaches: [
    { id: "kernighan", title: "Brian Kernighan's bit-clearing loop", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "Each iteration of n &= (n-1) clears the lowest set bit; count iterations until n becomes 0.",
      code: {
        java: "class Solution {\n    int countSetBits(int n) {\n        int cnt = 0;\n        while (n != 0) { n &= (n - 1); cnt++; }\n        return cnt;\n    }\n}",
        csharp: "public class Solution {\n    public int CountSetBits(int n) {\n        int cnt = 0;\n        while (n != 0) { n &= (n - 1); cnt++; }\n        return cnt;\n    }\n}"
      } }
  ] },
  "a2z-210": { approaches: [
    { id: "or-n-plus-1", title: "Set rightmost unset via n|(n+1)", level: "Optimal", time: "O(1)", space: "O(1)",
      explanation: "n+1 flips the rightmost unset bit to 1 (and clears trailing 1s); OR with n keeps original 1s and sets that bit.",
      code: {
        java: "class Solution {\n    int setRightmostUnsetBit(int n) {\n        return n | (n + 1);\n    }\n}",
        csharp: "public class Solution {\n    public int SetRightmostUnsetBit(int n) {\n        return n | (n + 1);\n    }\n}"
      } }
  ] },
  "a2z-211": { approaches: [
    { id: "xor-swap", title: "XOR-based swap without temp", level: "Optimal", time: "O(1)", space: "O(1)",
      explanation: "Three XOR assignments swap two integers: a^b^b=a and a^a^b=b.",
      code: {
        java: "class Solution {\n    int[] swap(int a, int b) {\n        a = a ^ b;\n        b = a ^ b;\n        a = a ^ b;\n        return new int[]{a, b};\n    }\n}",
        csharp: "public class Solution {\n    public int[] Swap(int a, int b) {\n        a = a ^ b;\n        b = a ^ b;\n        a = a ^ b;\n        return new int[] { a, b };\n    }\n}"
      } }
  ] },
  "a2z-212": { approaches: [
    { id: "shift-subtract", title: "Repeated doubling of divisor", level: "Optimal", time: "O(log^2 n)", space: "O(1)",
      explanation: "Work with absolute values; find the largest power-of-2 multiple of divisor fitting in the remaining dividend, accumulate quotient via shifts.",
      code: {
        java: "class Solution {\n    int divide(int dividend, int divisor) {\n        if (dividend == Integer.MIN_VALUE && divisor == -1) return Integer.MAX_VALUE;\n        long a = Math.abs((long) dividend), b = Math.abs((long) divisor);\n        int sign = ((long) dividend ^ (long) divisor) >= 0 ? 1 : -1;\n        int q = 0;\n        while (a >= b) {\n            long t = b, p = 1;\n            while (a >= (t << 1)) { t <<= 1; p <<= 1; }\n            a -= t;\n            q += (int) p;\n        }\n        return sign * q;\n    }\n}",
        csharp: "public class Solution {\n    public int Divide(int dividend, int divisor) {\n        if (dividend == int.MinValue && divisor == -1) return int.MaxValue;\n        long a = System.Math.Abs((long) dividend), b = System.Math.Abs((long) divisor);\n        int sign = ((long) dividend ^ (long) divisor) >= 0 ? 1 : -1;\n        int q = 0;\n        while (a >= b) {\n            long t = b, p = 1;\n            while (a >= (t << 1)) { t <<= 1; p <<= 1; }\n            a -= t;\n            q += (int) p;\n        }\n        return sign * q;\n    }\n}"
      } }
  ] },
  "a2z-213": { approaches: [
    { id: "xor-popcount", title: "Popcount of XOR", level: "Optimal", time: "O(1)", space: "O(1)",
      explanation: "Bits that differ between start and goal show as 1 in start^goal; count them.",
      code: {
        java: "class Solution {\n    int minBitFlips(int start, int goal) {\n        return Integer.bitCount(start ^ goal);\n    }\n}",
        csharp: "public class Solution {\n    public int MinBitFlips(int start, int goal) {\n        return System.Numerics.BitOperations.PopCount((uint) (start ^ goal));\n    }\n}"
      } }
  ] },
  "a2z-214": { approaches: [
    { id: "xor-all", title: "XOR every element", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Duplicates cancel under XOR (a^a=0); the lone element remains.",
      code: {
        java: "class Solution {\n    int singleNumber(int[] nums) {\n        int r = 0;\n        for (int x : nums) r ^= x;\n        return r;\n    }\n}",
        csharp: "public class Solution {\n    public int SingleNumber(int[] nums) {\n        int r = 0;\n        foreach (int x in nums) r ^= x;\n        return r;\n    }\n}"
      } }
  ] },
  "a2z-215": { approaches: [
    { id: "bitmask-subset", title: "Enumerate 2^n masks", level: "Optimal", time: "O(n 2^n)", space: "O(n)",
      explanation: "For each mask 0..2^n-1, include element j if bit j of the mask is set.",
      code: {
        java: "class Solution {\n    java.util.List<String> powerSet(String s) {\n        int n = s.length();\n        java.util.List<String> res = new java.util.ArrayList<>();\n        for (int mask = 0; mask < (1 << n); mask++) {\n            StringBuilder sb = new StringBuilder();\n            for (int j = 0; j < n; j++)\n                if ((mask & (1 << j)) != 0) sb.append(s.charAt(j));\n            res.add(sb.toString());\n        }\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public IList<string> PowerSet(string s) {\n        int n = s.Length;\n        var res = new List<string>();\n        for (int mask = 0; mask < (1 << n); mask++) {\n            var sb = new StringBuilder();\n            for (int j = 0; j < n; j++)\n                if ((mask & (1 << j)) != 0) sb.Append(s[j]);\n            res.Add(sb.ToString());\n        }\n        return res;\n    }\n}"
      } }
  ] },
  "a2z-216": { approaches: [
    { id: "xor-prefix", title: "XOR from 0 to n in O(1)", level: "Optimal", time: "O(1)", space: "O(1)",
      explanation: "xorUp(n) follows a 4-case pattern on n%4; range [L,R] = xorUp(R) ^ xorUp(L-1).",
      code: {
        java: "class Solution {\n    int xorRange(int l, int r) {\n        return xorUp(r) ^ xorUp(l - 1);\n    }\n    int xorUp(int n) {\n        switch (n % 4) {\n            case 0: return n;\n            case 1: return 1;\n            case 2: return n + 1;\n            default: return 0;\n        }\n    }\n}",
        csharp: "public class Solution {\n    public int XorRange(int l, int r) {\n        return XorUp(r) ^ XorUp(l - 1);\n    }\n    int XorUp(int n) {\n        switch (n % 4) {\n            case 0: return n;\n            case 1: return 1;\n            case 2: return n + 1;\n            default: return 0;\n        }\n    }\n}"
      } }
  ] },
  "a2z-217": { approaches: [
    { id: "xor-partition", title: "XOR all, split by differing bit", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "XOR of entire array = a^b (two uniques). Pick any set bit to partition into two groups, each yielding one unique.",
      code: {
        java: "class Solution {\n    int[] singleNumber(int[] nums) {\n        int xr = 0;\n        for (int x : nums) xr ^= x;\n        int bit = xr & (-xr);\n        int a = 0, b = 0;\n        for (int x : nums) {\n            if ((x & bit) != 0) a ^= x;\n            else b ^= x;\n        }\n        return new int[]{a, b};\n    }\n}",
        csharp: "public class Solution {\n    public int[] SingleNumber(int[] nums) {\n        int xr = 0;\n        foreach (int x in nums) xr ^= x;\n        int bit = xr & (-xr);\n        int a = 0, b = 0;\n        foreach (int x in nums) {\n            if ((x & bit) != 0) a ^= x;\n            else b ^= x;\n        }\n        return new int[] { a, b };\n    }\n}"
      } }
  ] },
  "a2z-218": { approaches: [
    { id: "trial-division", title: "Divide out smallest factors", level: "Optimal", time: "O(sqrt n)", space: "O(1)",
      explanation: "Try 2, then odd d from 3 up to sqrt(n); each time d divides n, record it and divide.",
      code: {
        java: "class Solution {\n    java.util.List<Integer> primeFactors(int n) {\n        java.util.List<Integer> res = new java.util.ArrayList<>();\n        for (int d = 2; d * d <= n; d++)\n            while (n % d == 0) { res.add(d); n /= d; }\n        if (n > 1) res.add(n);\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public IList<int> PrimeFactors(int n) {\n        var res = new List<int>();\n        for (int d = 2; d * d <= n; d++)\n            while (n % d == 0) { res.Add(d); n /= d; }\n        if (n > 1) res.Add(n);\n        return res;\n    }\n}"
      } }
  ] },
  "a2z-219": { approaches: [
    { id: "sqrt-pair", title: "Collect divisors in sqrt pairs", level: "Optimal", time: "O(sqrt n)", space: "O(d(n))",
      explanation: "For each i up to sqrt(n) that divides n, add both i and n/i; sort the result.",
      code: {
        java: "class Solution {\n    java.util.List<Integer> divisors(int n) {\n        java.util.List<Integer> res = new java.util.ArrayList<>();\n        for (int i = 1; i * i <= n; i++) {\n            if (n % i == 0) {\n                res.add(i);\n                if (i != n / i) res.add(n / i);\n            }\n        }\n        java.util.Collections.sort(res);\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public IList<int> Divisors(int n) {\n        var res = new List<int>();\n        for (int i = 1; i * i <= n; i++) {\n            if (n % i == 0) {\n                res.Add(i);\n                if (i != n / i) res.Add(n / i);\n            }\n        }\n        res.Sort();\n        return res;\n    }\n}"
      } }
  ] },
  "a2z-220": { approaches: [
    { id: "sieve-prefix", title: "Sieve of Eratosthenes with prefix", level: "Optimal", time: "O(R log log R)", space: "O(R)",
      explanation: "Sieve primes up to R, build a prefix-count array, answer each query in O(1).",
      code: {
        java: "class Solution {\n    int countPrimesInRange(int l, int r) {\n        boolean[] comp = new boolean[r + 1];\n        for (int i = 2; (long) i * i <= r; i++)\n            if (!comp[i])\n                for (int j = i * i; j <= r; j += i) comp[j] = true;\n        int cnt = 0;\n        for (int i = Math.max(l, 2); i <= r; i++)\n            if (!comp[i]) cnt++;\n        return cnt;\n    }\n}",
        csharp: "public class Solution {\n    public int CountPrimesInRange(int l, int r) {\n        bool[] comp = new bool[r + 1];\n        for (int i = 2; (long) i * i <= r; i++)\n            if (!comp[i])\n                for (int j = i * i; j <= r; j += i) comp[j] = true;\n        int cnt = 0;\n        for (int i = System.Math.Max(l, 2); i <= r; i++)\n            if (!comp[i]) cnt++;\n        return cnt;\n    }\n}"
      } }
  ] },
  "a2z-221": { approaches: [
    { id: "trial-map", title: "Factor map via trial division", level: "Optimal", time: "O(sqrt n)", space: "O(log n)",
      explanation: "Same as prime factors but returns a sorted map of prime→exponent.",
      code: {
        java: "class Solution {\n    java.util.Map<Integer, Integer> factorize(int n) {\n        java.util.Map<Integer, Integer> map = new java.util.TreeMap<>();\n        for (int d = 2; d * d <= n; d++)\n            while (n % d == 0) { map.merge(d, 1, Integer::sum); n /= d; }\n        if (n > 1) map.merge(n, 1, Integer::sum);\n        return map;\n    }\n}",
        csharp: "public class Solution {\n    public SortedDictionary<int, int> Factorize(int n) {\n        var map = new SortedDictionary<int, int>();\n        for (int d = 2; d * d <= n; d++)\n            while (n % d == 0) { map.TryGetValue(d, out int v); map[d] = v + 1; n /= d; }\n        if (n > 1) { map.TryGetValue(n, out int v); map[n] = v + 1; }\n        return map;\n    }\n}"
      } }
  ] },
  "a2z-222": { approaches: [
    { id: "fast-pow", title: "Binary exponentiation", level: "Optimal", time: "O(log n)", space: "O(1)",
      explanation: "Square the base each step; multiply the result when the current bit of n is 1.",
      code: {
        java: "class Solution {\n    double myPow(double x, int n) {\n        long e = Math.abs((long) n);\n        double r = 1;\n        while (e > 0) {\n            if ((e & 1) == 1) r *= x;\n            x *= x;\n            e >>= 1;\n        }\n        return n >= 0 ? r : 1.0 / r;\n    }\n}",
        csharp: "public class Solution {\n    public double MyPow(double x, int n) {\n        long e = System.Math.Abs((long) n);\n        double r = 1;\n        while (e > 0) {\n            if ((e & 1) == 1) r *= x;\n            x *= x;\n            e >>= 1;\n        }\n        return n >= 0 ? r : 1.0 / r;\n    }\n}"
      } }
  ] }
};
