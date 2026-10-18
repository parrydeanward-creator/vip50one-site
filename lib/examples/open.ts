// ONE Open's tools, shown in the Brain with example data (Parry, 18 Oct). Everything here is invented and labelled
// "Example": visitors are a first name and one initial (as ONE Open sends them), homes are made-up streets, and no
// action sends anything. Open House Protocol = four phases (Plan, Prepare, Host, Follow Up; Parry, 29 Sep). Pure.

export type Rating = "hot" | "warm" | "cold";
export type Phase = "plan" | "prepare" | "host" | "follow_up";

export const PHASES: { key: Phase; label: string }[] = [
  { key: "plan", label: "Plan" },
  { key: "prepare", label: "Prepare" },
  { key: "host", label: "Host" },
  { key: "follow_up", label: "Follow Up" },
];

export const RATING_WORD: Record<Rating, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };

export interface OpenHouse {
  id: string;
  street: string;
  city: string;
  when: string; // "Sat 25 Oct, 12:00-2:00 PM"
  upcoming: boolean;
  phase: Phase | "done";
  visitors: number;
  tasksLeft: number;
  hue: number;
}

export interface Visitor {
  id: string;
  name: string; // first name and one initial
  rating: Rating;
  source: string; // where they came from, in plain words
  agent: "none" | "has agent";
  note: string;
}

export interface Question {
  id: string;
  who: string;
  room: string;
  question: string;
  draft: string; // Pulse's answer draft; the agent sends it, or not
}

export interface ProtocolStep {
  phase: Phase;
  task: string;
  done: boolean;
}

export const OPEN_HOUSES: OpenHouse[] = [
  { id: "oh1", street: "123 Example Lane", city: "Sandy", when: "Sat 25 Oct, 12:00-2:00 PM", upcoming: true, phase: "prepare", visitors: 0, tasksLeft: 6, hue: 30 },
  { id: "oh2", street: "77 Copper Fox Ln", city: "Draper", when: "Sun 2 Nov, 1:00-3:00 PM", upcoming: true, phase: "plan", visitors: 0, tasksLeft: 9, hue: 200 },
  { id: "oh3", street: "45 Sample Court", city: "Midvale", when: "Sun 12 Oct, 1:00-3:00 PM", upcoming: false, phase: "follow_up", visitors: 14, tasksLeft: 2, hue: 140 },
  { id: "oh4", street: "310 Canyon Rim Rd", city: "Cottonwood Heights", when: "Sat 27 Sep, 11:00 AM-1:00 PM", upcoming: false, phase: "done", visitors: 9, tasksLeft: 0, hue: 265 },
];

// The 14 who signed in at 45 Sample Court on Sun 12 Oct.
export const OPEN_VISITORS: Visitor[] = [
  { id: "v1", name: "Sam R", rating: "hot", source: "Signed in on the iPad · saw the Zillow open house listing", agent: "none", note: "Pre-approved, wants to move before school starts." },
  { id: "v2", name: "Lee T", rating: "warm", source: "Signed in on the iPad · sign out front", agent: "none", note: "Renting nearby, lease ends in March." },
  { id: "v3", name: "Ana P", rating: "hot", source: "Signed in on the iPad · Facebook event", agent: "none", note: "Asked twice about the basement suite." },
  { id: "v4", name: "Chris B", rating: "cold", source: "Signed in on the iPad · neighbour", agent: "none", note: "Curious what the house will sell for." },
  { id: "v5", name: "Maya K", rating: "warm", source: "Scanned the QR code at the door", agent: "none", note: "Selling her condo first." },
  { id: "v6", name: "Omar S", rating: "warm", source: "Signed in on the iPad · Realtor.com", agent: "has agent", note: "Came with his agent's blessing; agent named on the form." },
  { id: "v7", name: "Grace H", rating: "cold", source: "Signed in on the iPad · neighbour", agent: "none", note: "Thinking of listing in spring." },
  { id: "v8", name: "Jon D", rating: "hot", source: "Scanned the QR code at the door · Instagram", agent: "none", note: "Wants a second look this week." },
  { id: "v9", name: "Rosa M", rating: "warm", source: "Signed in on the iPad · Homes.com", agent: "none", note: "Liked the kitchen, worried about the yard work." },
  { id: "v10", name: "Ben F", rating: "cold", source: "Signed in on the iPad · drove by", agent: "has agent", note: "Just looking." },
  { id: "v11", name: "Ivy C", rating: "warm", source: "Scanned the QR code at the door · sign out front", agent: "none", note: "First-time buyer, asked about the process." },
  { id: "v12", name: "Paul G", rating: "cold", source: "Signed in on the iPad · neighbour", agent: "none", note: "Lives two doors down." },
  { id: "v13", name: "Nina V", rating: "warm", source: "Signed in on the iPad · Zillow", agent: "none", note: "Relocating from Denver in the new year." },
  { id: "v14", name: "Tom A", rating: "cold", source: "Signed in on the iPad · Facebook event", agent: "has agent", note: "Agent already showing him homes." },
];

