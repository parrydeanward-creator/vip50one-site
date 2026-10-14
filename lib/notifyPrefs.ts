// My Profile > Notifications, the same two switches as ONE MOVE's Classic card (MASTER notification_preferences,
// honoured by /api/notify for phone push and browser alerts). A missing row means both on, as in Classic.

export const notifyUrl = "/api/notifications";
export const NOTIFY_KEYS = ["dm", "community"] as const;
export type NotifyKey = (typeof NOTIFY_KEYS)[number];
export const NOTIFY_LABEL: Record<NotifyKey, { label: string; sub: string; column: string }> = {
  dm: { label: "Personal messages", sub: "When another member sends you a message.", column: "dm_notifications_enabled" },
  community: { label: "The Lounge", sub: "When someone posts in the Lounge.", column: "community_notifications_enabled" },
};

export type NotifyPrefs = Record<NotifyKey, boolean>;

export function readNotify(raw: unknown): NotifyPrefs | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.dm !== "boolean" || typeof r.community !== "boolean") return null;
  return { dm: r.dm, community: r.community };
}

/** The one change a POST may carry: { key, on }. */
export function readChange(raw: unknown): { key: NotifyKey; on: boolean } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!NOTIFY_KEYS.includes(r.key as NotifyKey) || typeof r.on !== "boolean") return null;
  return { key: r.key as NotifyKey, on: r.on };
}
