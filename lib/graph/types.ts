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
  timestamps?: { created?: string; due?: string; last?: string };
  locked?: boolean; // product outside the agent's package
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: RelationshipType;
  strength: number; // 0..1
}

export interface BusinessGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootId: string;
}
