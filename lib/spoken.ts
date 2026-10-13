// VIP-SUMMARY §3o.13 bookends: the 7:00 Morning Pulse "with an optional 60-second spoken version". The Brain reads
// the same note aloud with the browser's own voice when the agent presses Listen. Nothing is recorded or sent.

/** About 150 words is 60 seconds at a normal speaking pace. */
export const SPOKEN_WORDS = 150;

/** The words Pulse says: a greeting, then the note, cut at a sentence end so it stays inside a minute. */
export function spokenMorning(greeting: string, firstName: string, note: string, max = SPOKEN_WORDS): string {
  const hello = `${greeting}${firstName ? `, ${firstName}` : ""}.`;
  const body = note.replace(/\s+/g, " ").trim();
  const words = (s: string) => (s ? s.split(" ").length : 0);
  let out = hello;
  for (const sentence of body.match(/[^.!?]+[.!?]*/g) ?? []) {
    const s = sentence.trim();
    if (!s) continue;
    if (words(out) + words(s) > max) break;
    out += ` ${s}`;
  }
  return out;
}
