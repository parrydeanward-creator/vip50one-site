import { MOVE_URL } from "./host.ts";

// My Profile > Google Contacts and Google Calendar, the same cards as ONE MOVE's Classic profile. ONE MOVE's own
// /api/google routes answer through this site's /api proxy with the agent's own session (next.config.ts); Connect
// goes at the top to ONE MOVE, which sends the agent to Google and back to /dashboard/profile (from=brain).

export const googleStatusUrl = "/api/google/status";
export const googlePhotosUrl = "/api/google/photos";
export const googleDisconnectUrl = "/api/google/disconnect";
export const calendarSyncUrl = "/api/google/calendar/sync";
export const calendarDisconnectUrl = "/api/google/calendar/disconnect";
export const connectContactsUrl = `${MOVE_URL}/api/google/connect?from=brain`;
export const connectCalendarUrl = `${MOVE_URL}/api/google/connect?want=calendar&from=brain`;

export interface GoogleState {
  available: boolean;
  connected: boolean;
  lastPhotosAt: string | null;
  calendarAvailable: boolean;
  calendarOn: boolean;
  calendarSyncedAt: string | null;
  calendarError: string | null;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

export function readGoogle(raw: unknown): GoogleState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.available !== "boolean") return null;
  return {
    available: r.available,
    connected: r.connected === true,
    lastPhotosAt: str(r.last_photos_at),
    calendarAvailable: r.calendar_available === true,
    calendarOn: r.calendar_on === true,
    calendarSyncedAt: str(r.calendar_synced_at),
    calendarError: str(r.calendar_error),
  };
}

/** "14 Oct, 3:05 pm" in the agent's own time; "" for nothing. */
export function shortWhen(iso: string | null, tz?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz });
}
