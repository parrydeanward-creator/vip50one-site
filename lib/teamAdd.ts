// Add a member (TEAM-ONBOARDING §1a; vip50-web-crm#246): one Add turns everything on in MASTER. Managers only; the
// server checks (403 for agents). A paid team with no free seat answers 402 with the price; nothing is charged here.

export const teamAddUrl = "https://move.vip50one.com/api/brain/team/members/add";

export interface AddForm { name: string; email: string; phone: string; role: "agent" | "admin"; rotation: boolean }
export type AddAnswer =
  | { kind: "added"; line: string }
  | { kind: "already"; line: string }
  | { kind: "seat"; line: string }
  | { kind: "error"; line: string };

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export function checkAdd(f: AddForm): string | null {
  if (!clip(f.name, 120)) return "Add their name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clip(f.email, 200))) return "Add an email we can send the welcome to.";
  if (f.phone && f.phone.replace(/\D/g, "").length < 7) return "That mobile number looks short.";
  return null;
}

export function addBody(f: AddForm) {
  const b: Record<string, unknown> = { name: clip(f.name, 120), email: clip(f.email, 200).toLowerCase(), role: f.role, rotation: f.rotation };
  const phone = clip(f.phone, 40);
  if (phone) b.phone = phone;
  return b;
}

export function readAdd(status: number, j: unknown, name: string): AddAnswer {
  const r = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  const err = typeof r.error === "string" && r.error.trim() ? r.error.trim().slice(0, 240) : null;
  if (status === 402) return { kind: "seat", line: err ?? "Every seat is in use. Adding a seat is a monthly charge; ask Parry." };
  if (status === 403) return { kind: "error", line: err ?? "Only the team lead or an admin can add members." };
  if (status !== 200 || r.ok === false) return { kind: "error", line: err ?? "That didn't go through. Nothing was changed." };
  if (r.already === true) return { kind: "already", line: `${name} is already on the team.` };
  return { kind: "added", line: `${name} is on the team, with everything switched on.${r.emailed === true ? " A welcome email with their set-password link is on its way." : ""}` };
}
