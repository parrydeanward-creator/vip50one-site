import type { BusinessGraph, GraphEdge, GraphNode } from "./types.ts";

// Read-only helpers over the business graph. No layout, no drawing.

export interface GraphIndex {
  graph: BusinessGraph;
  byId: Map<string, GraphNode>;
  children: Map<string, GraphNode[]>; // sorted by importance, highest first
  links: Map<string, GraphEdge[]>; // non-tree edges touching a node
}

export function indexGraph(graph: BusinessGraph): GraphIndex {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const children = new Map<string, GraphNode[]>();
  for (const n of graph.nodes) {
    if (!n.parentId) continue;
    const list = children.get(n.parentId) ?? [];
    list.push(n);
    children.set(n.parentId, list);
  }
  for (const list of children.values()) list.sort((a, b) => b.importance - a.importance);
  const links = new Map<string, GraphEdge[]>();
  for (const e of graph.edges) {
    if (e.relationshipType === "belongs_to") continue;
    for (const id of [e.source, e.target]) {
      const list = links.get(id) ?? [];
      list.push(e);
      links.set(id, list);
    }
  }
  return { graph, byId, children, links };
}

export function node(ix: GraphIndex, id: string): GraphNode {
  const n = ix.byId.get(id);
  if (!n) throw new Error(`unknown node ${id}`);
  return n;
}

export function childrenOf(ix: GraphIndex, id: string): GraphNode[] {
  return ix.children.get(id) ?? [];
}

// Root first, `id` last.
export function pathTo(ix: GraphIndex, id: string): GraphNode[] {
  const out: GraphNode[] = [];
  let cur: GraphNode | undefined = ix.byId.get(id);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.unshift(cur);
    cur = cur.parentId ? ix.byId.get(cur.parentId) : undefined;
  }
  return out;
}

export function depth(ix: GraphIndex, id: string): number {
  return pathTo(ix, id).length - 1;
}

export type Role = "focus" | "child" | "ancestor" | "sibling" | "related";

export interface VisibleNode {
  node: GraphNode;
  role: Role;
  order: number; // position within its role
  hasChildren: boolean;
}

export interface VisibleSet {
  focus: GraphNode;
  nodes: VisibleNode[];
  edges: { source: string; target: string; kind: "tree" | "link" }[];
  hiddenChildren: number; // children beyond the budget
}

export interface Budget {
  children: number;
  siblings: number;
  related: number;
  ancestors: number;
}

export const DESKTOP_BUDGET: Budget = { children: 12, siblings: 8, related: 4, ancestors: 4 };
export const PHONE_BUDGET: Budget = { children: 6, siblings: 0, related: 2, ancestors: 1 };

// Presentation's question: what should be on screen when `focusId` is
// focused? Never the whole graph (ONE-BRAIN.md §3, progressive disclosure).
export function visibleSet(ix: GraphIndex, focusId: string, budget: Budget): VisibleSet {
  const focus = node(ix, focusId);
  const out: VisibleNode[] = [];
  const seen = new Set<string>();
  const push = (n: GraphNode, role: Role, order: number) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    out.push({ node: n, role, order, hasChildren: childrenOf(ix, n.id).length > 0 });
  };

  push(focus, "focus", 0);
  const kids = childrenOf(ix, focus.id);
  kids.slice(0, budget.children).forEach((n, i) => push(n, "child", i));

  const ancestors = pathTo(ix, focus.id).slice(0, -1).reverse(); // nearest first
  ancestors.slice(0, budget.ancestors).forEach((n, i) => push(n, "ancestor", i));

  if (focus.parentId) {
    childrenOf(ix, focus.parentId)
      .filter((n) => n.id !== focus.id)
      .slice(0, budget.siblings)
      .forEach((n, i) => push(n, "sibling", i));
  }

  const related = (ix.links.get(focus.id) ?? [])
    .map((e) => (e.source === focus.id ? e.target : e.source))
    .map((id) => ix.byId.get(id))
    .filter((n): n is GraphNode => !!n && !seen.has(n.id));
  related.slice(0, budget.related).forEach((n, i) => push(n, "related", i));

  const ids = new Set(out.map((v) => v.node.id));
  const edges: VisibleSet["edges"] = [];
  for (const v of out) {
    const p = v.node.parentId;
    if (p && ids.has(p)) edges.push({ source: p, target: v.node.id, kind: "tree" });
  }
  for (const e of ix.graph.edges) {
    if (e.relationshipType === "belongs_to") continue;
    if (ids.has(e.source) && ids.has(e.target) && (e.source === focus.id || e.target === focus.id)) {
      edges.push({ source: e.source, target: e.target, kind: "link" });
    }
  }
  return { focus, nodes: out, edges, hiddenChildren: Math.max(0, kids.length - budget.children) };
}
