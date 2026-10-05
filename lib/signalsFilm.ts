import type { BusinessGraph, GraphEdge, GraphNode, ProductKey } from "./graph/types.ts";
import { totalMs, type WatchStep } from "./watch.ts";

// What everything means (Parry, 5 Oct: "create a video like the others that
// shows all the different features with a mockup"). One film, the real Brain
// engine, an example agent: every light, ring and colour appears on cue with
// its meaning. Signals drawn inside a page (Hot/Warm/Cold, VIP rings, Touch
// Audit, Rolodex, Contacts) are shown as a small drawing in the caption.
// The words must match what scene.ts and the pages draw.

const PRODUCTS: [ProductKey, string, string][] = [
  ["go", "ONE GO", "Daily execution"],
  ["move", "ONE MOVE", "Relationship intelligence"],
  ["marquee", "MARQUEE", "Listing intelligence"],
  ["showly", "SHOWLY", "Buyer experience"],
  ["open", "ONE OPEN", "Open house intelligence"],
];

export function signalsGraph(): BusinessGraph {
  const nodes: GraphNode[] = [
    { id: "one", type: "core", label: "ONE", parentId: null, product: "one", importance: 1 },
    ...PRODUCTS.map(([id, label, sub]): GraphNode => ({ id, type: "product", label, secondaryLabel: sub, parentId: "one", product: id, importance: 0.9 })),
    { id: "s-follow", type: "category", label: "Follow-ups", secondaryLabel: "2 due", parentId: "move", product: "move", importance: 0.9 },
    { id: "s-tom", type: "person", label: "Tom Miller", secondaryLabel: "Follow-up 3 days overdue", parentId: "s-follow", product: "move", importance: 0.9, status: "action" },
    { id: "s-sarah", type: "person", label: "Sarah Mitchell", secondaryLabel: "Call due today", parentId: "s-follow", product: "move", importance: 0.8, status: "attention" },
    { id: "s-amy", type: "person", label: "Amy Chen", secondaryLabel: "Touched this month", parentId: "move", product: "move", importance: 0.8, status: "healthy" },
    { id: "s-jen", type: "person", label: "Jen Alvarez", secondaryLabel: "Birthday today", parentId: "move", product: "move", importance: 0.8 },
    { id: "s-listing", type: "property", label: "1482 Maple Ridge Dr", secondaryLabel: "Price drop nearby", parentId: "marquee", product: "marquee", importance: 0.8, status: "opportunity" },
    { id: "s-touch", type: "goal", label: "VIP touches", secondaryLabel: "14 of 25 this month", parentId: "go", product: "go", importance: 0.8, stats: [{ label: "VIP touches", value: "14 / 25" }] },
  ];
  const edges: GraphEdge[] = nodes
    .filter((n) => n.parentId)
    .map((n) => ({ id: `${n.parentId}>${n.id}`, source: n.parentId!, target: n.id, relationshipType: "belongs_to" as const, strength: 1 }));
  return { nodes, edges, rootId: "one" };
}

export const SIGNAL_SPOTS: Record<string, [number, number]> = {
  go: [-90, 290],
  move: [-18, 290],
  marquee: [54, 290],
  showly: [126, 290],
  open: [198, 290],
  "s-follow": [-22, 480],
  "s-tom": [-30, 660],
  "s-sarah": [-12, 650],
  "s-amy": [6, 470],
  "s-jen": [-48, 470],
  "s-listing": [62, 480],
  "s-touch": [-110, 470],
};

const P = ["go", "move", "marquee", "showly", "open"];

