// Shared node-type stubs so linked-list / tree snippets compile standalone.
export const STUBS = {
  ListNode: "class ListNode { int val; ListNode next; ListNode(int v) { val = v; } }",
  DNode: "class DNode { int val; DNode prev, next; DNode(int v) { val = v; } }",
  RNode: "class RNode { int data; RNode next, random; RNode(int v) { data = v; } }",
  FNode: "class FNode { int data; FNode next, bottom; FNode(int v) { data = v; } }",
  TreeNode: "class TreeNode { int val; TreeNode left, right; TreeNode(int v) { val = v; } }",
};
