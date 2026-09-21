export default {
  "a2z-223": { approaches: [
    { id: "array-stack", title: "Fixed-size array with top pointer", level: "Optimal", time: "O(1) per op", space: "O(n)",
      explanation: "Maintain an array and a top index; push increments top, push decrements, peek reads arr[top].",
      code: {
        java: "class Solution {\n    static class MyStack {\n        int[] arr; int top, cap;\n        MyStack(int n) { arr = new int[n]; top = -1; cap = n; }\n        void push(int x) { if (top < cap - 1) arr[++top] = x; }\n        int pop() { if (top < 0) return -1; return arr[top--]; }\n        int peek() { return top < 0 ? -1 : arr[top]; }\n        boolean isEmpty() { return top == -1; }\n    }\n}",
        csharp: "public class MyStack {\n    int[] arr; int top, cap;\n    public MyStack(int n) { arr = new int[n]; top = -1; cap = n; }\n    public void Push(int x) { if (top < cap - 1) arr[++top] = x; }\n    public int Pop() { if (top < 0) return -1; return arr[top--]; }\n    public int Peek() { return top < 0 ? -1 : arr[top]; }\n    public bool IsEmpty() { return top == -1; }\n}"
      } }
  ] },
  "a2z-224": { approaches: [
    { id: "circular-queue", title: "Circular array with front/rear", level: "Optimal", time: "O(1) per op", space: "O(n)",
      explanation: "Use modular arithmetic for wrap-around; track front and rear indices plus a count.",
      code: {
        java: "class Solution {\n    static class MyQueue {\n        int[] arr; int front, rear, sz, cap;\n        MyQueue(int n) { arr = new int[n]; front = 0; rear = -1; sz = 0; cap = n; }\n        void enqueue(int x) { if (sz == cap) return; rear = (rear + 1) % cap; arr[rear] = x; sz++; }\n        int dequeue() { if (sz == 0) return -1; int v = arr[front]; front = (front + 1) % cap; sz--; return v; }\n        int peek() { return sz == 0 ? -1 : arr[front]; }\n        boolean isEmpty() { return sz == 0; }\n    }\n}",
        csharp: "public class MyQueue {\n    int[] arr; int front, rear, sz, cap;\n    public MyQueue(int n) { arr = new int[n]; front = 0; rear = -1; sz = 0; cap = n; }\n    public void Enqueue(int x) { if (sz == cap) return; rear = (rear + 1) % cap; arr[rear] = x; sz++; }\n    public int Dequeue() { if (sz == 0) return -1; int v = arr[front]; front = (front + 1) % cap; sz--; return v; }\n    public int Peek() { return sz == 0 ? -1 : arr[front]; }\n    public bool IsEmpty() { return sz == 0; }\n}"
      } }
  ] },
  "a2z-225": { approaches: [
    { id: "two-queues", title: "Two queues, costly push", level: "Optimal", time: "O(n) push, O(1) pop", space: "O(n)",
      explanation: "On push, drain q1 into q2, add new element to q1, then drain q2 back; this keeps the newest element at the front of q1.",
      code: {
        java: "class Solution {\n    static class MyStack {\n        java.util.Queue<Integer> q1 = new java.util.LinkedList<>(), q2 = new java.util.LinkedList<>();\n        void push(int x) {\n            q2.add(x);\n            while (!q1.isEmpty()) q2.add(q1.poll());\n            java.util.Queue<Integer> tmp = q1; q1 = q2; q2 = tmp;\n        }\n        int pop() { return q1.isEmpty() ? -1 : q1.poll(); }\n        int top() { return q1.isEmpty() ? -1 : q1.peek(); }\n        boolean isEmpty() { return q1.isEmpty(); }\n    }\n}",
        csharp: "public class MyStack {\n    Queue<int> q1 = new(), q2 = new();\n    public void Push(int x) {\n        q2.Enqueue(x);\n        while (q1.Count > 0) q2.Enqueue(q1.Dequeue());\n        (q1, q2) = (q2, q1);\n    }\n    public int Pop() => q1.Count == 0 ? -1 : q1.Dequeue();\n    public int Top() => q1.Count == 0 ? -1 : q1.Peek();\n    public bool IsEmpty() => q1.Count == 0;\n}"
      } }
  ] },
  "a2z-226": { approaches: [
    { id: "two-stacks", title: "Two stacks, costly dequeue", level: "Optimal", time: "O(1) enqueue, amortized O(1) dequeue", space: "O(n)",
      explanation: "Push into s1; on dequeue, if s2 is empty transfer all from s1 to s2 (reversing order), then pop s2.",
      code: {
        java: "class Solution {\n    static class MyQueue {\n        java.util.Stack<Integer> s1 = new java.util.Stack<>(), s2 = new java.util.Stack<>();\n        void enqueue(int x) { s1.push(x); }\n        int dequeue() {\n            if (s2.isEmpty()) { while (!s1.isEmpty()) s2.push(s1.pop()); }\n            return s2.isEmpty() ? -1 : s2.pop();\n        }\n        int peek() {\n            if (s2.isEmpty()) { while (!s1.isEmpty()) s2.push(s1.pop()); }\n            return s2.isEmpty() ? -1 : s2.peek();\n        }\n        boolean isEmpty() { return s1.isEmpty() && s2.isEmpty(); }\n    }\n}",
        csharp: "public class MyQueue {\n    Stack<int> s1 = new(), s2 = new();\n    public void Enqueue(int x) => s1.Push(x);\n    public int Dequeue() {\n        if (s2.Count == 0) while (s1.Count > 0) s2.Push(s1.Pop());\n        return s2.Count == 0 ? -1 : s2.Pop();\n    }\n    public int Peek() {\n        if (s2.Count == 0) while (s1.Count > 0) s2.Push(s1.Pop());\n        return s2.Count == 0 ? -1 : s2.Peek();\n    }\n    public bool IsEmpty() => s1.Count == 0 && s2.Count == 0;\n}"
      } }
  ] },
  "a2z-227": { approaches: [
    { id: "ll-stack", title: "LinkedList as stack", level: "Optimal", time: "O(1) per op", space: "O(n)",
      explanation: "Use a singly-linked list; push/pop at the head for O(1).",
      code: {
        java: "class Solution {\n    static class MyStack {\n        private static class Node { int val; Node next; Node(int v){val=v;} }\n        Node head; int sz;\n        MyStack() { head = null; sz = 0; }\n        void push(int x) { Node n = new Node(x); n.next = head; head = n; sz++; }\n        int pop() { if (head == null) return -1; int v = head.val; head = head.next; sz--; return v; }\n        int peek() { return head == null ? -1 : head.val; }\n        boolean isEmpty() { return head == null; }\n        int size() { return sz; }\n    }\n}",
        csharp: "public class MyStack {\n    class Node { public int Val; public Node? Next; public Node(int v) => Val = v; }\n    Node? head; int sz;\n    public void Push(int x) { var n = new Node(x); n.Next = head; head = n; sz++; }\n    public int Pop() { if (head == null) return -1; int v = head.Val; head = head.Next; sz--; return v; }\n    public int Peek() => head?.Val ?? -1;\n    public bool IsEmpty() => head == null;\n    public int Size() => sz;\n}"
      } }
  ] },
  "a2z-228": { approaches: [
    { id: "ll-queue", title: "LinkedList with head/tail", level: "Optimal", time: "O(1) per op", space: "O(n)",
      explanation: "Enqueue at tail, dequeue from head using a linked list with both pointers.",
      code: {
        java: "class Solution {\n    static class MyQueue {\n        private static class Node { int val; Node next; Node(int v){val=v;} }\n        Node front, rear; int sz;\n        MyQueue() { front = rear = null; sz = 0; }\n        void enqueue(int x) { Node n = new Node(x); if (rear != null) rear.next = n; else front = n; rear = n; sz++; }\n        int dequeue() { if (front == null) return -1; int v = front.val; front = front.next; if (front == null) rear = null; sz--; return v; }\n        int peek() { return front == null ? -1 : front.val; }\n        boolean isEmpty() { return front == null; }\n    }\n}",
        csharp: "public class MyQueue {\n    class Node { public int Val; public Node? Next; public Node(int v) => Val = v; }\n    Node? front, rear; int sz;\n    public void Enqueue(int x) { var n = new Node(x); if (rear != null) rear.Next = n; else front = n; rear = n; sz++; }\n    public int Dequeue() { if (front == null) return -1; int v = front.Val; front = front.Next; if (front == null) rear = null; sz--; return v; }\n    public int Peek() => front?.Val ?? -1;\n    public bool IsEmpty() => front == null;\n}"
      } }
  ] },
  "a2z-229": { approaches: [
    { id: "stack-match", title: "Stack-based bracket matching", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Push opening brackets; on a closing bracket, check it matches the top of stack.",
      code: {
        java: "class Solution {\n    boolean isValid(String s) {\n        java.util.Deque<Character> st = new java.util.ArrayDeque<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(' || c == '[' || c == '{') st.push(c);\n            else {\n                if (st.isEmpty()) return false;\n                char top = st.pop();\n                if (c == ')' && top != '(') return false;\n                if (c == ']' && top != '[') return false;\n                if (c == '}' && top != '{') return false;\n            }\n        }\n        return st.isEmpty();\n    }\n}",
        csharp: "public class Solution {\n    public bool IsValid(string s) {\n        var st = new Stack<char>();\n        foreach (char c in s) {\n            if (c == '(' || c == '[' || c == '{') st.Push(c);\n            else {\n                if (st.Count == 0) return false;\n                char top = st.Pop();\n                if (c == ')' && top != '(') return false;\n                if (c == ']' && top != '[') return false;\n                if (c == '}' && top != '{') return false;\n            }\n        }\n        return st.Count == 0;\n    }\n}"
      } }
  ] },
  "a2z-230": { approaches: [
    { id: "min-stack-pair", title: "Store (val, currentMin) pairs", level: "Optimal", time: "O(1) all ops", space: "O(n)",
      explanation: "Each stack entry stores the pushed value AND the minimum up to that depth, so getMin is a simple peek.",
      code: {
        java: "class Solution {\n    static class MinStack {\n        java.util.Deque<int[]> st = new java.util.ArrayDeque<>();\n        void push(int val) {\n            int min = st.isEmpty() ? val : Math.min(val, st.peek()[1]);\n            st.push(new int[]{val, min});\n        }\n        void pop() { st.pop(); }\n        int top() { return st.peek()[0]; }\n        int getMin() { return st.peek()[1]; }\n    }\n}",
        csharp: "public class MinStack {\n    Stack<(int, int)> st = new();\n    public void Push(int val) { int min = st.Count == 0 ? val : System.Math.Min(val, st.Peek().Item2); st.Push((val, min)); }\n    public void Pop() => st.Pop();\n    public int Top() => st.Peek().Item1;\n    public int GetMin() => st.Peek().Item2;\n}"
      } }
  ] },
  "a2z-231": { approaches: [
    { id: "shunting-yard", title: "Shunting-yard for infix→postfix", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Scan left-to-right: operands go to output, operators pop higher/equal-precedence ops from the stack first.",
      code: {
        java: "class Solution {\n    String infixToPostfix(String s) {\n        StringBuilder out = new StringBuilder();\n        java.util.Deque<Character> st = new java.util.ArrayDeque<>();\n        for (char c : s.toCharArray()) {\n            if (Character.isLetterOrDigit(c)) out.append(c);\n            else if (c == '(') st.push(c);\n            else if (c == ')') { while (!st.isEmpty() && st.peek() != '(') out.append(st.pop()); st.pop(); }\n            else { while (!st.isEmpty() && prec(st.peek()) >= prec(c)) out.append(st.pop()); st.push(c); }\n        }\n        while (!st.isEmpty()) out.append(st.pop());\n        return out.toString();\n    }\n    int prec(char op) { switch (op) { case '+': case '-': return 1; case '*': case '/': return 2; case '^': return 3; default: return -1; } }\n}",
        csharp: "public class Solution {\n    public string InfixToPostfix(string s) {\n        var outp = new StringBuilder();\n        var st = new Stack<char>();\n        foreach (char c in s) {\n            if (char.IsLetterOrDigit(c)) outp.Append(c);\n            else if (c == '(') st.Push(c);\n            else if (c == ')') { while (st.Count > 0 && st.Peek() != '(') outp.Append(st.Pop()); st.Pop(); }\n            else { while (st.Count > 0 && Prec(st.Peek()) >= Prec(c)) outp.Append(st.Pop()); st.Push(c); }\n        }\n        while (st.Count > 0) outp.Append(st.Pop());\n        return outp.ToString();\n    }\n    int Prec(char op) => op switch { '+' or '-' => 1, '*' or '/' => 2, '^' => 3, _ => -1 };\n}"
      } }
  ] },
  "a2z-232": { approaches: [
    { id: "stack-infix", title: "Scan right-to-left with stack", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Traverse the prefix string right-to-left; push operands, pop two and combine with parentheses when an operator is found.",
      code: {
        java: "class Solution {\n    String prefixToInfix(String s) {\n        java.util.Deque<String> st = new java.util.ArrayDeque<>();\n        for (int i = s.length() - 1; i >= 0; i--) {\n            char c = s.charAt(i);\n            if (Character.isLetterOrDigit(c)) st.push(String.valueOf(c));\n            else {\n                String a = st.pop(), b = st.pop();\n                st.push(\"(\" + a + c + b + \")\");\n            }\n        }\n        return st.pop();\n    }\n}",
        csharp: "public class Solution {\n    public string PrefixToInfix(string s) {\n        var st = new Stack<string>();\n        for (int i = s.Length - 1; i >= 0; i--) {\n            char c = s[i];\n            if (char.IsLetterOrDigit(c)) st.Push(c.ToString());\n            else {\n                string a = st.Pop(), b = st.Pop();\n                st.Push(\"(\" + a + c + b + \")\");\n            }\n        }\n        return st.Pop();\n    }\n}"
      } }
  ] },
  "a2z-233": { approaches: [
    { id: "prefix-postfix-stack", title: "Right-to-left scan, postfix combine", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Traverse prefix right-to-left; for operators pop two operands and place operator at end (postfix form).",
      code: {
        java: "class Solution {\n    String prefixToPostfix(String s) {\n        java.util.Deque<String> st = new java.util.ArrayDeque<>();\n        for (int i = s.length() - 1; i >= 0; i--) {\n            char c = s.charAt(i);\n            if (Character.isLetterOrDigit(c)) st.push(String.valueOf(c));\n            else {\n                String a = st.pop(), b = st.pop();\n                st.push(a + b + c);\n            }\n        }\n        return st.pop();\n    }\n}",
        csharp: "public class Solution {\n    public string PrefixToPostfix(string s) {\n        var st = new Stack<string>();\n        for (int i = s.Length - 1; i >= 0; i--) {\n            char c = s[i];\n            if (char.IsLetterOrDigit(c)) st.Push(c.ToString());\n            else {\n                string a = st.Pop(), b = st.Pop();\n                st.Push(a + b + c);\n            }\n        }\n        return st.Pop();\n    }\n}"
      } }
  ] },
  "a2z-234": { approaches: [
    { id: "postfix-prefix-stack", title: "Left-to-right scan, prefix combine", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Traverse postfix left-to-right; for operators pop two operands and place operator at front (prefix form).",
      code: {
        java: "class Solution {\n    String postfixToPrefix(String s) {\n        java.util.Deque<String> st = new java.util.ArrayDeque<>();\n        for (char c : s.toCharArray()) {\n            if (Character.isLetterOrDigit(c)) st.push(String.valueOf(c));\n            else {\n                String b = st.pop(), a = st.pop();\n                st.push(c + a + b);\n            }\n        }\n        return st.pop();\n    }\n}",
        csharp: "public class Solution {\n    public string PostfixToPrefix(string s) {\n        var st = new Stack<string>();\n        foreach (char c in s) {\n            if (char.IsLetterOrDigit(c)) st.Push(c.ToString());\n            else {\n                string b = st.Pop(), a = st.Pop();\n                st.Push(c + a + b);\n            }\n        }\n        return st.Pop();\n    }\n}"
      } }
  ] },
  "a2z-235": { approaches: [
    { id: "postfix-infix-stack", title: "Left-to-right with parenthesized combine", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Traverse postfix left-to-right; pop two operands on operator and wrap in parentheses.",
      code: {
        java: "class Solution {\n    String postfixToInfix(String s) {\n        java.util.Deque<String> st = new java.util.ArrayDeque<>();\n        for (char c : s.toCharArray()) {\n            if (Character.isLetterOrDigit(c)) st.push(String.valueOf(c));\n            else {\n                String b = st.pop(), a = st.pop();\n                st.push(\"(\" + a + c + b + \")\");\n            }\n        }\n        return st.pop();\n    }\n}",
        csharp: "public class Solution {\n    public string PostfixToInfix(string s) {\n        var st = new Stack<string>();\n        foreach (char c in s) {\n            if (char.IsLetterOrDigit(c)) st.Push(c.ToString());\n            else {\n                string b = st.Pop(), a = st.Pop();\n                st.Push(\"(\" + a + c + b + \")\");\n            }\n        }\n        return st.Pop();\n    }\n}"
      } }
  ] },
  "a2z-236": { approaches: [
    { id: "infix-prefix-shunting", title: "Modified shunting-yard for prefix", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Reverse the infix (swap parens), apply postfix logic, then reverse the result.",
      code: {
        java: "class Solution {\n    String infixToPrefix(String s) {\n        StringBuilder rev = new StringBuilder(s);\n        rev.reverse();\n        char[] arr = rev.toString().toCharArray();\n        for (int i = 0; i < arr.length; i++) {\n            if (arr[i] == '(') arr[i] = ')';\n            else if (arr[i] == ')') arr[i] = '(';\n        }\n        String mod = new String(arr);\n        StringBuilder out = new StringBuilder();\n        java.util.Deque<Character> st = new java.util.ArrayDeque<>();\n        for (char c : mod.toCharArray()) {\n            if (Character.isLetterOrDigit(c)) out.append(c);\n            else if (c == '(') st.push(c);\n            else if (c == ')') { while (!st.isEmpty() && st.peek() != '(') out.append(st.pop()); st.pop(); }\n            else { while (!st.isEmpty() && prec(st.peek()) > prec(c)) out.append(st.pop()); st.push(c); }\n        }\n        while (!st.isEmpty()) out.append(st.pop());\n        return out.reverse().toString();\n    }\n    int prec(char op) { switch (op) { case '+': case '-': return 1; case '*': case '/': return 2; case '^': return 3; default: return -1; } }\n}",
        csharp: "public class Solution {\n    public string InfixToPrefix(string s) {\n        char[] arr = s.ToCharArray();\n        System.Array.Reverse(arr);\n        for (int i = 0; i < arr.Length; i++) {\n            if (arr[i] == '(') arr[i] = ')';\n            else if (arr[i] == ')') arr[i] = '(';\n        }\n        var outp = new StringBuilder();\n        var st = new Stack<char>();\n        foreach (char c in new string(arr)) {\n            if (char.IsLetterOrDigit(c)) outp.Append(c);\n            else if (c == '(') st.Push(c);\n            else if (c == ')') { while (st.Count > 0 && st.Peek() != '(') outp.Append(st.Pop()); st.Pop(); }\n            else { while (st.Count > 0 && Prec(st.Peek()) > Prec(c)) outp.Append(st.Pop()); st.Push(c); }\n        }\n        while (st.Count > 0) outp.Append(st.Pop());\n        char[] res = outp.ToString().ToCharArray();\n        System.Array.Reverse(res);\n        return new string(res);\n    }\n    int Prec(char op) => op switch { '+' or '-' => 1, '*' or '/' => 2, '^' => 3, _ => -1 };\n}"
      } }
  ] },
  "a2z-237": { approaches: [
    { id: "monotone-stack", title: "Decreasing monotone stack", level: "Optimal", time: "O(n)", space: "O(n)",
      explanation: "Traverse right-to-left, maintain a decreasing stack; the next greater for each element is the first larger value above it.",
      code: {
        java: "class Solution {\n    int[] nextGreater(int[] nums) {\n        int n = nums.length;\n        int[] res = new int[n];\n        java.util.Deque<Integer> st = new java.util.ArrayDeque<>();\n        for (int i = n - 1; i >= 0; i--) {\n            while (!st.isEmpty() && st.peek() <= nums[i]) st.pop();\n            res[i] = st.isEmpty() ? -1 : st.peek();\n            st.push(nums[i]);\n        }\n        return res;\n    }\n}",
        csharp: "public class Solution {\n    public int[] NextGreater(int[] nums) {\n        int n = nums.Length;\n        int[] res = new int[n];\n        var st = new Stack<int>();\n        for (int i = n - 1; i >= 0; i--) {\n            while (st.Count > 0 && st.Peek() <= nums[i]) st.Pop();\n            res[i] = st.Count == 0 ? -1 : st.Peek();\n            st.Push(nums[i]);\n        }\n        return res;\n    }\n}"
      } }
  ] }
};