export const SIGNAL_STEPS: WatchStep[] = [
  { id: "sg-intro", show: ["one", ...P], focus: ["one", ...P], product: "one", kicker: "What everything means", title: "Every light, ring and colour in ONE.", line: "In about a minute. Then you will read your business at a glance.", ms: 4200 },
  { id: "sg-breathe", n: [1, 16], show: [], focus: ["one"], product: "one", kicker: "Pulse", title: "ONE is breathing.", line: "The gold ONE in the middle slowly breathes. That is Pulse, awake and watching your whole business. Tap it any time to meet Pulse.", ms: 4800 },
  { id: "sg-red", n: [2, 16], needs: true, show: ["s-follow", "s-tom"], focus: ["move", "s-follow", "s-tom"], product: "move", kicker: "What needs you", title: "Pulsing red: right now.", line: "Overdue or urgent. Tom's follow-up is three days late. Do this first.", ms: 4800 },
  { id: "sg-yellow", n: [3, 16], needs: true, show: ["s-sarah"], focus: ["move", "s-follow", "s-tom", "s-sarah"], product: "move", kicker: "What needs you", title: "Pulsing yellow: today.", line: "Needs your attention today. Sarah's call is due. Not on fire yet, but it will be.", ms: 4800 },
  { id: "sg-count", n: [4, 16], needs: true, show: [], focus: ["one", "move", "s-follow", "s-tom", "s-sarah"], flight: ["s-tom", "move"], product: "move", kicker: "What needs you", title: "The number: follow the pulse.", line: "Every orb above a pulse pulses too, with how many inside need you. ONE MOVE 2, Follow-ups 2, then the person. Keep tapping the pulse.", ms: 5600 },
  { id: "sg-green", n: [5, 16], needs: true, show: ["s-amy"], focus: ["move", "s-amy", "s-follow"], product: "move", kicker: "What needs you", title: "A still green ring: all good.", line: "Amy is touched this month. Nothing here needs you. Everything is in order.", ms: 4600 },
  { id: "sg-gold", n: [6, 16], needs: true, show: ["s-jen"], patch: { "s-jen": { celebrate: true } }, focus: ["move", "s-jen", "s-amy"], product: "move", kicker: "Moments", title: "Gold glow: a special day.", line: "Jen's birthday is today. Birthdays, anniversaries and home anniversaries glow gold and come first.", ms: 4800 },
  { id: "sg-opp", n: [7, 16], needs: true, show: ["s-listing"], focus: ["one", "marquee", "s-listing"], product: "marquee", kicker: "Moments", title: "A blinking gold dot: an opportunity.", line: "Not urgent, but worth a look. A chance Pulse spotted for you.", ms: 4600 },
  { id: "sg-ping", n: [8, 16], needs: true, show: [], ping: ["s-amy", "s-listing"], focus: ["one", "move", "marquee", "s-amy", "s-listing"], product: "one", kicker: "Moments", title: "A ring that spreads once: it changed.", line: "Something changed since you were last here. It rings out one time when you arrive.", ms: 4600 },
  { id: "sg-signal", n: [9, 16], needs: true, show: [], flight: ["go", "one"], focus: ["one", "go", "move"], product: "go", kicker: "Moments", title: "A light flying into ONE: it just happened.", line: "A box ticked in ONE GO, a visitor at an open house, a buyer's answer. It travels into ONE the moment it happens.", ms: 5000 },
  { id: "sg-beat", n: [10, 16], needs: true, show: [], beat: true, focus: ["one", ...P], product: "one", kicker: "Moments", title: "Lights running along the lines.", line: "Every few seconds Pulse checks every connection. Nothing to do. It is just working.", ms: 4800 },
  { id: "sg-arc", n: [11, 16], needs: true, show: ["s-touch"], focus: ["one", "go", "s-touch"], product: "go", kicker: "Progress", title: "The arc around an orb: how far along.", line: "It fills as you go. 14 of 25 VIP touches done this month.", ms: 4600 },
  { id: "sg-locked", n: [12, 16], needs: true, show: [], patch: { showly: { locked: true } }, focus: ["one", "showly", "marquee", "open"], product: "showly", kicker: "Progress", title: "A faded orb: not in your package.", line: "Faded products are not in your package yet. Tap one to see what it adds.", ms: 4600 },
  { id: "sg-hwc", n: [13, 16], needs: true, clear: true, show: [], patch: { showly: { locked: false } }, focus: ["one", ...P], product: "move", kicker: "In your pages · Hot, Warm and Cold", title: "Faces frost when they go cold.", line: "Faces cool as days pass without a touch and frost over once overdue. A gold heartbeat marks Pulse's three for today; embers rise behind anyone who just moved up.", demo: "hwc", ms: 5800 },
  { id: "sg-vip", n: [14, 16], needs: true, show: [], focus: ["one", ...P], product: "move", kicker: "In your pages · VIP rings", title: "Your VIP-50 and VIP-100, in rings.", line: "Gold inner ring is the VIP-50, teal outer ring the VIP-100. The ring round each face is their monthly touches; a red glow means overdue.", demo: "vip", ms: 5600 },
  { id: "sg-touch", n: [15, 16], needs: true, show: [], focus: ["one", ...P], product: "move", kicker: "In your pages · Touch Audit and Rolodex", title: "Touches fill up. Offers wear gold.", line: "The Touch Audit fills with this month's coverage. In the Rolodex, a gold dotted ring is an offer for your clients; a teal dot means you shared it.", demo: "touch", ms: 5800 },
  { id: "sg-contacts", n: [16, 16], needs: true, show: [], focus: ["one", ...P], product: "move", kicker: "In your pages · Contacts", title: "A gold badge: someone in here needs you.", line: "Tap the group, then the person. Their whole life opens round them.", demo: "contacts", ms: 5000 },
  { id: "outro", needs: true, show: ["s-follow", "s-tom", "s-sarah", "s-amy", "s-jen", "s-listing", "s-touch"], patch: { "s-jen": { celebrate: true } }, focus: ["one", ...P, "s-follow", "s-tom", "s-sarah", "s-amy", "s-jen", "s-listing", "s-touch"], product: "one", kicker: "", title: "Red: now. Yellow: today. Green: all good. Follow the pulse.", line: "", ms: 5200 },
];

export const SIGNALS_MS = totalMs(SIGNAL_STEPS);

const stamp = (ms: number) => {
  const s = ms / 1000;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(3).padStart(6, "0")}`;
};

/** Captions for the recorded film: each step's words over its time on screen. */
export function signalsVtt(steps: WatchStep[] = SIGNAL_STEPS): string {
  let t = 0;
  const cues: string[] = [];
  for (const s of steps) {
    const words = [s.title, s.line].filter(Boolean).join(" ");
    cues.push(`${stamp(t + 300)} --> ${stamp(t + s.ms - 200)}\n${words}`);
    t += s.ms;
  }
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

export const SIGNALS_FILM = { src: "/home/films/signals.mp4", poster: "/home/films/signals.jpg", captions: "/home/films/signals.vtt" };
