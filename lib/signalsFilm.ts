import type { BusinessGraph, GraphEdge, GraphNode, ProductKey } from "./graph/types.ts";
import { totalMs, type WatchStep } from "./watch.ts";

// What everything means (Parry, 5 Oct: "create a video like the others that
// shows all the different features with a mockup"). One film, the real Brain
// engine, an example agent: every light, ring and colour appears on cue with
// its meaning. Signals drawn inside a page (Hot/Warm/Cold, VIP rings, Touch
// Audit, Rolodex, Contacts) are shown as a small drawing in the caption.
// The words must match what scene.ts and the pages draw.

const PRODUCTS: [ProductKey, string, string][] = [
  ["go", "ONE YOU", "Your plan, your week, your goals"],
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

// v2 (Parry, 15 Oct: "lets redo the video with the correct info and added features"; script
// research/films/what-everything-means-v2.md in vip50-ecosystem): 22 moments, about two minutes. `say` is the spoken
// line, word for word; the captions are exactly these words. Each moment lasts as long as its line takes to say.
const N = 22;
const sayMs = (say: string) => Math.max(4000, Math.round(say.split(/\s+/).length * 380 + 1300));
type Moment = Omit<WatchStep, "ms" | "line" | "n"> & { say: string };
const MOMENTS: Moment[] = [
  { id: "sg-intro", show: ["one", ...P], focus: ["one", ...P], product: "one", kicker: "What everything means", title: "Every light, ring and colour in ONE.", say: "Every light, ring and colour in ONE, in about two minutes." },
  { id: "sg-breathe", show: [], focus: ["one"], product: "one", kicker: "Pulse", title: "ONE is breathing.", say: "The gold ONE in the middle is breathing. That's Pulse, awake and watching your business. Tap it to meet Pulse." },
  { id: "sg-red", needs: true, show: ["s-follow", "s-tom"], focus: ["s-follow", "s-tom"], product: "move", kicker: "What needs you", title: "Pulsing red: right now.", say: "Pulsing red means right now. Tom's follow-up is three days late. Do this first." },
  { id: "sg-yellow", needs: true, show: ["s-sarah"], focus: ["s-tom", "s-sarah", "s-follow"], product: "move", kicker: "What needs you", title: "Pulsing yellow: today.", say: "Pulsing yellow means today. Sarah's call is due." },
  { id: "sg-count", needs: true, show: [], focus: ["move", "s-follow", "s-tom", "s-sarah"], flight: ["s-tom", "move"], product: "move", kicker: "What needs you", title: "The number: follow the pulse.", say: "Every orb above a pulse pulses too, with a number. Follow it straight to the person." },
  { id: "sg-green", needs: true, show: ["s-amy"], focus: ["move", "s-amy"], product: "move", kicker: "What needs you", title: "A still green ring: all good.", say: "A still green ring means all good. Nothing here needs you." },
  { id: "sg-gold", needs: true, show: ["s-jen"], patch: { "s-jen": { celebrate: true } }, focus: ["move", "s-jen"], product: "move", kicker: "Moments", title: "Gold glow: a special day.", say: "A gold glow is a special day. Jen's birthday is today." },
  { id: "sg-opp", needs: true, show: ["s-listing"], focus: ["one", "marquee", "s-listing"], product: "marquee", kicker: "Moments", title: "A gold dot: an opportunity.", say: "A gold dot is an opportunity Pulse spotted for you." },
  { id: "sg-ping", needs: true, show: [], ping: ["s-amy", "s-jen"], focus: ["move", "s-amy", "s-jen"], product: "one", kicker: "Moments", title: "A ring that spreads once: it changed.", say: "A ring that spreads once means something changed since you were last here." },
  { id: "sg-signal", needs: true, show: [], flight: ["go", "one"], focus: ["one", "go"], product: "go", kicker: "Moments", title: "A light flying into ONE: it just happened.", say: "A light flying into ONE means something just happened, like a box ticked on your phone or a visitor at your open house." },
  { id: "sg-arc", needs: true, show: ["s-touch"], focus: ["go", "s-touch"], product: "go", kicker: "Progress", title: "The arc: how far along.", say: "The arc around an orb shows how far along you are. 14 of 25 VIP touches this month." },
  { id: "sg-locked", needs: true, show: [], patch: { showly: { locked: true } }, focus: ["one", "showly", "marquee"], product: "showly", kicker: "Progress", title: "A faded orb: not in your package.", say: "A faded orb is not in your package yet. Tap it to see what it adds." },
  { id: "sg-now", needs: true, show: [], patch: { showly: { locked: false } }, focus: ["one", ...P], product: "one", kicker: "Getting around", title: "The gold pill: what to do now.", say: "The gold pill at the top always tells you what to do right now. Tap it to open your day.", ui: "now" },
  { id: "sg-day", needs: true, show: [], focus: ["one", ...P], product: "go", kicker: "Getting around", title: "Your day, planned by Pulse.", say: "Pulse plans your day round your calendar. Tap Looks good, then tick Done as you go. Anything you miss moves up by itself.", ui: "day" },
  { id: "sg-ask", needs: true, clear: true, show: ["s-follow", "s-tom", "s-sarah", "s-amy"], focus: ["s-tom", "s-sarah", "s-amy"], product: "one", kicker: "Getting around", title: "Ask Pulse.", say: "Ask Pulse anything about your business. \"Who haven't I called in 60 days?\" The people come up as orbs.", ui: "ask" },
  { id: "sg-tap", needs: true, show: [], focus: ["s-tom"], product: "move", kicker: "Getting around", title: "Tap an orb. The arrow takes you back.", say: "Tap any orb and it comes to the middle and opens. The back arrow takes you back to everything.", ui: "back" },
  { id: "sg-timeline", needs: true, show: [], ping: ["move", "open", "marquee"], focus: ["one", ...P], product: "one", kicker: "Getting around", title: "The timeline: what happened, what is coming.", say: "Slide the timeline left to see what happened, right to see what is coming: birthdays, open houses, posts. Tap Today to come back.", ui: "timeline" },
  { id: "sg-hwc", needs: true, show: [], focus: ["one", ...P], product: "move", kicker: "In your pages", title: "Hot, Warm and Cold.", say: "Hot, Warm and Cold pulse every day until you work them.", ui: "hwc" },
  { id: "sg-vip", needs: true, show: [], focus: ["one", ...P], product: "move", kicker: "In your pages", title: "Your VIP-50 and VIP-100, in rings.", say: "Your VIP-50 and VIP-100 sit in rings. A red glow means overdue.", ui: "vip" },
  { id: "sg-menu", needs: true, show: [], focus: ["one", ...P], product: "one", kicker: "Getting around", title: "Your photo opens your menu.", say: "Your photo opens your menu: My Profile, your website, your Growth results and your plan.", ui: "menu" },
  { id: "sg-help", needs: true, show: [], focus: ["one", ...P], product: "one", kicker: "Getting around", title: "The gold question mark.", say: "Lost? Tap the gold question mark for this key any time.", ui: "help" },
  { id: "outro", needs: true, show: ["s-jen", "s-listing", "s-touch"], patch: { "s-jen": { celebrate: true } }, focus: ["one", ...P, "s-follow", "s-tom", "s-sarah", "s-amy", "s-jen", "s-listing", "s-touch"], product: "one", kicker: "", title: "Red: now. Yellow: today. Green: all good. Follow the pulse.", say: "Red, now. Yellow, today. Green, all good. Follow the pulse." },
];

export const SIGNAL_STEPS: WatchStep[] = MOMENTS.map((m, k) => ({
  ...m,
  line: m.id === "outro" ? "" : m.say,
  n: m.id === "sg-intro" || m.id === "outro" ? undefined : [k, N - 2] as [number, number],
  ms: sayMs(m.say) + (m.id === "outro" ? 1800 : 0),
}));

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
    const words = s.say ?? [s.title, s.line].filter(Boolean).join(" ");
    cues.push(`${stamp(t + 300)} --> ${stamp(t + s.ms - 200)}\n${words}`);
    t += s.ms;
  }
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

// The tall cut (1080x1920) is the same scene recorded on a phone screen; the help panel serves it on phones.
export const SIGNALS_FILM = { src: "/home/films/signals.mp4", poster: "/home/films/signals.jpg", captions: "/home/films/signals.vtt", tallSrc: "/home/films/signals-tall.mp4", tallPoster: "/home/films/signals-tall.jpg" };
