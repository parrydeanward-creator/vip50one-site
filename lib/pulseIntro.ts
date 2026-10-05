import type { Need } from "./needs.ts";

// The Pulse card (Parry, 5 Oct): click the centre ONE orb and Pulse says what it
// does now and what is coming. Kept in step with PULSE-ROADMAP.md in
// vip50-ecosystem: a feature moves from COMING to LIVE when it is live there.

export interface IntroItem {
  title: string;
  line: string;
}

export const LIVE: readonly IntroItem[] = [
  { title: "Follow the pulse", line: "Pulsing red needs you right now: overdue or urgent. Pulsing yellow needs your attention today. A still green ring means all is good and in order. Every orb above a pulse pulses too, with a count, so you can follow it straight to the person." },
  { title: "Who needs you today", line: "Pulse reads your VIP-50, your Hot, Warm and Cold lists and your whole database, and puts the right people in front of you." },
  { title: "Special days", line: "Birthdays, anniversaries and home anniversaries glow gold and come first, so you are the one who remembered." },
  { title: "Morning Pulse", line: "A short walk through your day: what changed, who needs you, and the one move that matters most." },
  { title: "Ask Pulse", line: "Plain questions, straight answers from your own business. \"Who haven't I called in 60 days?\"" },
  { title: "Always the why", line: "Every suggestion shows its reason. You never have to guess why someone is in front of you." },
  { title: "Live numbers", line: "Your trackers, VIP touches and goals update within a minute as you work in ONE GO and ONE MOVE." },
  { title: "Every person, every detail", line: "Open anyone in the middle of the screen: their family, favourites, history and every touch." },
];

export const COMING: readonly IntroItem[] = [
  { title: "Call Prep", line: "A ten-second card before every call: when you last spoke, their family, their favourites, what to ask." },
  { title: "Pulse Drafts", line: "Every text, email, video-text script and handwritten note written in your voice. You edit and send." },
  { title: "Talk, don't type", line: "After a call, just speak. Pulse files the notes and sets the follow-up." },
  { title: "Referral and life-event radar", line: "Who sends you business, who will, and the moments that matter in their lives." },
  { title: "Goal pacing and a weekly coach", line: "Exactly what this week needs to keep you on pace for your year." },
  { title: "Pulse Match and Market Pulse", line: "The right homes for every buyer, and a market report for every VIP, from the MLS." },
];

export const PROMISE = "Pulse suggests and writes. You decide what goes out. Nothing is texted, emailed or posted for you unless you chose it.";

const PRODUCTS: Record<string, string> = {
  complete: "ONE GO, ONE MOVE, Marquee, ONE Open and Showly",
  relationship: "ONE GO and ONE MOVE",
};

/** "Your ONE Complete gives Pulse all five products." Unknown packages say nothing. */
export function packageLine(pkg: string | undefined): string {
  if (pkg === "complete") return `Your ONE Complete gives Pulse all five: ${PRODUCTS.complete}.`;
  if (pkg === "relationship") return `Your ONE Relationship gives Pulse ${PRODUCTS.relationship}. Marquee, ONE Open and Showly join it with ONE Complete.`;
  return "";
}

/** The first line of the card, from what needs the agent right now. */
export function todayLine(total: Need | undefined): string {
  if (!total) return "Nothing needs you right now. Pulse is watching.";
  const n = total.count;
  return `${n} ${n === 1 ? "thing needs" : "things need"} you${total.level === "now" ? ", some overdue" : " today"}. Follow the pulse.`;
}

export const SEEN_KEY = "one.pulseIntro.seen";
