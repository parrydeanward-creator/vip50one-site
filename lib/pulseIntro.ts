import type { Need } from "./needs.ts";

// The Pulse card (Parry, 5 Oct): click the centre ONE orb and Pulse says what it
// does now and what is coming. Kept in step with PULSE-ROADMAP.md in
// vip50-ecosystem: a feature moves from COMING to LIVE when it is live there.

export interface IntroItem {
  title: string;
  line: string;
}

/** Meet Pulse, short (Parry, 14 Oct: "i like it...go with it."; audit stage 2). No "Coming next": Pulse Match and
 * Market Pulse join this list the day they are live (PULSE-ROADMAP rows 19-20). */
export const LEDE: readonly string[] = [
  "Pulse is the AI inside ONE.",
  "It watches your whole business and puts the few things that matter in front of you.",
  "It suggests and writes. You decide what goes out.",
];

export const LIVE: readonly IntroItem[] = [
  { title: "Follow the pulse", line: "Tap whatever is red. It leads you to the person." },
  { title: "Morning Pulse", line: "Your day in one minute, and the one move that matters most." },
  { title: "Ask Pulse", line: "\"Who haven't I called in 60 days?\" Straight answers from your business." },
  { title: "Written for you", line: "Texts, emails and notes in your voice. You edit and send." },
  { title: "Plan my day", line: "Built round your calendar, sent to ONE GO on your phone." },
];

export const PROMISE = "Pulse suggests and writes. You decide what goes out. Nothing is texted, emailed or posted for you unless you chose it.";

const NAME: Record<string, string> = { relationship: "ONE Relationship", complete: "ONE Complete", elite: "Elite", growth: "ONE Growth" };
const PRODUCTS: Record<string, string[]> = {
  relationship: ["ONE GO", "ONE MOVE"],
  complete: ["ONE GO", "ONE MOVE", "Marquee", "ONE Open", "Showly"],
  elite: ["ONE GO", "ONE MOVE", "Marquee", "ONE Open", "Showly"],
  growth: ["ONE MOVE", "your website"],
};
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** "Your plan: ONE Complete + ONE Growth. Pulse works across ..." from MASTER's one_plan and growth_addon; names only
 * what the agent has. Unknown packages say nothing. */
export function packageLine(pkg: string | undefined, growth = false): string {
  if (!pkg || !PRODUCTS[pkg]) return "";
  const addGrowth = growth && pkg !== "growth";
  const plan = `${NAME[pkg]}${addGrowth ? " + ONE Growth" : ""}`;
  const across = [...PRODUCTS[pkg]];
  if (pkg === "growth" || addGrowth) across.push(pkg === "growth" ? "your Growth ads and leads" : "your Growth ads and leads");
  const glue = addGrowth ? `${across.slice(0, -1).join(", ")}, and ${across[across.length - 1]}` : list(across);
  return `Your plan: ${plan}. Pulse works across ${glue}.`;
}

/** ONE Growth's checkout (sold from 13 Oct, "growth on"; GROWTH.md §2). */
export const GROWTH_ADD_URL = "https://move.vip50one.com/join/growth";
/** The add-on offer for a Complete or Elite agent without ONE Growth (GROWTH.md §2: $199/mo); null for anyone else. */
export function growthOffer(pkg: string | undefined, hasGrowth: boolean): string | null {
  if (hasGrowth || (pkg !== "complete" && pkg !== "elite")) return null;
  return "Add ONE Growth for $199/month: Pulse runs your ads, farms your areas and answers new leads in seconds. Ad spend is paid by you, at cost. Month-to-month.";
}

/** The first line of the card, from what needs the agent right now. */
export function todayLine(total: Need | undefined): string {
  if (!total) return "Nothing needs you right now. Pulse is watching.";
  const n = total.count;
  return `${n} ${n === 1 ? "thing needs" : "things need"} you${total.level === "now" ? ", some overdue" : " today"}.`;
}

export const SEEN_KEY = "one.pulseIntro.seen";
