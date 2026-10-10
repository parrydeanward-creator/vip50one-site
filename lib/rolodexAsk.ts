import { suggestGroup, familyLabel, type CommunityBiz, type FamilyKey } from "./rolodex.ts";

// Pulse roadmap #14, VIP-SUMMARY §3i.9: "Who do agents trust for a roofer in
// Draper?" answered from the opt-in Rolodex Community the Brain already has.
// Plain rules, no AI: the question is split into what the business does and
// where; matches are ranked by trade, then place, then how many agents trust them.
// Notes are never in the Community, so they can never be in an answer.

export interface Ask { trade: string[]; said: string; family: FamilyKey | null; place: string | null }
export interface AskHit { biz: CommunityBiz; trust: number; here: boolean; exact: boolean }
export interface AskAnswer { ask: Ask; hits: AskHit[]; line: string }

const STOP = new Set(
  "who what which where do does did can could would should is are was a an the for to of in at near around by with my me i we our you your agents agent vip-50 vip50 trust trusted recommend recommends recommended good best great someone somebody anyone need needs find looking know any some use used please".split(" "),
);

// Trade words reduced to a shared stem, so "roofer", "roofing" and "roof" meet.
const STEMS: [RegExp, string][] = [
  [/^roof(er|ers|ing|s)?$/, "roof"],
  [/^plumb(er|ers|ing)?$/, "plumb"],
  [/^electric(ian|ians|al)?$/, "electric"],
  [/^paint(er|ers|ing)?$/, "paint"],
  [/^clean(er|ers|ing)?$/, "clean"],
  [/^landscap(e|er|ers|ing)$/, "landscap"],
  [/^inspect(or|ors|ion|ions)?$/, "inspect"],
  [/^apprais(er|ers|al|als)$/, "apprais"],
  [/^lend(er|ers|ing)$/, "lend"],
  [/^mov(er|ers|ing)$/, "mov"],
  [/^photograph(er|ers|y)?$/, "photograph"],
  [/^stag(er|ers|ing)$/, "stag"],
  [/^handym(an|en)$/, "handym"],
  [/^contract(or|ors)$/, "contract"],
];
export function stem(w: string): string {
  for (const [re, s] of STEMS) if (re.test(w)) return s;
  return w.length > 4 ? w.replace(/(ers|ing|er|s)$/, "") : w;
}

const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, " ").split(/\s+/).filter(Boolean);
const norm = (s: string | null) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Split a question into trade words and a place. A place is a city some shared
 * business works in (longest match wins), or the words after a final "in"/"near".
 */
export function readAsk(question: string, cities: string[]): Ask {
  const q = ` ${norm(question).replace(/[?.!,]/g, " ")} `.replace(/\s+/g, " ");
  let place: string | null = null;
  const known = [...new Set(cities.map(norm).filter(Boolean))].sort((a, b) => b.length - a.length);
  let rest = q;
  for (const c of known) {
    if (q.includes(` ${c} `)) {
      place = c;
      rest = q.replace(` ${c} `, " ");
      break;
    }
  }
  if (!place) {
    const m = q.match(/ (?:in|near|around) ([\p{L}\s'-]+?) ?$/u);
    if (m && m[1].trim()) {
      place = m[1].trim();
      rest = q.slice(0, m.index) + " ";
    }
  }
  const kept = words(rest).filter((w) => !STOP.has(w));
  const trade = kept.map(stem);
  const family = trade.length ? suggestGroup({ name: "", category: kept.join(" ") }) ?? suggestGroup({ name: "", category: trade.join(" ") }) : null;
  return { trade: [...new Set(trade)], said: kept.join(" "), family, place };
}

const title = (s: string) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

function tradeScore(b: CommunityBiz, ask: Ask): number {
  if (!ask.trade.length) return 1;
  const hay = words(`${b.category ?? ""} ${b.name}`).map(stem);
  const hit = ask.trade.filter((t) => hay.some((h) => h === t || (t.length >= 4 && h.startsWith(t)))).length;
  if (hit) return 2 + hit;
  return ask.family && ask.family !== "other" && b.family === ask.family ? 1 : 0;
}

/** The answer: up to `max` businesses, trade first, then the place, then trust. */
export function askCommunity(question: string, community: CommunityBiz[], myCity: string | null, max = 5): AskAnswer {
  const ask = readAsk(question, [...community.map((b) => b.city ?? ""), myCity ?? ""]);
  const scored = community
    .map((biz) => ({ biz, s: tradeScore(biz, ask), trust: biz.recommended_by.length, here: !!ask.place && norm(biz.city) === ask.place }))
    .filter((x) => x.s > 0);
  scored.sort((a, b) => Number(b.s >= 2) - Number(a.s >= 2) || Number(b.here) - Number(a.here) || b.trust - a.trust || b.s - a.s || a.biz.name.localeCompare(b.biz.name));
  const hits = scored.slice(0, max).map(({ biz, s, trust, here }) => ({ biz, trust, here, exact: s >= 2 }));
  const exact = scored.some((x) => x.s >= 2);
  return { ask, hits, line: askLine(ask, hits, scored.filter((x) => x.here && (x.s >= 2 || !exact)).length) };
}

/** Pulse's one line over the answer, in plain words. */
export function askLine(ask: Ask, hits: AskHit[], inPlace: number): string {
  const what = ask.said ? (/s$/.test(ask.said) ? ask.said : `${/^[aeiou]/.test(ask.said) ? "an" : "a"} ${ask.said}`) : "anything";
  const where = ask.place ? ` in ${title(ask.place)}` : "";
  if (!hits.length) return `No VIP-50 agent has shared a business for ${what}${where} yet. Ask in the Lounge, or add yours and share it.`;
  const top = hits[0];
  const by = top.trust > 1 ? `trusted by ${top.trust} agents` : top.trust === 1 ? `recommended by ${top.biz.recommended_by[0].me ? "you" : top.biz.recommended_by[0].name}` : "shared by a VIP-50 agent";
  if (ask.trade.length && !top.exact) {
    return `No one has shared a business for ${what} yet. Other ${familyLabel(top.biz.family)} businesses VIP-50 agents trust are below.`;
  }
  if (ask.place && !inPlace) return `None shared${where} yet. Nearest fit: ${top.biz.name}${top.biz.city ? ` (${top.biz.city})` : ""}, ${by}.`;
  const n = ask.place ? inPlace : hits.filter((h) => h.exact).length;
  return `${n} ${n === 1 ? "business" : "businesses"} for ${what}${where} VIP-50 agents trust. Top: ${top.biz.name}, ${by}.`;
}

/** Example questions, from what is really shared (the agent's city first). */
export function askExamples(community: CommunityBiz[], myCity: string | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const local = [...community].sort((a, b) => Number(norm(b.city) === norm(myCity)) - Number(norm(a.city) === norm(myCity)) || b.recommended_by.length - a.recommended_by.length);
  for (const b of local) {
    const what = norm(b.category);
    if (!what || seen.has(what) || what.length > 24) continue;
    seen.add(what);
    out.push(`${what}${b.city ? ` in ${b.city}` : ""}`);
    if (out.length === 3) break;
  }
  return out;
}
