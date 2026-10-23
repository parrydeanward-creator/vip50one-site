import type { BusinessGraph } from "../graph/types.ts";
import { moveMenuHref, movePageId } from "../moveMenu.ts";

// The walk-through (?walk=1): the example graph has no ONE MOVE page nodes (lib/live.ts adds them for signed-in
// agents), so a menu click on Contacts, VIP Management... found no node and went home. Add the pages drawn natively,
// each under the example orb it belongs to.
export const TOUR_PAGES: [string, string, string][] = [
  ["/contacts", "Contacts", "move-0"], ["/contacts/vip", "VIP Management", "move-2"], ["/contacts/audit", "Touch Audit", "move-1"],
  ["/hot-warm-cold", "Hot/Warm/Cold", "move-9"], ["/rolodex", "Business Rolodex", "move-0"], ["/daily", "Daily Tracker", "move"],
  ["/weekly", "Weekly Tracker", "move"], ["/profile", "My Profile", "move"], ["/home-reports", "Market Reports", "move"],
  // The Classic-only pages added to the menu on 21 Oct (Parry: everything on Classic in the Brain too).
  ["/contacts/import", "Import Contacts", "move-0"], ["/contacts/cleanup", "Clean Up Contacts", "move-0"],
  ["/contacts/sources", "Lead Sources", "move-0"],
  ["/tasks", "Tasks", "move"], ["/profile/agent-hub", "Agent Hub", "move"],
  // Who is on my site (VIP-SUMMARY §3ar, 23 Oct), drawn natively on example data (lib/examples/siteActivity.ts)
  ["/on-my-site", "Who is on my site", "move-0"],
];
// The example agent (?demo=1) has no ONE MOVE menu either; Market Reports gets its orb so the example shows it (HOME-REPORT
// §5.4, 16 Oct). It runs on example data there, with no network.
// My Profile too, for "Pulse knows me" (PROFILE §5c, 16 Oct), on the example agent's own data.
// Who is on my site too (VIP-SUMMARY §3ar, 23 Oct), on example data, so the example shows it.
export const DEMO_PAGES: [string, string, string][] = [["/home-reports", "Market Reports", "move"], ["/profile", "My Profile", "move"], ["/on-my-site", "Who is on my site", "move-0"]];
export function withTourPages(g: BusinessGraph, pages = TOUR_PAGES): BusinessGraph {
  const have = new Set(g.nodes.map((n) => n.id));
  const nodes = [...g.nodes];
  const edges = [...g.edges];
  for (const [path, label, parent] of pages) {
    const id = movePageId(path);
    if (have.has(id)) continue;
    const parentId = have.has(parent) ? parent : "move";
    have.add(id);
    nodes.push({ id, type: "feature", label, parentId, product: "move", importance: 0.3, href: moveMenuHref(path) });
    edges.push({ id: `${parentId}>${id}`, source: parentId, target: id, relationshipType: "belongs_to", strength: 1 });
  }
  return { ...g, nodes, edges };
}


