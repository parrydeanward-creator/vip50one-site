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

/** The best voice on this device, or null to keep the browser's default. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[]): V | null {
  let best: V | null = null;
  let top = 0;
  for (const v of voices) {
    const s = voiceScore(v);
    if (s > top) [best, top] = [v, s];
  }
  return best;
}
