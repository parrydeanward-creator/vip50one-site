import { MOVE_URL } from "./host.ts";

// VIP-SUMMARY §3h (v1.12): Hot/Warm/Cold drawn natively in ONE Brain. The
// list, the classes and the daily-box credit are ONE MOVE's (vip50-web-crm#57);
// the Brain draws, opens the phone, and asks before moving anyone.

export type HwcClass = "hot" | "warm" | "cold";
export const CLASSES: { key: HwcClass; label: string; color: string; box: string }[] = [
  { key: "hot", label: "Hot", color: "#ff5a4f", box: "Hot Contact" },
  { key: "warm", label: "Warm", color: "#f5a742", box: "Warm Contact" },
  { key: "cold", label: "Cold", color: "#5aa9ff", box: "Cold Contact" },
];
export const CLASS_OF = Object.fromEntries(CLASSES.map((c) => [c.key, c])) as Record<HwcClass, (typeof CLASSES)[number]>;

export interface HwcPerson {
  id: string;
  name: string;
  cls: HwcClass;
  phone: string | null;
  contactId: string | null;
  photo: string | null;
  lastNote: string | null;
  lastNoteAt: string | null;
}
export interface Hwc {
  date: string;
  today: Record<HwcClass, boolean>;
  people: HwcPerson[];
}

export const hwcUrl = `${MOVE_URL}/api/brain/hwc`;

const isClass = (v: unknown): v is HwcClass => v === "hot" || v === "warm" || v === "cold";
const str = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function readHwc(raw: unknown): Hwc | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.people)) return null;
  const t = (r.today ?? {}) as Record<string, unknown>;
  const people: HwcPerson[] = [];
  for (const p of r.people as unknown[]) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const name = str(o.name, 120);
    if (typeof o.id !== "string" || !o.id || !name || !isClass(o.class)) continue;
    people.push({
      id: o.id,
      name,
      cls: o.class,
      phone: str(o.phone, 40),
      contactId: str(o.contact_id, 60),
      photo: str(o.photo, 800),
      lastNote: str(o.last_note, 200),
      lastNoteAt: str(o.last_note_at, 40),
    });
  }
  return { date: str(r.date, 10) ?? "", today: { hot: t.hot === true, warm: t.warm === true, cold: t.cold === true }, people };
}

/** "Move Sarah to Warm?" */
export function moveQuestion(firstName: string, to: HwcClass): string {
  return `Move ${firstName} to ${CLASS_OF[to].label}?`;
}

/** The list after moving one person, before ONE MOVE answers. */
export function withMoved(h: Hwc, id: string, to: HwcClass): Hwc {
  return { ...h, people: h.people.map((p) => (p.id === id ? { ...p, cls: to } : p)) };
}

/** "2 Oct" for an ISO time, in Denver. */
export function noteDay(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Denver", day: "numeric", month: "short" }).format(d);
}

/** "(801) 555-1234" for a US number; anything else as stored. */
export function phoneLine(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d.length === 10 ? d : null;
  return ten ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : phone;
}
