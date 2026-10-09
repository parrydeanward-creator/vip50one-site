// Contact permissions on the Brain's card (LEADS.md §2.5; Parry, 9 Oct: "how does the user change from no to yes or yes
// to no on contact permissions?"). Read and written through ONE MOVE (vip50-web-crm#130); only `contact_consent` rows
// are written there, never the old columns. A yes needs how they agreed and the agent's tick; after a stop, also
// "they asked to be added back". Nothing is sent to the contact.

const MOVE_URL = "https://move.vip50one.com";
export const permissionsUrl = (contactId: string) => `${MOVE_URL}/api/brain/people/${encodeURIComponent(contactId)}/permissions`;

export type Channel = "sms" | "email";
export type State = "yes" | "no" | "unknown";
export interface ChannelState {
  channel: Channel;
  label: string;
  address: string | null;
  state: State;
  needsAddedBack: boolean;
  carrierNote: string | null;
  since: string | null;
}
export interface Permissions {
  channels: ChannelState[];
  hows: { key: string; label: string }[];
  history: { at: string; channel: Channel; granted: boolean; line: string }[];
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isChannel = (v: unknown): v is Channel => v === "sms" || v === "email";

/** ONE MOVE's answer, checked; null when it is not one. */
export function readPermissions(j: unknown): Permissions | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (!Array.isArray(r.channels)) return null;
  const channels: ChannelState[] = [];
  for (const x of r.channels as Record<string, unknown>[]) {
    if (!isChannel(x?.channel)) continue;
    const state: State = x.state === "yes" || x.state === "no" ? x.state : "unknown";
    channels.push({
      channel: x.channel,
      label: str(x.label, 40) ?? (x.channel === "sms" ? "Texts" : "Email"),
      address: str(x.address, 120),
      state,
      needsAddedBack: x.needs_added_back === true,
      carrierNote: str(x.carrier_note, 300),
      since: str(x.since, 40),
    });
  }
  const hows = (Array.isArray(r.hows) ? r.hows : [])
    .map((h: unknown) => (h && typeof h === "object" ? { key: str((h as Record<string, unknown>).key, 30), label: str((h as Record<string, unknown>).label, 40) } : null))
    .filter((h): h is { key: string; label: string } => !!h?.key && !!h.label);
  const history = (Array.isArray(r.history) ? r.history : [])
    .map((h: unknown) => {
      const o = (h && typeof h === "object" ? h : {}) as Record<string, unknown>;
      const at = str(o.at, 40), line = str(o.line, 200);
      return at && line && isChannel(o.channel) ? { at, channel: o.channel, granted: o.granted === true, line } : null;
    })
    .filter((h): h is NonNullable<typeof h> => !!h)
    .slice(0, 6);
  return { channels, hows, history };
}

export const stateWord = (s: State) => (s === "yes" ? "Yes" : s === "no" ? "No" : "Not asked yet");

/** The POST body for "They said yes" (LEADS §2.5); null with the reason when it cannot be sent yet. */
export function yesBody(c: ChannelState, how: string, note: string, ticked: boolean, addedBack: boolean): { body: Record<string, unknown> } | { problem: string } {
  if (!c.address) return { problem: `There is no ${c.channel === "sms" ? "mobile number" : "email"} on file.` };
  if (!how) return { problem: "Pick how they agreed." };
  if (!ticked) return { problem: "Tick that you have their permission." };
  if (c.needsAddedBack && !addedBack) return { problem: "They stopped before. Tick that they asked to be added back." };
  return { body: { channel: c.channel, action: "yes", how, ...(note.trim() ? { note: note.trim().slice(0, 300) } : {}), permission: true, ...(c.needsAddedBack ? { added_back: true } : {}), via: "one_brain" } };
}
export const stopBody = (c: ChannelState) => ({ channel: c.channel, action: "stop", via: "one_brain" });
