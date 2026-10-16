// The free voice (Parry, 16 Oct: "yes on free voice"): Pulse speaks in the most natural voice the device already has,
// at no cost. Edge's and Windows' "Natural" voices, Apple's Premium/Enhanced and Siri voices, and Chrome's Google voice
// sound close to a person; older built-in voices sound robotic. pickVoice ranks what the browser offers and takes the
// best English one; nothing is downloaded or paid for. Where the device has nothing better, the browser's default stays.

export type VoiceLike = { name: string; lang: string; localService?: boolean; default?: boolean };

// Novelty and robotic voices that ship with macOS/iOS and Chrome OS: never chosen.
const NEVER = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|fred|good news|jester|junior|organ|superstar|trinoids|whisper|wobble|zarvox|ralph|kathy|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;

export function voiceScore(v: VoiceLike): number {
  if (!/^en([-_]|$)/i.test(v.lang) || NEVER.test(v.name)) return -1;
  let s = 0;
  if (/natural|neural/i.test(v.name)) s += 60; // Edge / Windows online voices
  if (/premium/i.test(v.name)) s += 55; // Apple downloaded voices
  if (/enhanced/i.test(v.name)) s += 45;
  if (/siri/i.test(v.name)) s += 40;
  if (/^google\b/i.test(v.name)) s += 35; // Chrome's network voice
  if (/\b(samantha|ava|allison|aria|jenny|guy|zoe|evan|nathan|joelle)\b/i.test(v.name)) s += 10;
  if (/compact/i.test(v.name)) s -= 20;
  if (/^en[-_]US$/i.test(v.lang)) s += 8;
  else if (/^en[-_](GB|AU|CA|IE|NZ)$/i.test(v.lang)) s += 3;
  if (v.default) s += 1;
  return s;
}

// Man or woman (Parry, 16 Oct: "can we let the user pick which voice they want man or woman?"). Default Man until the
// agent chooses (he asked for a man's voice). Names of the natural voices each platform ships.
export type VoiceKind = "man" | "woman";
export const DEFAULT_VOICE_KIND: VoiceKind = "man";
const MAN = /\b(guy|christopher|eric|andrew|brian|davis|roger|steffan|tony|jason|evan|nathan|aaron|alex|daniel|tom|oliver|arthur|male)\b/i;
const WOMAN = /\b(aria|jenny|michelle|ana|emma|ava|samantha|allison|zoe|joelle|susan|serena|karen|moira|tessa|fiona|victoria|kate|female|libby|sonia)\b/i;
/** "man", "woman" or null when the name does not say. Chrome's plain "Google US English" is a woman's voice. */
export function voiceKind(v: VoiceLike): VoiceKind | null {
  if (MAN.test(v.name)) return "man";
  if (WOMAN.test(v.name) || /^google us english$/i.test(v.name.trim())) return "woman";
  return null;
}

/** The best voice on this device, of the agent's kind when the device has a natural one; else the best of any kind
 * (`fellBack` true so the page can say so). Null keeps the browser's default. */
export function pickVoiceOf<V extends VoiceLike>(voices: readonly V[], kind: VoiceKind = DEFAULT_VOICE_KIND): { voice: V | null; fellBack: boolean } {
  let best: V | null = null, top = 0, any: V | null = null, anyTop = 0;
  for (const v of voices) {
    const s = voiceScore(v);
    if (s > anyTop) [any, anyTop] = [v, s];
    if (voiceKind(v) === kind && s > top) [best, top] = [v, s];
  }
  if (best) return { voice: best, fellBack: false };
  return { voice: any, fellBack: !!any };
}

/** The best voice on this device, or null to keep the browser's default. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], kind: VoiceKind = DEFAULT_VOICE_KIND): V | null {
  return pickVoiceOf(voices, kind).voice;
}

/** The line under Listen when the device has no natural voice of the chosen kind. */
export function fallbackLine(kind: VoiceKind): string {
  return kind === "man" ? "This device has no natural man's voice, so Pulse is using a woman's." : "This device has no natural woman's voice, so Pulse is using a man's.";
}

const KIND_KEY = "one.pulseVoice";
/** The fast local copy of the agent's choice. MASTER keeps the choice (user_profiles.pulse_voice, vip50-web-crm#277);
 * the Brain writes MASTER's value here whenever it loads the profile (syncKind), so say() reads it on every page. In
 * the demo this is the only store. */
export function readKind(): VoiceKind {
  try {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(KIND_KEY) : null;
    return v === "woman" || v === "man" ? v : DEFAULT_VOICE_KIND;
  } catch {
    return DEFAULT_VOICE_KIND;
  }
}
export function saveKind(k: VoiceKind): void {
  try { window.localStorage.setItem(KIND_KEY, k); } catch { /* private window */ }
}

/** The agent's choice in ONE MOVE's /api/brain/profile answer: "man" or "woman"; null (never chosen) is Man; undefined
 * when the answer does not carry pulse_voice at all (an older route), so the local copy is left as it is. */
export function readPulseVoice(raw: unknown): VoiceKind | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !("pulse_voice" in raw)) return undefined;
  const v = (raw as { pulse_voice: unknown }).pulse_voice;
  if (v === "man" || v === "woman") return v;
  return v == null ? DEFAULT_VOICE_KIND : undefined;
}

/** Write MASTER's choice into the local copy; returns it (undefined when the answer did not say). */
export function syncKind(raw: unknown): VoiceKind | undefined {
  const k = readPulseVoice(raw);
  if (k) saveKind(k);
  return k;
}

/** The POST body for ONE MOVE's /api/brain/profile. */
export const voiceKindBody = (k: VoiceKind) => ({ pulse_voice: k });
