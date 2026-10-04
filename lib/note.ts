import { includes, productName } from "./products.ts";
import { isOverdue } from "./rank.ts";
import type { DashboardData, Item, ProductId } from "./types.ts";

// The morning note: a short paragraph at the top of the dashboard and one
// line per product card. Written by the AI from the ranked items only; this
// file holds the parts that do not need the AI (the prompt, the rules-based
// fallback, and the check on what comes back).

export interface MorningNote {
  opening: string;
  note: string;
  cards: Partial<Record<ProductId, string>>;
  source: "ai" | "rules";
}

export const SYSTEM_PROMPT = `You are Pulse, the AI inside VIP-50 ONE. You write the morning note on a real estate agent's ONE Brain dashboard.

VIP-50 is a sphere-of-influence system: the agent keeps 50 key relationships warm: every month a call, a video text, a social touch, the newsletter and a mixer invite; every quarter a face-to-face, a handwritten note and a drop-by and aims for 25 or more referral closings a year, with no cold calling and no bought leads.

Write in Parry Ward's voice: direct, plain, confident, a little blunt. Short sentences. No hype, no exclamation marks, no emojis, no corporate words. Talk to the agent as "you".

Rules:
- Use only the items and numbers you are given. Never invent a person, a property, a number, a time or a task.
- Put people first: a VIP touch or a birthday before paperwork.
- Never say anything has been published, sent, approved or scheduled for the agent. The agent approves and presses the button; you only point.
- If something is marked alert, say it first and plainly.
- "opening" is one short sentence (under 12 words) that frames the day.
- "note" is 2 to 4 sentences naming the few things that matter most today and why.
- "cards" has at most one short line (under 14 words) for each product you were given items or numbers for, saying what to do there next. Leave a product out if there is nothing useful to say.`;

export function describeDay(data: DashboardData, ranked: Item[]): string {
  const sb = data.scoreboard;
  const lines: string[] = [];
  lines.push(`Agent first name: ${data.agent.firstName}`);
  lines.push(`Today: ${data.today}`);
  if (sb)
    lines.push(
      `Scoreboard: ${sb.touchesThisMonth} of ${sb.touchGoal} touches this month; VIP list ${sb.vipCount} of ${sb.vipGoal}; streak ${sb.streakDays} days; ${sb.referralsThisYear} referrals and ${sb.closingsThisYear} of ${sb.closingsGoal} closings this year.`,
    );
  lines.push("");
  lines.push("Today's items, most important first:");
  ranked.forEach((item, i) => {
    const overdue = isOverdue(item, data.today) ? " (overdue)" : "";
    const detail = item.detail ? ` -- ${item.detail}` : "";
    lines.push(
      `${i + 1}. [${productName(item.product)}] [${item.urgency}${overdue}] ${item.title}${detail}`,
    );
  });
  lines.push("");
  lines.push("Product cards:");
  for (const p of data.products) {
    if (!includes(data.agent.package, p.product) || !p.reachable) continue;
    const stats = p.stats.map((s) => `${s.label}: ${s.value}`).join("; ");
    lines.push(`- ${productName(p.product)} (${p.product}): ${stats}. ${p.statusLine}`);
  }
  return lines.join("\n");
}

// Used when there is no API key, the call fails, is slow, or declines.
export function rulesNote(data: DashboardData, ranked: Item[]): MorningNote {
  const top = ranked.slice(0, 3);
  const count = ["Nothing", "One thing", "Two things", "Three things"][top.length];
  const note =
    top.length === 0
      ? "Nothing is waiting on you. Pick three VIPs and touch them anyway."
      : `${count} first. ${top.map((i) => sentence(i.title)).join(" ")}`;
  return {
    opening: `Good morning, ${data.agent.firstName}. Here's your day.`,
    note,
    cards: {},
    source: "rules",
  };
}

function sentence(s: string): string {
  const t = s.trim();
  return /[.?!]$/.test(t) ? t : `${t}.`;
}

// Keep only card lines for products this agent has and that answered.
export function cleanCards(
  data: DashboardData,
  cards: { product: string; line: string }[],
): Partial<Record<ProductId, string>> {
  const out: Partial<Record<ProductId, string>> = {};
  for (const c of cards) {
    const p = data.products.find((x) => x.product === c.product);
    if (!p || !p.reachable || !includes(data.agent.package, p.product)) continue;
    const line = c.line.trim();
    if (line) out[p.product] = line;
  }
  return out;
}