export const OPEN_QUESTIONS: Question[] = [
  { id: "q1", who: "Sam R", room: "Kitchen", question: "How old is the roof?", draft: "Hi Sam, thanks for coming by on Sunday. The roof was replaced in 2019, and the sellers have the paperwork. Happy to send it over or set up a second look." },
  { id: "q2", who: "Ana P", room: "Basement", question: "Does the basement suite have its own entrance?", draft: "Hi Ana, yes: the suite has its own side entrance and a separate laundry. Would you like to see it again this week?" },
  { id: "q3", who: "Rosa M", room: "Back yard", question: "Are the sprinklers on a timer?", draft: "Hi Rosa, they are, on a smart timer the sellers will leave behind. It runs the front and back on separate zones." },
  { id: "q4", who: "Chris B", room: "Living room", question: "What do you think this will sell for?", draft: "Hi Chris, that depends on the offers that come in. If you are thinking about your own home, I can put together a market analysis prepared for it. Want me to?" },
];

export const OPEN_REPORT = {
  street: "45 Sample Court",
  day: "Sun 12 Oct",
  seller: "the Parkers",
  feedback: [
    { what: "Kitchen and the light in the living room", count: 9, kind: "liked" as const },
    { what: "The basement suite with its own entrance", count: 6, kind: "liked" as const },
    { what: "Yard work looks like a lot", count: 4, kind: "concern" as const },
    { what: "Second bathroom needs updating", count: 3, kind: "concern" as const },
  ],
  next: "Two buyers asked for a second look this week. I will follow up with every visitor by Tuesday.",
};

export const OPEN_PROTOCOL: ProtocolStep[] = [
  { phase: "plan", task: "Pick the date with the seller", done: true },
  { phase: "plan", task: "Choose who hosts", done: true },
  { phase: "plan", task: "Post the open house on the listing sites", done: true },
  { phase: "prepare", task: "Order signs and riders", done: true },
  { phase: "prepare", task: "Invite the neighbours", done: true },
  { phase: "prepare", task: "Print the property sheet", done: false },
  { phase: "prepare", task: "Load the sign-in iPad", done: false },
  { phase: "host", task: "Start a safety check-in", done: false },
  { phase: "host", task: "Greet and sign in every visitor", done: false },
  { phase: "host", task: "Rate each visitor before you leave", done: false },
  { phase: "follow_up", task: "Answer visitor questions", done: false },
  { phase: "follow_up", task: "Send the seller report", done: false },
  { phase: "follow_up", task: "Follow up with every visitor", done: false },
];

export const SAFETY_BUDDY = { name: "Kelsey M", phoneShown: "(801) 555-0199" };
export const SAFETY_MINUTES = [30, 60, 90, 120] as const;

/** "30 min", "1 hr", "2 hr 30". */
export function minWords(m: number): string {
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h} hr${r ? ` ${r}` : ""}` : `${r} min`;
}

/** Hot / Warm / Cold counts for a list of visitors. */
export function ratingCounts(vs: Pick<Visitor, "rating">[]): Record<Rating, number> {
  const c = { hot: 0, warm: 0, cold: 0 };
  for (const v of vs) c[v.rating]++;
  return c;
}

/** Each phase's done / total, in protocol order. */
export function protocolProgress(steps: ProtocolStep[]): { phase: Phase; label: string; done: number; total: number }[] {
  return PHASES.map(({ key, label }) => {
    const mine = steps.filter((s) => s.phase === key);
    return { phase: key, label, done: mine.filter((s) => s.done).length, total: mine.length };
  });
}

/** The phase the open house is in: the first with something left to do ("done" when all are). */
export function currentPhase(steps: ProtocolStep[]): Phase | "done" {
  return protocolProgress(steps).find((p) => p.done < p.total)?.phase ?? "done";
}

/** "1:05:09" or "4:09" for a number of seconds left (never below 0). */
export function clockWords(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(r)}` : `${m}:${two(r)}`;
}

/** "2:15 PM": the time a check-in is due, in Mountain time. */
export function dueWords(startMs: number, minutes: number): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "numeric", minute: "2-digit" }).format(new Date(startMs + minutes * 60_000));
}

/** A tool orb is showing its labelled example (not the agent's own data). */
export function isExampleTool(n: { secondaryLabel?: string; summary?: string }): boolean {
  return !!n.secondaryLabel?.startsWith("Example") || !!n.summary?.includes("Example:");
}
