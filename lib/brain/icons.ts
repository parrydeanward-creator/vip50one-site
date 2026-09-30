import type { GraphNode } from "../graph/types.ts";

// One icon vocabulary for the canvas (PixiJS) and the DOM (SVG), chosen from a
// node or a stat label. Presentation only.
export type IconKind =
  | "go" | "move" | "marquee" | "showly" | "open"
  | "check" | "people" | "house" | "calendar" | "star" | "map" | "chat" | "trophy" | "list" | "bolt" | "none";

export function iconForText(text: string): IconKind {
  const l = text.toLowerCase();
  if (l.includes("calendar") || l.includes("date") || l.includes("appointment") || l.includes("event")) return "calendar";
  if (l.includes("today") || l.includes("execution") || l.includes("momentum") || l.includes("streak") || l.includes("pace")) return "bolt";
  if (l.includes("task") || l.includes("tracker") || l.includes("mission") || l.includes("follow") || l.includes("audit") || l.includes("done")) return "check";
  if (l.includes("score") || l.includes("leader") || l.includes("badge") || l.includes("xp") || l.includes("crown") || l.includes("closing") || l.includes("referral")) return "trophy";
  if (l.includes("map") || l.includes("route") || l.includes("miles") || l.includes("sign") || l.includes("drop")) return "map";
  if (l.includes("lounge") || l.includes("message") || l.includes("feed") || l.includes("call") || l.includes("conversation") || l.includes("text")) return "chat";
  if (l.includes("contact") || l.includes("vip") || l.includes("family") || l.includes("people") || l.includes("buyer") || l.includes("relationship") || l.includes("health")) return "people";
  if (l.includes("challenge") || l.includes("bonus") || l.includes("goal") || l.includes("hot") || l.includes("point") || l.includes("weekly")) return "star";
  if (l.includes("listing") || l.includes("home") || l.includes("house") || l.includes("property")) return "house";
  return "list";
}

export function iconFor(n: GraphNode): IconKind {
  if (n.type === "product") return n.product as IconKind;
  if (n.type === "appointment" || n.type === "event") return "calendar";
  if (n.type === "property") return "house";
  if (n.type === "goal") return "star";
  return iconForText(n.label);
}
