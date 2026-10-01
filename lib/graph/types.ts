// Layer 1: the business graph. The truth about the agent's business, with no
// idea how it is drawn (research/ONE-BRAIN.md §8). Demo data today; real data
// arrives through a source adapter with the same shape.

export type ProductKey = "one" | "go" | "move" | "marquee" | "showly" | "open";

export type NodeType =
  | "core"
  | "product"
  | "category"
  | "feature"
  | "person"
  | "property"
  | "task"
  | "appointment"
  | "goal"
  | "opportunity"
  | "transaction"
  | "event"
  | "insight";

// Intelligence states (§4). Always shown with a label, never colour alone.
export type NodeStatus = "healthy" | "attention" | "action" | "opportunity";

export type RelationshipType =
  | "belongs_to"
  | "related_to"
  | "created_by"
  | "recommended_by"
  | "requires_action"
  | "interested_in"
  | "scheduled_for"
  | "owns"
  | "attended"
  | "showed"
  | "connected_to";

export interface Stat {
  label: string;
  value: string;
}

export interface Recommendation {
  title: string;
  // The facts the recommendation rests on. WHY shows these; nothing else.
  why: string[];
  targetId?: string; // node the recommendation points at
}

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  secondaryLabel?: string; // short descriptor under the name
  parentId: string | null; // the tree the agent navigates
  product: ProductKey;
  status?: NodeStatus;
  importance: number; // 0..1, orders children and sizes nodes
  summary?: string;
  stats?: Stat[];
  recommendations?: Recommendation[];
  // A short "where this is heading" line under the numbers (e.g. current
  // pace), and what would close the gap.
  pace?: { headline: string; detail?: string };
  timestamps?: { created?: string; due?: string; last?: string };
  locked?: boolean; // product outside the agent's package
  href?: string; // opens this exact thing in its product (real data: the item's link)
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: RelationshipType;
  strength: number; // 0..1
}

// Something that changed in a product since the agent last looked
// (Since you were last here). Real data: VIP-SUMMARY items the product has not
// seen (`seen` false), newest first.
export interface ChangeNote {
  id: string; // the node it is about
  product: ProductKey; // where it came from (may differ from the node's own product)
  what: string;
  at: string; // ISO time
}

// Something with a date, past or coming (the timeline slider). Real data:
// VIP-SUMMARY items' `due` and the products' dated history.
export interface DatedNote {
  id: string; // the node it is about
  product: ProductKey;
  at: string; // ISO time
  what: string;
}

export interface BusinessGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootId: string;
  changes?: ChangeNote[];
  dated?: DatedNote[];
  today?: import("../day.ts").DayItem[];
}
