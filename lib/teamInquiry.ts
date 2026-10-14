// "Talk to Parry" for teams and brokerages (Parry, 14 Oct; ECOSYSTEM §7.1). The visitor's own details go to MASTER
// `team_inquiry_save` (GO/MOVE stores them and emails Parry). Nothing is charged and nothing is sent to the visitor.

export interface TalkForm {
  name: string;
  email: string;
  phone: string;
  team: string;
  agents: number | null;
}

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Checks and trims what the visitor typed. Returns a plain line on a problem. */
export function readTalk(body: unknown): { ok: true; form: TalkForm } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  // A filled hidden field means a robot filled the form.
  if (clip(b.website, 200)) return { ok: false, error: "Something went wrong. Please try again." };
  const name = clip(b.name, 120);
  const email = clip(b.email, 200).toLowerCase();
  const phone = clip(b.phone, 40);
  const team = clip(b.team, 160);
  const n = Number(b.agents);
  const agents = Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), 100000) : null;
  if (!name) return { ok: false, error: "Please add your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Please add an email we can reply to." };
  if (phone && phone.replace(/\D/g, "").length < 7) return { ok: false, error: "That phone number looks short." };
  if (!team) return { ok: false, error: "Please add your team or brokerage name." };
  return { ok: true, form: { name, email, phone, team, agents } };
}
