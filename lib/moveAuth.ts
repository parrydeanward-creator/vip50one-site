import { MOVE_URL } from "./host.ts";

// The Brain calls ONE MOVE's /api/brain/* from the browser. ONE MOVE knows the agent by the shared .vip50one.com
// sign-in cookie, and a stale or missing copy of that cookie on move.vip50one.com makes every call answer 401 (17 Oct:
// Parry's "Pulse knows me" and Pulse switches never saved, while Julie's did). ONE MOVE also accepts the same MASTER
// session as `Authorization: Bearer <access token>` (vip50-web-crm lib/brain-auth.ts brainUserFrom), so every such call
// also carries the Brain's own current access token, from this site's /api/session-token. The token goes to ONE MOVE's
// exact origin and /api/brain/ only, never anywhere else, and is never logged.

/** Shown when ONE MOVE answers 401/403: it did not take the sign-in. */
export const SIGN_IN_LINE = "ONE MOVE did not recognise your sign-in. Sign out and back in, then try again.";

/** True for an answer that means ONE MOVE did not accept who is calling. */
export const isSignInRefusal = (status: number | undefined | null) => status === 401 || status === 403;

/** Where the browser asks this site for its own access token (same origin only). */
export const SESSION_TOKEN_PATH = "/api/session-token";

const MOVE_ORIGIN = new URL(MOVE_URL).origin;

/** True only for https://move.vip50one.com/api/brain/...: the one place the token may go. */
export function isMoveBrainUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false; // relative or malformed: this site's own path, never ONE MOVE
  }
  return u.protocol === "https:" && u.origin === MOVE_ORIGIN && !u.username && !u.password && u.pathname.startsWith("/api/brain/");
}

export interface CachedToken {
  token: string;
  /** Seconds since 1970, as MASTER's session gives it. */
  expiresAt: number;
}

/** A cached token is used until 60 seconds before it runs out. */
export function tokenStillGood(c: CachedToken | null, nowSec: number): c is CachedToken {
  return !!c && typeof c.token === "string" && c.token.length > 0 && Number.isFinite(c.expiresAt) && c.expiresAt - 60 > nowSec;
}

/** The answer of /api/session-token, or null when it is not a usable token. */
export function readSessionToken(j: unknown): CachedToken | null {
  const o = j as { access_token?: unknown; expires_at?: unknown } | null;
  if (!o || typeof o.access_token !== "string" || !o.access_token || typeof o.expires_at !== "number") return null;
  return { token: o.access_token, expiresAt: o.expires_at };
}

const urlOf = (input: RequestInfo | URL): string => (typeof input === "string" ? input : input instanceof URL ? input.href : input.url);

/**
 * Wraps fetch once so a call to ONE MOVE's /api/brain/* without its own Authorization also sends the Brain's access
 * token. Anything else goes through untouched; with no token to hand the call goes as before (cookie only).
 */
export function installMoveBearer(win: Window & typeof globalThis = window): void {
  const flag = win as unknown as { __oneMoveBearer?: boolean };
  if (flag.__oneMoveBearer || typeof win.fetch !== "function") return;
  flag.__oneMoveBearer = true;
  const orig = win.fetch.bind(win);
  let cached: CachedToken | null = null;
  let pending: Promise<CachedToken | null> | null = null;

  const token = async (): Promise<string | null> => {
    if (tokenStillGood(cached, Date.now() / 1000)) return cached.token;
    pending ??= orig(SESSION_TOKEN_PATH, { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(readSessionToken)
      .catch(() => null)
      .finally(() => {
        pending = null;
      });
    cached = await pending;
    return tokenStillGood(cached, Date.now() / 1000) ? cached.token : null;
  };

  win.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isMoveBrainUrl(urlOf(input))) return orig(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (headers.has("authorization")) return orig(input, init);
    const t = await token();
    if (!t) return orig(input, init);
    headers.set("Authorization", `Bearer ${t}`);
    const r = await orig(input, { ...init, headers });
    if (r.status === 401) cached = null; // signed out or replaced: ask again next time
    return r;
  };
}

/**
 * /api/session-token answers only the Brain's own pages: a browser marks a same-site page's call `Sec-Fetch-Site:
 * same-origin`, and any Origin it sends must be this host. Another site's page can never read the answer anyway (no
 * CORS on this route); this refuses it outright.
 */
export function sameOriginAsk(secFetchSite: string | null, origin: string | null, host: string | null): boolean {
  if (secFetchSite && secFetchSite !== "same-origin") return false;
  if (origin) {
    try {
      if (new URL(origin).host !== (host ?? "")) return false;
    } catch {
      return false;
    }
  }
  return !!secFetchSite || !!origin;
}
