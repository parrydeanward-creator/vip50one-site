import type { BusinessGraph, GraphNode } from "./graph/types.ts";
import { SPOTS, WATCH_STEPS, totalMs, watchGraph, type WatchStep } from "./watch.ts";

// The long film (about 100 seconds) for the sales page: the five products,
// your day (what to do and when, done one by one, compiled at the end), the
// features that already work on the dashboard (Ask ONE, live
// signals, Marquee's listing path, ONE Open's four phases, the timeline), then
// the Mark Davis story, then goals. Same engine, same honesty rule: anything
// not built yet carries "Coming". Example agent; invented people.

const extra: GraphNode[] = [
  { id: "f-jen", type: "person", label: "Call Jen Alvarez", secondaryLabel: "Birthday tomorrow", parentId: "move", product: "move", importance: 0.8, status: "opportunity" },
  { id: "f-follow", type: "task", label: "4 follow-ups", secondaryLabel: "Overdue in ONE MOVE", parentId: "move", product: "move", importance: 0.8, status: "action" },
  { id: "f-approve", type: "task", label: "Approve 5 posts", secondaryLabel: "1482 Maple Ridge Dr", parentId: "marquee", product: "marquee", importance: 0.8, status: "attention" },
  { id: "f-amy", type: "person", label: "Call Amy Chen", secondaryLabel: "Sent you a referral", parentId: "move", product: "move", importance: 0.7, status: "attention" },
  { id: "f-marcus", type: "person", label: "Lunch with Marcus", secondaryLabel: "Most overdue visit", parentId: "move", product: "move", importance: 0.7, status: "action" },
  { id: "f-listing", type: "property", label: "1482 Maple Ridge Dr", secondaryLabel: "Step 4 of 9 · 5 to approve", parentId: "marquee", product: "marquee", importance: 0.8, status: "attention" },
  { id: "f-oh", type: "event", label: "Sunday open house", secondaryLabel: "Prepare · 3 tasks left", parentId: "open", product: "open", importance: 0.8, status: "attention" },
  { id: "f-bday", type: "person", label: "Jen's birthday", secondaryLabel: "Tomorrow", parentId: "move", product: "move", importance: 0.7 },
  { id: "f-sunday", type: "event", label: "Open house", secondaryLabel: "Sunday 1-3pm", parentId: "open", product: "open", importance: 0.7 },
  { id: "f-report", type: "task", label: "Seller report", secondaryLabel: "Friday", parentId: "marquee", product: "marquee", importance: 0.7 },
  { id: "f-mixer", type: "event", label: "Fall Client Mixer", secondaryLabel: "Oct 16 · 12 yes", parentId: "move", product: "move", importance: 0.7 },
  { id: "d1", type: "person", label: "Call Jen Alvarez", secondaryLabel: "8:00 · 10 min · birthday", parentId: "one", product: "move", importance: 0.8, status: "opportunity" },
  { id: "d2", type: "task", label: "2 video texts", secondaryLabel: "9:30 · 10 min", parentId: "one", product: "go", importance: 0.8, status: "attention" },
  { id: "d3", type: "task", label: "Approve 5 posts", secondaryLabel: "10:00 · 15 min", parentId: "one", product: "marquee", importance: 0.8, status: "attention" },
  { id: "d4", type: "person", label: "Lunch with Marcus", secondaryLabel: "12:30 · face-to-face", parentId: "one", product: "move", importance: 0.8, status: "action" },
  { id: "d5", type: "task", label: "Rate 2 visitors", secondaryLabel: "3:00 · 5 min", parentId: "one", product: "open", importance: 0.8, status: "attention" },
  { id: "d6", type: "task", label: "4 follow-ups", secondaryLabel: "4:00 · 20 min", parentId: "one", product: "move", importance: 0.8, status: "action" },
  { id: "f-goals", type: "goal", label: "Closings 9 of 20", secondaryLabel: "On pace · GCI $142k", parentId: "go", product: "go", importance: 0.8, status: "healthy" },
];

