import { MOVE_URL } from "./host.ts";

// TEAM-ONBOARDING §5 (vip50-web-crm#258): Remove from team, and Put back. The team lead and admins see Remove on each
// row except the owner's; only the team lead removes an admin (the route refuses otherwise).

export const membersUrl = `${MOVE_URL}/api/brain/team/members`;

export type Role = "owner" | "admin" | "agent";
export interface Member { id: string; name: string; role: Role; active: boolean; leftAt: string | null }
export interface Members { myRole: Role; members: Member[] }

const role = (v: unknown): Role => (v === "owner" || v === "admin" ? v : "agent");

export function readMembers(j: unknown): Members | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  const team = r.team as Record<string, unknown> | null;
  if (!team || !Array.isArray(r.members)) return null;
  const myRole = role(team.role);
  if (myRole === "agent") return null; // only the lead and admins manage the team
  const members: Member[] = [];
  for (const m of r.members as Record<string, unknown>[]) {
    if (typeof m?.user_id !== "string") continue;
    members.push({ id: m.user_id, name: typeof m.name === "string" && m.name.trim() ? m.name.trim().slice(0, 80) : "Agent", role: role(m.role), active: m.active !== false, leftAt: typeof m.left_at === "string" ? m.left_at : null });
  }
  // the team lead first, then admins, then agents by name; people who left at the end
  const rank = (m: Member) => (m.active ? 0 : 10) + (m.role === "owner" ? 0 : m.role === "admin" ? 1 : 2);
  members.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  return { myRole, members };
}

/** Whether this manager may remove (or put back) this member. */
export function canRemove(me: Role, m: Member): boolean {
  if (m.role === "owner") return false;
  if (m.role === "admin") return me === "owner";
  return me === "owner" || me === "admin";
}

/** The confirm, in GO/MOVE's words (TEAM-ONBOARDING §5). */
export const removeConfirm = (name: string) =>
  `Remove ${name} from the team? Their open team leads come back to you, they leave lead rotation and the lead pool, and their team ads stop. Their own contacts stay theirs.`;

/** "Removed 15 Oct" */
export function removedLine(iso: string | null): string {
  if (!iso) return "Removed";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Removed" : `Removed ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" })}`;
}
