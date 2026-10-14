// Reset a forgotten password on vip50one.com (audit stage 1, Parry 14 Oct: "fix the reset password"). MASTER auth sends
// the email; its link comes back to /auth/confirm, which signs the agent in and opens "Choose a new password".

export const SITE = "https://www.vip50one.com";
export const CONFIRM_PATH = "/auth/confirm";
export const NEW_PASSWORD_PATH = "/reset/new";
export const MIN_PASSWORD = 8;

/** Only a path on this site; anything else (another host, //host, a scheme) falls back to the Brain. */
export function safeNext(v: string | null | undefined, fallback = "/dashboard"): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return fallback;
  return v;
}

/** Where MASTER's email link returns to. */
export function confirmUrl(origin = SITE): string {
  return `${origin}${CONFIRM_PATH}?next=${encodeURIComponent(NEW_PASSWORD_PATH)}`;
}

/** A plain line for a new password, or null when it is fine. */
export function passwordProblem(a: string, b: string): string | null {
  if (a.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (a !== b) return "The two passwords don't match.";
  return null;
}

export const OTP_TYPES = ["recovery", "email", "signup", "invite", "magiclink", "email_change"] as const;
export type OtpType = (typeof OTP_TYPES)[number];
export const isOtpType = (v: unknown): v is OtpType => (OTP_TYPES as readonly unknown[]).includes(v);
