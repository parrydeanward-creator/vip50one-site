// Ask a group for permission (LEADS §2.3a; GO/MOVE vip50-web-crm#144). The agent picks a group; each person not asked
// yet comes with their own 60-day yes/no link and a plain text. The agent texts each one from their own phone or Mac
// (Messages); nothing is sent by ONE. Asking is logged on the contact's timeline, never as a VIP touch.

const MOVE_URL = "https://move.vip50one.com";
export const askUrl = (group?: string) => `${MOVE_URL}/api/brain/permissions/ask${group ? `?group=${encodeURIComponent(group)}` : ""}`;
export const askLogUrl = `${MOVE_URL}/api/brain/permissions/ask`;

export interface AskGroup {
  key: string;
  label: string;
  count: number;
}
export interface AskPerson {
  id: string;
  name: string;
  phone: string;
  text: string;
}

const str = (v: unknown, n = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

export function readGroups(j: unknown): AskGroup[] | null {
  const g = j && typeof j === "object" ? (j as { groups?: unknown }).groups : null;
  if (!Array.isArray(g)) return null;
  return (g as Record<string, unknown>[])
    .map((x) => ({ key: str(x?.key, 30) ?? "", label: str(x?.label, 60) ?? "", count: typeof x?.count === "number" && x.count >= 0 ? Math.round(x.count) : 0 }))
    .filter((x) => x.key && x.label);
}

/** The people to ask; a text must carry ONE MOVE's own /ok/ link, or the person is left out. */
export function readPeople(j: unknown): AskPerson[] | null {
  const p = j && typeof j === "object" ? (j as { people?: unknown }).people : null;
  if (!Array.isArray(p)) return null;
  const out: AskPerson[] = [];
  for (const x of p as Record<string, unknown>[]) {
    const id = str(x?.contact_id, 60), name = str(x?.name, 80), phone = str(x?.phone, 30), text = str(x?.text, 400);
    if (!id || !name || !phone || !text || !text.includes(`${MOVE_URL}/ok/`)) continue;
    out.push({ id, name, phone, text });
  }
  return out.slice(0, 300);
}

export const logBody = (ids: string[]) => ({ contact_ids: [...new Set(ids)].slice(0, 500) });
