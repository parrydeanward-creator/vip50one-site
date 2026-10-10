// Pulse workers' modes in the Brain's My Profile (LEADS v0.4 §3.3a, v0.5 §3.5; GO/MOVE vip50-web-crm#151). Three equal
// buttons per worker, nothing pre-selected, Autopilot confirmed once more and only once Pulse passed its hand-back
// test (MASTER enforces it; the Brain only shows the reason). Only the agent sets a mode.

const MOVE_URL = "https://move.vip50one.com";
export const pulseModesUrl = `${MOVE_URL}/api/brain/pulse-modes`;

export type Mode = "off" | "ask_me" | "autopilot";
export const MODES: Mode[] = ["off", "ask_me", "autopilot"];
export interface WorkerCard {
  worker: string;
  question: string;
  example: string;
  mode: Mode;
  chosen: boolean;
  blocked: string | null;
}
export interface PulseModes {
  askedAt: string | null;
  confirm: string;
  handback: string;
  label: Record<Mode, string>;
  line: Record<Mode, string>;
  workers: WorkerCard[];
}

const str = (v: unknown, n = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
const isMode = (v: unknown): v is Mode => v === "off" || v === "ask_me" || v === "autopilot";
const LABEL: Record<Mode, string> = { off: "Off", ask_me: "Ask me", autopilot: "Autopilot" };

/** ONE MOVE's answer, checked; null when it is not one. Words come from ONE MOVE so both places say the same. */
export function readPulseModes(j: unknown): PulseModes | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.workers)) return null;
  const lines = (r.mode_lines ?? {}) as Record<string, unknown>;
  const labels = (r.modes ?? {}) as Record<string, unknown>;
  const workers: WorkerCard[] = [];
  for (const x of r.workers as Record<string, unknown>[]) {
    const worker = str(x?.worker, 40), question = str(x?.question, 200);
    if (!worker || !question) continue;
    workers.push({ worker, question, example: str(x.example, 300) ?? "", mode: isMode(x.mode) ? x.mode : "off", chosen: x.chosen === true, blocked: str(x.autopilot_blocked, 200) });
  }
  return {
    askedAt: str(r.asked_at, 40),
    confirm: str(r.autopilot_confirm, 400) ?? "Pulse will send these emails without asking you first.",
    handback: str(r.handback_line, 300) ?? "",
    label: Object.fromEntries(MODES.map((m) => [m, str(labels[m], 20) ?? LABEL[m]])) as Record<Mode, string>,
    line: Object.fromEntries(MODES.map((m) => [m, str(lines[m], 200) ?? ""])) as Record<Mode, string>,
    workers,
  };
}

/** The POST body for one tap in My Profile. */
export const setBody = (worker: string, mode: Mode) => ({ set_via: "profile" as const, modes: { [worker]: mode } });
