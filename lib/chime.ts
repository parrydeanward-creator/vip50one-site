// The ONE chime (VIP-SUMMARY §3o.11; Parry, 6 Oct: "weve got to add chimes or alerts as well"): a short
// two-note gold tone, five minutes before and at the start of each block, while the Brain is open. On by
// default; one switch turns it off (kept in this browser). Never more than one sound per block and moment.

export const CHIME_KEY = "one.chime";

export function chimeOn(): boolean {
  try {
    return localStorage.getItem(CHIME_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setChime(on: boolean) {
  try {
    localStorage.setItem(CHIME_KEY, on ? "on" : "off");
  } catch {}
}

// One sound context for the page. Browsers keep sound off until the agent first taps or clicks, so the
// Brain calls unlockChime() on its first pointer press.
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    if (ctx) return ctx;
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    ctx = Ctx ? new Ctx() : null;
    return ctx;
  } catch {
    return null;
  }
}
export function unlockChime() {
  const c = audio();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

/** Play the chime: two soft bell notes (G5 then D6); "firm" (leave-by, overdue) is three, ending low. */
export function playChime(firm = false) {
  const c = audio();
  if (!c) return;
  try {
    if (c.state === "suspended") c.resume().catch(() => {});
    const notes = firm ? [587.33, 783.99, 392] : [783.99, 1174.66];
    notes.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = c.currentTime + i * 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 1);
    });
  } catch {}
}

/** A desktop notice beside the chime, only once the agent has allowed them (asked once, by a button). */
export function notify(text: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("ONE", { body: text, icon: "/brand/vip50-one.webp", tag: "one-day" });
  } catch {}
}

/** Which chime is due now for a list of blocks: "soon" five minutes before, "start" at the start. Keys
 * already rung are skipped. Pure, for the Brain's minute tick. */
export function dueChimes(blocks: { id: string; start: string; done: boolean }[], nowMin: number, rung: Set<string>): { key: string; kind: "soon" | "start" }[] {
  const out: { key: string; kind: "soon" | "start" }[] = [];
  for (const b of blocks) {
    if (b.done) continue;
    const [h, m] = b.start.split(":").map(Number);
    const s = h * 60 + m;
    if (nowMin >= s - 5 && nowMin < s && !rung.has(`${b.id}:soon`)) out.push({ key: `${b.id}:soon`, kind: "soon" });
    if (nowMin >= s && nowMin < s + 2 && !rung.has(`${b.id}:start`)) out.push({ key: `${b.id}:start`, kind: "start" });
  }
  return out;
}
