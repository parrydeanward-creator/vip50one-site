// Looks Hot (CONNECTIONS §5.1; vip50-web-crm#244): a contact gets one suggestion when they give 2 Yes answers on Showly
// in 14 days, save 2 homes in 7 days, or come back to the site 3 times in 7 days. The agent decides: Move to Hot, or
// Dismiss (remembered 30 days). After Move to Hot, "Post a Buyer Need" opens ONE MOVE's draft inside the Brain. Nothing
// is sent or posted for the agent.

const MOVE_URL = "https://move.vip50one.com";
export const heatUrl = `${MOVE_URL}/api/brain/heat`;
export const HEAT_NODE = "move-looks-hot";

export type HeatReason = "reacted" | "saved" | "returned";
export interface HeatHome { propertyKey: string; address: string | null; city: string | null; price: number | null; beds: number | null; photo: string | null }
export interface HeatSuggestion { id: string; contactId: string | null; name: string; title: string; why: string | null; reason: HeatReason | null; homes: HeatHome[]; at: string | null }

const str = (v: unknown, max = 160) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
const https = (v: unknown) => {
  const s = str(v, 500);
  return s && s.startsWith("https://") ? s : null;
};

export function readHeat(j: unknown): HeatSuggestion[] | null {
  if (!j || typeof j !== "object" || !Array.isArray((j as { suggestions?: unknown }).suggestions)) return null;
  const out: HeatSuggestion[] = [];
  const seen = new Set<string>();
  for (const x of (j as { suggestions: Record<string, unknown>[] }).suggestions) {
    const id = str(x?.id, 60), name = str(x?.name, 80);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const reason = x.reason === "reacted" || x.reason === "saved" || x.reason === "returned" ? x.reason : null;
    const homes: HeatHome[] = [];
    for (const h of Array.isArray(x.homes) ? (x.homes as Record<string, unknown>[]) : []) {
      const key = str(h?.property_key, 80);
      if (!key) continue;
      homes.push({ propertyKey: key, address: str(h.address, 120), city: str(h.city, 60), price: num(h.price), beds: num(h.beds), photo: https(h.photo) });
      if (homes.length >= 6) break;
    }
    out.push({ id, contactId: str(x.contact_id, 60), name, title: str(x.title, 120) ?? `Looks Hot: ${name}`, why: str(x.why, 240), reason, homes, at: str(x.at, 40) });
  }
  return out;
}

// The orb itself is lib/looksHot.ts now (one Looks Hot orb with "Hot on your website" folded in; walker 17 Oct).

export interface HeatAnswer { ok: boolean; accepted: boolean; needUrl: string | null; error: string | null }
export function readHeatAnswer(ok: boolean, j: unknown): HeatAnswer {
  const r = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  if (!ok || r.ok === false) return { ok: false, accepted: false, needUrl: null, error: str(r.error, 200) ?? "ONE MOVE didn't take that. Try again." };
  const accepted = r.status !== "dismissed";
  return { ok: true, accepted, needUrl: accepted ? https(r.need_url) : null, error: null };
}

export const priceWords = (p: number | null) => (p ? (p >= 1_000_000 ? `$${(p / 1_000_000).toFixed(p % 1_000_000 ? 2 : 0)}M` : `$${Math.round(p / 1000)}k`) : null);

/** The example agent's tour Yes answers. */
export const demoHeat = (): HeatSuggestion[] =>
  readHeat({
    suggestions: [
      { id: "h1", contact_id: "c-amy", name: "Amy Chen", title: "Looks Hot: Amy Chen", why: "Said Yes to 2 homes on Thursday's tour", reason: "reacted", homes: [{ property_key: "k1", address: "88 W Pine Ct", city: "Draper", price: 615000, beds: 4, photo: null }, { property_key: "k2", address: "12 Elm Way", city: "Sandy", price: 589000, beds: 4, photo: null }], at: "2026-10-14T18:00:00Z" },
    ],
  }) ?? [];
