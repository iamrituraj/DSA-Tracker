export default {
  "a2z-150": { approaches: [
    { id: "insert-head", title: "Point the new node at the old head", level: "Optimal", time: "O(1)", space: "O(1)",
      explanation: "Create the node, link its next to the current head, and return it as the new head.",
      code: {
        java: "class Solution {\n    ListNode insertAtHead(int x, ListNode head) {\n        ListNode node = new ListNode(x);\n        node.next = head;\n        return node;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode InsertAtHead(int x, ListNode head) {\n        ListNode node = new ListNode(x);\n        node.next = head;\n        return node;\n    }\n}"
      } }
  ] },
  "a2z-151": { approaches: [
    { id: "delete-head", title: "Return the second node", level: "Optimal", time: "O(1)", space: "O(1)",
      explanation: "The new head is simply head.next; guard against an empty list.",
      code: {
        java: "class Solution {\n    ListNode deleteHead(ListNode head) {\n        if (head == null) return null;\n        return head.next;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode DeleteHead(ListNode head) {\n        if (head == null) return null;\n        return head.next;\n    }\n}"
      } }
  ] },
  "a2z-152": { approaches: [
    { id: "walk-count", title: "Walk and count nodes", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Traverse next pointers until null, incrementing a counter.",
      code: {
        java: "class Solution {\n    int length(ListNode head) {\n        int c = 0;\n        for (ListNode p = head; p != null; p = p.next) c++;\n        return c;\n    }\n}",
        csharp: "public class Solution {\n    public int Length(ListNode head) {\n        int c = 0;\n        for (ListNode p = head; p != null; p = p.next) c++;\n        return c;\n    }\n}"
      } }
  ] },
  "a2z-153": { approaches: [
    { id: "linear-search", title: "Linear search for the key", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Compare each node's value to key; return true on the first match.",
      code: {
        java: "class Solution {\n    boolean search(ListNode head, int key) {\n        for (ListNode p = head; p != null; p = p.next)\n            if (p.val == key) return true;\n        return false;\n    }\n}",
        csharp: "public class Solution {\n    public bool Search(ListNode head, int key) {\n        for (ListNode p = head; p != null; p = p.next)\n            if (p.val == key) return true;\n        return false;\n    }\n}"
      } }
  ] },
  "a2z-155": { approaches: [
    { id: "dll-push-front", title: "Insert before the DLL head", level: "Optimal", time: "O(1)", space: "O(1)",
      explanation: "Link the new node's next to the old head, fix the old head's prev, and return the new head.",
      code: {
        java: "class Solution {\n    DNode insertBeforeHead(int x, DNode head) {\n        DNode node = new DNode(x);\n        node.next = head;\n        if (head != null) head.prev = node;\n        return node;\n    }\n}",
        csharp: "public class Solution {\n    public DNode InsertBeforeHead(int x, DNode head) {\n        DNode node = new DNode(x);\n        node.next = head;\n        if (head != null) head.prev = node;\n        return node;\n    }\n}"
      } }
  ] },
  "a2z-156": { approaches: [
    { id: "dll-delete-head", title: "Advance the DLL head", level: "Optimal", time: "O(1)", space: "O(1)",
      explanation: "Move to head.next and clear its prev pointer so it becomes the new head.",
      code: {
        java: "class Solution {\n    DNode deleteHead(DNode head) {\n        if (head == null || head.next == null) return null;\n        DNode newHead = head.next;\n        newHead.prev = null;\n        return newHead;\n    }\n}",
        csharp: "public class Solution {\n    public DNode DeleteHead(DNode head) {\n        if (head == null || head.next == null) return null;\n        DNode newHead = head.next;\n        newHead.prev = null;\n        return newHead;\n    }\n}"
      } }
  ] },
  "a2z-157": { approaches: [
    { id: "swap-pointers", title: "Swap prev/next on every node", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "For each node exchange its prev and next links; the reversed list's head is the last node visited.",
      code: {
        java: "class Solution {\n    DNode reverse(DNode head) {\n        DNode cur = head, newHead = null;\n        while (cur != null) {\n            DNode prev = cur.prev;\n            cur.prev = cur.next;\n            cur.next = prev;\n            if (cur.prev == null) newHead = cur;\n            cur = cur.prev;\n        }\n        return newHead;\n    }\n}",
        csharp: "public class Solution {\n    public DNode Reverse(DNode head) {\n        DNode cur = head, newHead = null;\n        while (cur != null) {\n            DNode prev = cur.prev;\n            cur.prev = cur.next;\n            cur.next = prev;\n            if (cur.prev == null) newHead = cur;\n            cur = cur.prev;\n        }\n        return newHead;\n    }\n}"
      } }
  ] },
  "a2z-158": { approaches: [
    { id: "tortoise-hare", title: "Slow/fast pointers", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Advance fast two steps and slow one; when fast hits the end, slow is at the middle.",
      code: {
        java: "class Solution {\n    ListNode middleNode(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n        }\n        return slow;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode MiddleNode(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n        }\n        return slow;\n    }\n}"
      } }
  ] },
  "a2z-159": { approaches: [
    { id: "iterative-reverse", title: "Iterative three-pointer reverse", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Walk prev/curr/next, re-pointing curr.next to prev as you advance.",
      code: {
        java: "class Solution {\n    ListNode reverseList(ListNode head) {\n        ListNode prev = null, cur = head;\n        while (cur != null) {\n            ListNode nxt = cur.next;\n            cur.next = prev;\n            prev = cur;\n            cur = nxt;\n        }\n        return prev;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode ReverseList(ListNode head) {\n        ListNode prev = null, cur = head;\n        while (cur != null) {\n            ListNode nxt = cur.next;\n            cur.next = prev;\n            prev = cur;\n            cur = nxt;\n        }\n        return prev;\n    }\n}"
      } }
  ] },
  "a2z-160": { approaches: [
    { id: "recursive-reverse", title: "Recursive reverse", level: "Optimal", time: "O(n)", space: "O(n) stack",
      explanation: "Recurse to the tail, then on unwind make the next node point back to the current one and cut the forward link.",
      code: {
        java: "class Solution {\n    ListNode reverseList(ListNode head) {\n        if (head == null || head.next == null) return head;\n        ListNode newHead = reverseList(head.next);\n        head.next.next = head;\n        head.next = null;\n        return newHead;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode ReverseList(ListNode head) {\n        if (head == null || head.next == null) return head;\n        ListNode newHead = ReverseList(head.next);\n        head.next.next = head;\n        head.next = null;\n        return newHead;\n    }\n}"
      } }
  ] },
  "a2z-161": { approaches: [
    { id: "hash-set", title: "Visited-node set", level: "Brute", time: "O(n)", space: "O(n)",
      explanation: "Store seen node references; revisiting one proves a loop.",
      code: {
        java: "class Solution {\n    boolean hasLoop(ListNode head) {\n        java.util.Set<ListNode> seen = new java.util.HashSet<>();\n        for (ListNode p = head; p != null; p = p.next)\n            if (!seen.add(p)) return true;\n        return false;\n    }\n}",
        csharp: "public class Solution {\n    public bool HasLoop(ListNode head) {\n        var seen = new System.Collections.Generic.HashSet<ListNode>();\n        for (ListNode p = head; p != null; p = p.next)\n            if (!seen.Add(p)) return true;\n        return false;\n    }\n}"
      } },
    { id: "floyd", title: "Floyd cycle detection", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "If the slow and fast pointers ever meet, a cycle exists; if fast reaches null there is none.",
      code: {
        java: "class Solution {\n    boolean hasLoop(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n            if (slow == fast) return true;\n        }\n        return false;\n    }\n}",
        csharp: "public class Solution {\n    public bool HasLoop(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n            if (slow == fast) return true;\n        }\n        return false;\n    }\n}"
      } }
  ] },
  "a2z-162": { approaches: [
    { id: "floyd-reset", title: "Floyd then reset to the entry", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "After meeting inside the loop, move one pointer back to head and advance both one step; they meet at the loop's start.",
      code: {
        java: "class Solution {\n    ListNode detectCycle(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n            if (slow == fast) {\n                slow = head;\n                while (slow != fast) {\n                    slow = slow.next;\n                    fast = fast.next;\n                }\n                return slow;\n            }\n        }\n        return null;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode DetectCycle(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n            if (slow == fast) {\n                slow = head;\n                while (slow != fast) {\n                    slow = slow.next;\n                    fast = fast.next;\n                }\n                return slow;\n            }\n        }\n        return null;\n    }\n}"
      } }
  ] },
  "a2z-163": { approaches: [
    { id: "floyd-count", title: "Count nodes around the cycle", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Once slow and fast meet, keep walking fast until it returns to the meeting point, counting the loop length.",
      code: {
        java: "class Solution {\n    int loopLength(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n            if (slow == fast) {\n                int len = 1;\n                while (fast.next != slow) {\n                    len++;\n                    fast = fast.next;\n                }\n                return len;\n            }\n        }\n        return 0;\n    }\n}",
        csharp: "public class Solution {\n    public int LoopLength(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n            if (slow == fast) {\n                int len = 1;\n                while (fast.next != slow) {\n                    len++;\n                    fast = fast.next;\n                }\n                return len;\n            }\n        }\n        return 0;\n    }\n}"
      } }
  ] },
  "a2z-164": { approaches: [
    { id: "reverse-half", title: "Reverse the second half and compare", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Find the middle, reverse the back half, then compare it node-by-node with the front half.",
      code: {
        java: "class Solution {\n    boolean isPalindrome(ListNode head) {\n        if (head == null) return true;\n        ListNode slow = head, fast = head;\n        while (fast.next != null && fast.next.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n        }\n        ListNode second = reverse(slow.next), p = head, q = second;\n        boolean ok = true;\n        while (q != null) {\n            if (p.val != q.val) { ok = false; break; }\n            p = p.next; q = q.next;\n        }\n        slow.next = reverse(second);\n        return ok;\n    }\n    ListNode reverse(ListNode h) {\n        ListNode prev = null;\n        while (h != null) {\n            ListNode n = h.next; h.next = prev; prev = h; h = n;\n        }\n        return prev;\n    }\n}",
        csharp: "public class Solution {\n    public bool IsPalindrome(ListNode head) {\n        if (head == null) return true;\n        ListNode slow = head, fast = head;\n        while (fast.next != null && fast.next.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n        }\n        ListNode second = Reverse(slow.next), p = head, q = second;\n        bool ok = true;\n        while (q != null) {\n            if (p.val != q.val) { ok = false; break; }\n            p = p.next; q = q.next;\n        }\n        slow.next = Reverse(second);\n        return ok;\n    }\n    ListNode Reverse(ListNode h) {\n        ListNode prev = null;\n        while (h != null) {\n            ListNode n = h.next; h.next = prev; prev = h; h = n;\n        }\n        return prev;\n    }\n}"
      } }
  ] },
  "a2z-165": { approaches: [
    { id: "two-chains", title: "Split into odd/even chains then join", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Build one list of odd-valued nodes and one of even-valued nodes, then concatenate them.",
      code: {
        java: "class Solution {\n    ListNode segregateOddEven(ListNode head) {\n        ListNode oDummy = new ListNode(0), eDummy = new ListNode(0);\n        ListNode o = oDummy, e = eDummy;\n        for (ListNode p = head; p != null; ) {\n            ListNode nxt = p.next;\n            p.next = null;\n            if (p.val % 2 == 1) { o.next = p; o = o.next; }\n            else { e.next = p; e = e.next; }\n            p = nxt;\n        }\n        o.next = eDummy.next;\n        return oDummy.next;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode SegregateOddEven(ListNode head) {\n        ListNode oDummy = new ListNode(0), eDummy = new ListNode(0);\n        ListNode o = oDummy, e = eDummy;\n        for (ListNode p = head; p != null; ) {\n            ListNode nxt = p.next;\n            p.next = null;\n            if (p.val % 2 == 1) { o.next = p; o = o.next; }\n            else { e.next = p; e = e.next; }\n            p = nxt;\n        }\n        o.next = eDummy.next;\n        return oDummy.next;\n    }\n}"
      } }
  ] },
  "a2z-166": { approaches: [
    { id: "two-pointer-gap", title: "Lead pointer n ahead", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Advance a fast pointer n+1 steps past a dummy head, then move both until fast ends; slow.next is the node to remove.",
      code: {
        java: "class Solution {\n    ListNode removeNthFromEnd(ListNode head, int n) {\n        ListNode dummy = new ListNode(0);\n        dummy.next = head;\n        ListNode fast = dummy, slow = dummy;\n        for (int i = 0; i <= n; i++) fast = fast.next;\n        while (fast != null) {\n            slow = slow.next;\n            fast = fast.next;\n        }\n        slow.next = slow.next.next;\n        return dummy.next;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode RemoveNthFromEnd(ListNode head, int n) {\n        ListNode dummy = new ListNode(0);\n        dummy.next = head;\n        ListNode fast = dummy, slow = dummy;\n        for (int i = 0; i <= n; i++) fast = fast.next;\n        while (fast != null) {\n            slow = slow.next;\n            fast = fast.next;\n        }\n        slow.next = slow.next.next;\n        return dummy.next;\n    }\n}"
      } }
  ] },
  "a2z-167": { approaches: [
    { id: "tortoise-hare-prev", title: "Find the node before the middle", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Use a slow/fast pair with a prev tracker; when fast finishes, prev precedes the middle, so skip it.",
      code: {
        java: "class Solution {\n    ListNode deleteMiddle(ListNode head) {\n        if (head == null || head.next == null) return null;\n        ListNode slow = head, fast = head, prev = null;\n        while (fast != null && fast.next != null) {\n            prev = slow;\n            slow = slow.next;\n            fast = fast.next.next;\n        }\n        prev.next = slow.next;\n        return head;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode DeleteMiddle(ListNode head) {\n        if (head == null || head.next == null) return null;\n        ListNode slow = head, fast = head, prev = null;\n        while (fast != null && fast.next != null) {\n            prev = slow;\n            slow = slow.next;\n            fast = fast.next.next;\n        }\n        prev.next = slow.next;\n        return head;\n    }\n}"
      } }
  ] }
};