export function filmGraph(): BusinessGraph {
  const g = watchGraph();
  const edges = [...g.edges, ...extra.map((n) => ({ id: `${n.parentId}>${n.id}`, source: n.parentId!, target: n.id, relationshipType: "belongs_to" as const, strength: 1 }))];
  return { ...g, nodes: [...g.nodes, ...extra], edges };
}

export const FILM_SPOTS: Record<string, [number, number]> = {
  ...SPOTS,
  "f-jen": [-112, 480],
  "f-follow": [-30, 490],
  "f-approve": [62, 480],
  "f-amy": [-160, 470],
  "f-marcus": [-60, 490],
  "f-listing": [54, 480],
  "f-oh": [198, 480],
  "f-bday": [-100, 470],
  "f-sunday": [190, 470],
  "f-report": [62, 470],
  "f-mixer": [-24, 480],
  "f-goals": [-148, 470],
  // today, laid out like a clock face around ONE: 8:00 at the top
  d1: [-90, 470],
  d2: [-30, 480],
  d3: [30, 480],
  d4: [90, 470],
  d5: [150, 480],
  d6: [210, 480],
};

const P = ["go", "move", "marquee", "showly", "open"];
const story = WATCH_STEPS.filter((s) => s.id !== "intro" && s.id !== "outro").map((s, i) => ({ ...s, clear: i === 0 }));

