// "What am I seeing?" (Parry, 5 Oct: "there needs to be a journey that explains
// what each is"). One step per signal the Brain draws, in the order an agent
// meets them. Every step names a demo the guide animates; the words here are
// the only explanation, so they must match what scene.ts and the pages draw.

export type DemoKind =
  | "breathe"
  | "pulse-red"
  | "pulse-yellow"
  | "green"
  | "count"
  | "celebrate"
  | "opportunity"
  | "ping"
  | "signal"
  | "heartbeat"
  | "arc"
  | "locked"
  | "hwc"
  | "vip"
  | "touch"
  | "rolodex"
  | "contacts";

export interface GuideStep {
  chapter: string;
  title: string;
  line: string;
  demo: DemoKind;
}

export const GUIDE: readonly GuideStep[] = [
  { chapter: "Pulse", title: "ONE is breathing", line: "The gold ONE in the middle slowly breathes. That is Pulse, awake and watching your whole business. Tap it any time to meet Pulse.", demo: "breathe" },
  { chapter: "What needs you", title: "Pulsing red: right now", line: "Overdue or urgent. A fast red pulse means do this first.", demo: "pulse-red" },
  { chapter: "What needs you", title: "Pulsing yellow: today", line: "Needs your attention today. Not on fire yet, but it will be.", demo: "pulse-yellow" },
  { chapter: "What needs you", title: "A still green ring: all good", line: "Nothing here needs you. Everything is in order.", demo: "green" },
  { chapter: "What needs you", title: "The number: follow the pulse", line: "An orb with a number has that many things inside that need you. Tap it, and keep tapping the pulse, and it leads you straight to the person.", demo: "count" },
  { chapter: "Moments", title: "Gold glow: a special day", line: "A birthday, an anniversary or a home anniversary today. Be the one who remembered.", demo: "celebrate" },
  { chapter: "Moments", title: "A blinking gold dot: an opportunity", line: "Not urgent, but worth a look: a chance Pulse spotted for you.", demo: "opportunity" },
  { chapter: "Moments", title: "A ring that spreads once: it changed", line: "Something changed since you were last here. It rings out one time when you arrive.", demo: "ping" },
  { chapter: "Moments", title: "A light flying into ONE: just arrived", line: "Something new just happened in a product, such as a box ticked in ONE GO or a visitor at an open house, and it is travelling into ONE.", demo: "signal" },
  { chapter: "Moments", title: "Lights running along the lines", line: "Every few seconds Pulse checks every connection from where you are. Nothing to do; it is just working.", demo: "heartbeat" },
  { chapter: "Progress", title: "The arc around an orb: how far along", line: "A white arc fills as you get through it, like 14 of 25 VIP touches done.", demo: "arc" },
  { chapter: "Progress", title: "A faded orb: not in your package", line: "Faded products are not in your package yet. Tap one to see what it adds.", demo: "locked" },
  { chapter: "In your pages", title: "Hot, Warm and Cold", line: "Faces cool as days pass without a touch and frost over once overdue. A gold heartbeat marks Pulse's three for today; embers rise behind anyone who just moved up; a class's ring lights when today's box is ticked.", demo: "hwc" },
  { chapter: "In your pages", title: "VIP rings", line: "VIP-50 is the gold inner ring, VIP-100 the teal outer ring. The ring round each face is their monthly touches; a red glow means overdue.", demo: "vip" },
  { chapter: "In your pages", title: "Touch Audit", line: "The middle fills with this month's coverage. Each touch fills with how many of your VIP-50 have it; tap one to see who is still missing it.", demo: "touch" },
  { chapter: "In your pages", title: "Rolodex", line: "A gold dotted ring means the business has an offer for your clients. A teal dot means you shared it with the VIP-50 community.", demo: "rolodex" },
  { chapter: "In your pages", title: "Contacts", line: "A gold badge on a group means Pulse says someone in it needs you. Tap a person and their whole life opens round them.", demo: "contacts" },
];

export const GUIDE_TITLE = "What everything means";
