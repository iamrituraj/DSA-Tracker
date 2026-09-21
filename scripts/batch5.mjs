export default {
  "a2z-168": { approaches: [
    { id: "merge-sort", title: "Merge sort on the list", level: "Optimal", time: "O(n log n)", space: "O(log n)",
      explanation: "Split at the middle with slow/fast, sort each half, then merge two sorted lists — the standard linked-list merge sort.",
      code: {
        java: "class Solution {\n    ListNode sortList(ListNode head) {\n        if (head == null || head.next == null) return head;\n        ListNode slow = head, fast = head.next;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n        }\n        ListNode mid = slow.next;\n        slow.next = null;\n        return merge(sortList(head), sortList(mid));\n    }\n    ListNode merge(ListNode a, ListNode b) {\n        ListNode d = new ListNode(0), t = d;\n        while (a != null && b != null) {\n            if (a.val <= b.val) { t.next = a; a = a.next; }\n            else { t.next = b; b = b.next; }\n            t = t.next;\n        }\n        t.next = a != null ? a : b;\n        return d.next;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode SortList(ListNode head) {\n        if (head == null || head.next == null) return head;\n        ListNode slow = head, fast = head.next;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n        }\n        ListNode mid = slow.next;\n        slow.next = null;\n        return Merge(SortList(head), SortList(mid));\n    }\n    ListNode Merge(ListNode a, ListNode b) {\n        ListNode d = new ListNode(0), t = d;\n        while (a != null && b != null) {\n            if (a.val <= b.val) { t.next = a; a = a.next; }\n            else { t.next = b; b = b.next; }\n            t = t.next;\n        }\n        t.next = a != null ? a : b;\n        return d.next;\n    }\n}"
      } }
  ] },
  "a2z-169": { approaches: [
    { id: "count-overwrite", title: "Count 0/1/2 then rewrite values", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Count each digit, then overwrite node values in order — the list becomes sorted without relinking.",
      code: {
        java: "class Solution {\n    ListNode sortList(ListNode head) {\n        int[] cnt = new int[3];\n        for (ListNode p = head; p != null; p = p.next) cnt[p.val]++;\n        int i = 0;\n        for (ListNode p = head; p != null; p = p.next) {\n            while (cnt[i] == 0) i++;\n            p.val = i;\n            cnt[i]--;\n        }\n        return head;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode SortList(ListNode head) {\n        int[] cnt = new int[3];\n        for (ListNode p = head; p != null; p = p.next) cnt[p.val]++;\n        int i = 0;\n        for (ListNode p = head; p != null; p = p.next) {\n            while (cnt[i] == 0) i++;\n            p.val = i;\n            cnt[i]--;\n        }\n        return head;\n    }\n}"
      } }
  ] },
  "a2z-170": { approaches: [
    { id: "two-pointer-switch", title: "Swap to the other head at the end", level: "Optimal", time: "O(m + n)", space: "O(1)",
      explanation: "Each pointer walks its own list then the other's; they meet at the intersection because both cover the same total distance.",
      code: {
        java: "class Solution {\n    ListNode getIntersectionNode(ListNode a, ListNode b) {\n        if (a == null || b == null) return null;\n        ListNode p = a, q = b;\n        while (p != q) {\n            p = p == null ? a : p.next;\n            q = q == null ? b : q.next;\n        }\n        return p;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode GetIntersectionNode(ListNode a, ListNode b) {\n        if (a == null || b == null) return null;\n        ListNode p = a, q = b;\n        while (p != q) {\n            p = p == null ? a : p.next;\n            q = q == null ? b : q.next;\n        }\n        return p;\n    }\n}"
      } }
  ] },
  "a2z-171": { approaches: [
    { id: "reverse-add-reverse", title: "Reverse, add carry, reverse back", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Reverse so the least significant digit is first, add 1 propagating the carry, then reverse back to restore order.",
      code: {
        java: "class Solution {\n    ListNode addOne(ListNode head) {\n        head = reverse(head);\n        ListNode dummy = new ListNode(0);\n        dummy.next = head;\n        ListNode cur = head;\n        int carry = 1;\n        while (cur != null) {\n            int sum = cur.val + carry;\n            cur.val = sum % 10;\n            carry = sum / 10;\n            if (carry == 0) break;\n            if (cur.next == null) { cur.next = new ListNode(carry); carry = 0; }\n            cur = cur.next;\n        }\n        return reverse(dummy.next);\n    }\n    ListNode reverse(ListNode h) {\n        ListNode prev = null;\n        while (h != null) {\n            ListNode n = h.next; h.next = prev; prev = h; h = n;\n        }\n        return prev;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode AddOne(ListNode head) {\n        head = Reverse(head);\n        ListNode cur = head;\n        int carry = 1;\n        ListNode prev = null;\n        while (cur != null) {\n            int sum = cur.val + carry;\n            cur.val = sum % 10;\n            carry = sum / 10;\n            prev = cur;\n            cur = cur.next;\n        }\n        if (carry > 0) prev.next = new ListNode(carry);\n        return Reverse(head);\n    }\n    ListNode Reverse(ListNode h) {\n        ListNode prev = null;\n        while (h != null) {\n            ListNode n = h.next; h.next = prev; prev = h; h = n;\n        }\n        return prev;\n    }\n}"
      } }
  ] },
  "a2z-172": { approaches: [
    { id: "digit-wise-carry", title: "Add digit by digit with carry", level: "Optimal", time: "O(max(m,n))", space: "O(1)",
      explanation: "Digits are stored least-significant-first, so walk both lists summing with a running carry and build the result list.",
      code: {
        java: "class Solution {\n    ListNode addTwoNumbers(ListNode a, ListNode b) {\n        ListNode d = new ListNode(0), t = d;\n        int carry = 0;\n        while (a != null || b != null || carry != 0) {\n            int sum = carry;\n            if (a != null) { sum += a.val; a = a.next; }\n            if (b != null) { sum += b.val; b = b.next; }\n            carry = sum / 10;\n            t.next = new ListNode(sum % 10);\n            t = t.next;\n        }\n        return d.next;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode AddTwoNumbers(ListNode a, ListNode b) {\n        ListNode d = new ListNode(0), t = d;\n        int carry = 0;\n        while (a != null || b != null || carry != 0) {\n            int sum = carry;\n            if (a != null) { sum += a.val; a = a.next; }\n            if (b != null) { sum += b.val; b = b.next; }\n            carry = sum / 10;\n            t.next = new ListNode(sum % 10);\n            t = t.next;\n        }\n        return d.next;\n    }\n}"
      } }
  ] },
  "a2z-173": { approaches: [
    { id: "walk-with-prev", title: "Unlink every matching node", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Use a dummy head; whenever a node's value equals key, bridge prev.next past it and fix the successor's prev.",
      code: {
        java: "class Solution {\n    DNode removeAllOccurrences(DNode head, int key) {\n        DNode dummy = new DNode(0);\n        dummy.next = head;\n        DNode prev = dummy;\n        DNode cur = head;\n        while (cur != null) {\n            DNode nxt = cur.next;\n            if (cur.val == key) {\n                prev.next = nxt;\n                if (nxt != null) nxt.prev = prev;\n            } else prev = cur;\n            cur = nxt;\n        }\n        DNode nh = dummy.next;\n        if (nh != null) nh.prev = null;\n        return nh;\n    }\n}",
        csharp: "public class Solution {\n    public DNode RemoveAllOcc(DNode head, int key) {\n        DNode dummy = new DNode(0);\n        dummy.next = head;\n        DNode prev = dummy;\n        DNode cur = head;\n        while (cur != null) {\n            DNode nxt = cur.next;\n            if (cur.val == key) {\n                prev.next = nxt;\n                if (nxt != null) nxt.prev = prev;\n            } else prev = cur;\n            cur = nxt;\n        }\n        DNode nh = dummy.next;\n        if (nh != null) nh.prev = null;\n        return nh;\n    }\n}"
      } }
  ] },
  "a2z-174": { approaches: [
    { id: "two-pointer-sum", title: "Head/tail two pointers", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "List is sorted; walk a forward and a backward pointer, counting pairs whose value sums to x.",
      code: {
        java: "class Solution {\n    int countPairs(DNode head, int x) {\n        if (head == null) return 0;\n        DNode last = head;\n        while (last.next != null) last = last.next;\n        int count = 0;\n        DNode a = head, b = last;\n        while (a != null && b != null && a != b && b.next != a) {\n            int sum = a.val + b.val;\n            if (sum == x) {\n                count++;\n                a = a.next;\n                b = b.prev;\n            } else if (sum < x) a = a.next;\n            else b = b.prev;\n        }\n        return count;\n    }\n}",
        csharp: "public class Solution {\n    public int CountPairs(DNode head, int x) {\n        if (head == null) return 0;\n        DNode last = head;\n        while (last.next != null) last = last.next;\n        int count = 0;\n        DNode a = head, b = last;\n        while (a != null && b != null && a != b && b.next != a) {\n            int sum = a.val + b.val;\n            if (sum == x) {\n                count++;\n                a = a.next;\n                b = b.prev;\n            } else if (sum < x) a = a.next;\n            else b = b.prev;\n        }\n        return count;\n    }\n}"
      } }
  ] },
  "a2z-175": { approaches: [
    { id: "skip-equal-next", title: "Advance past equal neighbours", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "For a sorted DLL, repeatedly move next past nodes equal to the current value.",
      code: {
        java: "class Solution {\n    DNode removeDuplicates(DNode head) {\n        DNode cur = head;\n        while (cur != null && cur.next != null) {\n            if (cur.val == cur.next.val) {\n                DNode dup = cur.next;\n                cur.next = dup.next;\n                if (dup.next != null) dup.next.prev = cur;\n            } else cur = cur.next;\n        }\n        return head;\n    }\n}",
        csharp: "public class Solution {\n    public DNode RemoveDuplicates(DNode head) {\n        DNode cur = head;\n        while (cur != null && cur.next != null) {\n            if (cur.val == cur.next.val) {\n                DNode dup = cur.next;\n                cur.next = dup.next;\n                if (dup.next != null) dup.next.prev = cur;\n            } else cur = cur.next;\n        }\n        return head;\n    }\n}"
      } }
  ] },
  "a2z-176": { approaches: [
    { id: "reverse-group", title: "Reverse each block of K", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Check K nodes remain, reverse that block, relink it into the previous tail, and continue from the block's new end.",
      code: {
        java: "class Solution {\n    ListNode reverseKGroup(ListNode head, int k) {\n        ListNode dummy = new ListNode(0);\n        dummy.next = head;\n        ListNode groupPrev = dummy;\n        while (true) {\n            ListNode kth = groupPrev;\n            for (int i = 0; i < k && kth != null; i++) kth = kth.next;\n            if (kth == null) break;\n            ListNode groupNext = kth.next;\n            ListNode prev = groupNext, cur = groupPrev.next;\n            while (cur != groupNext) {\n                ListNode n = cur.next;\n                cur.next = prev;\n                prev = cur;\n                cur = n;\n            }\n            ListNode tmp = groupPrev.next;\n            groupPrev.next = kth;\n            groupPrev = tmp;\n        }\n        return dummy.next;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode ReverseKGroup(ListNode head, int k) {\n        ListNode dummy = new ListNode(0);\n        dummy.next = head;\n        ListNode groupPrev = dummy;\n        while (true) {\n            ListNode kth = groupPrev;\n            for (int i = 0; i < k && kth != null; i++) kth = kth.next;\n            if (kth == null) break;\n            ListNode groupNext = kth.next;\n            ListNode prev = groupNext, cur = groupPrev.next;\n            while (cur != groupNext) {\n                ListNode n = cur.next;\n                cur.next = prev;\n                prev = cur;\n                cur = n;\n            }\n            ListNode tmp = groupPrev.next;\n            groupPrev.next = kth;\n            groupPrev = tmp;\n        }\n        return dummy.next;\n    }\n}"
      } }
  ] },
  "a2z-177": { approaches: [
    { id: "loop-and-break", title: "Form a ring then cut at k", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Compute the length, join tail to head to make a cycle, then advance (n - k) steps and break there as the new tail.",
      code: {
        java: "class Solution {\n    ListNode rotateRight(ListNode head, int k) {\n        if (head == null || head.next == null || k == 0) return head;\n        int n = 1;\n        ListNode tail = head;\n        while (tail.next != null) {\n            tail = tail.next;\n            n++;\n        }\n        k %= n;\n        if (k == 0) return head;\n        tail.next = head;\n        ListNode newTail = head;\n        for (int i = 1; i < n - k; i++) newTail = newTail.next;\n        ListNode newHead = newTail.next;\n        newTail.next = null;\n        return newHead;\n    }\n}",
        csharp: "public class Solution {\n    public ListNode RotateRight(ListNode head, int k) {\n        if (head == null || head.next == null || k == 0) return head;\n        int n = 1;\n        ListNode tail = head;\n        while (tail.next != null) {\n            tail = tail.next;\n            n++;\n        }\n        k %= n;\n        if (k == 0) return head;\n        tail.next = head;\n        ListNode newTail = head;\n        for (int i = 1; i < n - k; i++) newTail = newTail.next;\n        ListNode newHead = newTail.next;\n        newTail.next = null;\n        return newHead;\n    }\n}"
      } }
  ] },
  "a2z-178": { approaches: [
    { id: "merge-bottom-wise", title: "Merge the lists bottom-wise", level: "Optimal", time: "O(N log L)", space: "O(1)",
      explanation: "Repeatedly merge each level's vertical sorted list into the accumulated result using the bottom pointer, keeping one flat sorted list.",
      code: {
        java: "class Solution {\n    FNode flatten(FNode root) {\n        if (root == null || root.next == null) return root;\n        root.next = flatten(root.next);\n        root = merge(root, root.next);\n        root.next = null;\n        return root;\n    }\n    FNode merge(FNode a, FNode b) {\n        FNode d = new FNode(0), t = d;\n        while (a != null && b != null) {\n            if (a.data <= b.data) { t.bottom = a; a = a.bottom; }\n            else { t.bottom = b; b = b.bottom; }\n            t = t.bottom;\n        }\n        t.bottom = a != null ? a : b;\n        return d.bottom;\n    }\n}",
        csharp: "public class Solution {\n    public FNode Flatten(FNode root) {\n        if (root == null || root.next == null) return root;\n        root.next = Flatten(root.next);\n        root = Merge(root, root.next);\n        root.next = null;\n        return root;\n    }\n    FNode Merge(FNode a, FNode b) {\n        FNode d = new FNode(0), t = d;\n        while (a != null && b != null) {\n            if (a.data <= b.data) { t.bottom = a; a = a.bottom; }\n            else { t.bottom = b; b = b.bottom; }\n            t = t.bottom;\n        }\n        t.bottom = a != null ? a : b;\n        return d.bottom;\n    }\n}"
      } }
  ] },
  "a2z-179": { approaches: [
    { id: "weave-map", title: "Interleave copies, then split", level: "Optimal", time: "O(n)", space: "O(1)",
      explanation: "Insert a copy after each original node, wire copy.random via the neighbour, then unweave the two lists.",
      code: {
        java: "class Solution {\n    RNode copyRandomList(RNode head) {\n        if (head == null) return null;\n        for (RNode cur = head; cur != null; cur = cur.next.next) {\n            RNode copy = new RNode(cur.data);\n            copy.next = cur.next;\n            cur.next = copy;\n        }\n        for (RNode cur = head; cur != null; cur = cur.next.next)\n            if (cur.random != null) cur.next.random = cur.random.next;\n        RNode newHead = head.next;\n        for (RNode cur = head; cur != null; cur = cur.next) {\n            RNode copy = cur.next;\n            cur.next = copy.next;\n            if (copy.next != null) copy.next = copy.next.next;\n        }\n        return newHead;\n    }\n}",
        csharp: "public class Solution {\n    public RNode CopyRandomList(RNode head) {\n        if (head == null) return null;\n        RNode cur = head;\n        while (cur != null) {\n            RNode copy = new RNode(cur.data);\n            copy.next = cur.next;\n            cur.next = copy;\n            cur = copy.next;\n        }\n        cur = head;\n        while (cur != null) {\n            if (cur.random != null) cur.next.random = cur.random.next;\n            cur = cur.next.next;\n        }\n        RNode newHead = head.next;\n        cur = head;\n        while (cur != null) {\n            RNode copy = cur.next;\n            cur.next = copy.next;\n            if (copy.next != null) copy.next = copy.next.next;\n            cur = cur.next;\n        }\n        return newHead;\n    }\n}"
      } }
  ] }
};
