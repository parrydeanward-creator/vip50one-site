import type { GraphEdge, GraphNode } from "./graph/types.ts";

// Ads that did not reach Meta, and team ads paused (WEBSITES.md; one-websites#128). ONE Websites answers
// `site_alerts` for the signed-in agent through the Brain's server (app/api/site-alerts). Follow the pulse: red while
// an ad failed (right now), yellow while one is held; the orb is gone when there is nothing. Opening an alert opens the
// agent's own ads page on their site, where Publish again is theirs to press; nothing is sent or published from here.

export const ADS_NODE = "go-ads";

export interface SiteAlert {
  kind: "ads_failed" | "ads_held";
  line: string;
  url: string;
}

export function readSiteAlerts(j: unknown): SiteAlert[] | null {
  const list = j && typeof j === "object" ? (j as { alerts?: unknown }).alerts : null;
  if (!Array.isArray(list)) return null;
  const out: SiteAlert[] = [];
  for (const a of list as Record<string, unknown>[]) {
    const kind = a?.kind === "ads_failed" || a?.kind === "ads_held" ? a.kind : null;
    const line = typeof a?.line === "string" ? a.line.trim().slice(0, 200) : "";
    const url = typeof a?.url === "string" && /^https:\/\/[a-z0-9-]+\.vip50homes\.com\/ads$/.test(a.url) ? a.url : null;
    if (kind && line && url) out.push({ kind, line, url });
  }
  return out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "ads_failed" ? -1 : 1));
}

export function withAdsAlertNode<G extends { nodes: GraphNode[]; edges: GraphEdge[] }>(g: G, list: SiteAlert[] | null): G {
  const isMine = (id: string) => id === ADS_NODE || id.startsWith(`${ADS_NODE}:`);
  const nodes = g.nodes.filter((n) => !isMine(n.id));
  const edges = g.edges.filter((e) => !isMine(e.target));
  const go = g.nodes.find((n) => n.id === "go");
  if (!go || go.locked || !list?.length) return { ...g, nodes, edges };
  const failed = list.some((a) => a.kind === "ads_failed");
  nodes.push({
    id: ADS_NODE,
    type: "feature",
    label: "Your ads",
    secondaryLabel: failed ? "Did not reach Meta" : "Paused",
    parentId: "go",
    product: "go",
    importance: 1.04,
    status: failed ? "action" : "attention",
    needCount: list.length,
    summary: list[0].line,
  });
  edges.push({ id: `go>${ADS_NODE}`, source: "go", target: ADS_NODE, relationshipType: "belongs_to", strength: 1 });
  list.forEach((a, i) => {
    const id = `${ADS_NODE}:${i}`;
    nodes.push({
      id,
      type: "task",
      label: a.kind === "ads_failed" ? "Publish again" : "Team ad paused",
      secondaryLabel: new URL(a.url).hostname.replace(".vip50homes.com", ""),
      parentId: ADS_NODE,
      product: "go",
      importance: 0.95 - i * 0.02,
      status: a.kind === "ads_failed" ? "action" : "attention",
      summary: a.line,
      href: a.url,
    });
    edges.push({ id: `${ADS_NODE}>${id}`, source: ADS_NODE, target: id, relationshipType: "belongs_to", strength: 1 });
  });
  return { ...g, nodes, edges };
}