export const FILM_STEPS: WatchStep[] = [
  { id: "f-hello", show: ["one"], focus: ["one"], product: "one", kicker: "VIP-50 ONE", title: "Your business runs on relationships.", line: "And on five different jobs every week.", ms: 3800 },
  { id: "f-go", show: ["go"], focus: ["one", "go"], product: "go", kicker: "ONE GO", title: "Your day, in points.", line: "The VIP-50 calls, texts and notes that move your business, on your phone.", ms: 3400 },
  { id: "f-move", show: ["move"], focus: ["one", "go", "move"], product: "move", kicker: "ONE MOVE", title: "Every relationship you have.", line: "Every contact, every touch, every follow-up you promised.", ms: 3400 },
  { id: "f-marquee", show: ["marquee"], focus: ["one", "go", "move", "marquee"], product: "marquee", kicker: "Marquee", title: "Every listing, marketed.", line: "Built for you in about an hour. Nothing posts until you approve it.", ms: 3400 },
  { id: "f-showly", show: ["showly"], focus: ["one", "go", "move", "marquee", "showly"], product: "showly", kicker: "Showly", title: "Every buyer tour.", line: "Your buyers answer Yes, Maybe or No on every home.", ms: 3400 },
  { id: "f-open", show: ["open"], focus: ["one", ...P], product: "open", kicker: "ONE Open", title: "Every open house.", line: "Plan, Prepare, Host, Follow Up. Every visitor, every task.", ms: 3400 },
  { id: "f-one", show: [], focus: ["one", ...P], product: "one", kicker: "ONE", title: "One brain in the middle.", line: "It sees all five, and tells you what matters.", ms: 3600 },
  { id: "f-day", clear: true, show: ["d1", "d2", "d3", "d4", "d5", "d6"], focus: ["one", "d1", "d2", "d3", "d4", "d5", "d6"], product: "one", kicker: "Your day", title: "ONE tells you exactly what to do today, and when.", line: "In order, with the time each one takes.", ms: 5600 },
  { id: "f-do1", show: [], focus: ["one", "d1", "d2", "d6"], flight: ["one", "d1"], patch: { d1: { status: "healthy", sub: "Done" } }, product: "move", kicker: "8:00", title: "Open ONE. Do the first thing.", line: "Call Jen. ONE sees it the moment it's logged.", ms: 4400 },
  { id: "f-do2", show: [], focus: ["one", "d1", "d2", "d3"], flight: ["one", "d2"], patch: { d2: { status: "healthy", sub: "Done" } }, product: "go", kicker: "9:30", title: "Then the next.", line: "Two video texts to your VIP-50. Your score updates as you go.", ms: 4000 },
  { id: "f-do3", show: [], focus: ["one", "d1", "d2", "d3", "d4", "d5", "d6"], flight: ["one", "d4"], patch: { d3: { status: "healthy", sub: "Done" }, d4: { status: "healthy", sub: "Done" } }, product: "one", kicker: "All day", title: "ONE is watching, all day.", line: "Posts approved, lunch with Marcus. Every call, text, lunch and post, across all five products.", ms: 4400 },
  { id: "f-do4", show: [], focus: ["one", "d1", "d2", "d3", "d4", "d5", "d6"], flight: ["one", "d6"], patch: { d5: { status: "healthy", sub: "Done" }, d6: { status: "healthy", sub: "Done" } }, product: "one", kicker: "4:00", title: "Everything done.", line: "Visitors rated, follow-ups cleared.", ms: 3800 },
  { id: "f-recap", show: [], focus: ["one", "d1", "d2", "d3", "d4", "d5", "d6"], product: "one", kicker: "End of day", title: "6 of 6 done. Nothing missed.", line: "ONE compiles your day, so you don't have to.", ms: 4800 },
  { id: "f-simple", show: [], focus: ["one", "d1", "d2", "d3", "d4", "d5", "d6"], product: "one", kicker: "", title: "Open ONE. Do the work. It's that simple.", line: "", ms: 3800 },
  { id: "f-ask", clear: true, show: ["f-jen", "f-amy", "f-marcus"], focus: ["one", "f-jen", "f-amy", "f-marcus"], flight: ["one", "f-amy"], product: "one", kicker: "Ask ONE", title: "“Who should I call today?”", line: "Jen first, her birthday is tomorrow. Then Amy and Marcus. Each with the reason why.", ms: 5600 },
  { id: "f-live", clear: true, show: [], focus: ["one", ...P], flight: ["showly", "one"], product: "showly", kicker: "Live", title: "A buyer just answered your tour.", line: "The moment it happens in any product, it lights up in ONE.", ms: 4200 },
  { id: "f-listing", show: ["f-listing"], focus: ["one", "marquee", "f-listing"], flight: ["marquee", "f-listing"], product: "marquee", kicker: "Marquee", title: "Every listing, step by step.", line: "Nine steps from the photos to closed. You always know the next one.", ms: 4400 },
  { id: "f-openhouse", show: ["f-oh"], focus: ["one", "open", "f-oh"], flight: ["open", "f-oh"], product: "open", kicker: "ONE Open", title: "Every open house, in four phases.", line: "Sunday's is in Prepare, three tasks left.", ms: 4400 },
  { id: "f-then", clear: true, show: [], focus: ["one", ...P], product: "one", kicker: "Watch ONE work", title: "Now follow one person through all five.", line: "", ms: 3000 },
  ...story,
  { id: "f-timeline", clear: true, show: ["f-bday", "f-mixer", "f-report", "f-sunday"], focus: ["one", "f-bday", "f-mixer", "f-report", "f-sunday"], product: "one", kicker: "Timeline", title: "Slide forward. See what's coming.", line: "Birthdays, open houses, reports, the client mixer, before they sneak up on you.", ms: 5000 },
  { id: "f-goals", show: ["f-goals"], focus: ["one", "go", "f-goals"], flight: ["go", "f-goals"], product: "go", kicker: "Your goals", title: "On pace, or not. Every morning.", line: "Closings, referrals and GCI against your own goal year.", coming: true, ms: 4400 },
  { id: "outro", clear: true, show: [], focus: ["one", ...P], product: "one", kicker: "", title: "One relationship. Five products. One connected system.", line: "", ms: 5000 },
];

export const FILM_MS = totalMs(FILM_STEPS);
