import "server-only";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { cookieDomainFor } from "../host.ts";
import { MASTER_PUBLISHABLE_KEY, MASTER_URL } from "../master.ts";
import { firstNameOf, initials, isMember, packageOf, safeImage } from "../live.ts";
import type { PackageId } from "../types.ts";

// The signed-in agent, from MASTER's session cookie. getClaims() checks the
// token's signature (against MASTER's published keys, cached; it falls back to
// asking MASTER when it cannot check locally), so the email here is one MASTER
// vouches for. It replaces getUser(), which asked MASTER's auth server on every
// page: MASTER answers in about 0.1 s but has spikes of several seconds, and
// each one stalled the whole page (checked 1 Oct: /auth/v1/user up to 7.4 s).

export async function masterClient() {
  const store = await cookies();
  const domain = cookieDomainFor((await headers()).get("host"));
  return createServerClient(MASTER_URL, MASTER_PUBLISHABLE_KEY, {
    // Shared with move.vip50one.com on the real domain (lib/host.ts).
    cookieOptions: domain ? { domain, path: "/", sameSite: "lax" } : undefined,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // a server component cannot set cookies; the middleware refreshes them
        }
      },
    },
  });
}

export interface SignedIn {
  email: string;
  firstName: string;
  initials: string;
  displayName: string;
  pkg: PackageId;
  founding: boolean;
  member: boolean;
  photo?: string;
}

export interface Identity {
  id: string;
  email: string;
}

/** Who is signed in, or null. */
export async function identity(): Promise<Identity | null> {
  const sb = await masterClient();
  const { data } = await sb.auth.getClaims();
  const c = data?.claims as { sub?: string; email?: string } | undefined;
  if (!c?.sub || !c.email) return null;
  return { id: c.sub, email: c.email.trim().toLowerCase() };
}

/** The agent's own profile row, shaped for ONE. */
export async function profileOf(who: Identity): Promise<SignedIn> {
  const sb = await masterClient();
  const email = who.email;
  // Own row only (RLS: user_id = auth.uid()); only the columns ONE needs.
  const { data: p } = await sb
    .from("user_profiles")
    .select("display_name, avatar_url, one_plan, vip_access, subscription_status, founding_member")
    .eq("user_id", who.id)
    .maybeSingle();
  const displayName = (p?.display_name as string | null)?.trim() || "";
  const firstName = firstNameOf(displayName, email);
  return {
    email,
    firstName,
    displayName: displayName || firstName,
    initials: initials(displayName || firstName),
    pkg: packageOf(p?.one_plan as string | null),
    founding: p?.founding_member === true,
    photo: safeImage(p?.avatar_url as string | null),
    member: p ? isMember(p as { vip_access?: boolean; subscription_status?: string }) : false,
  };
}

export async function signedIn(): Promise<SignedIn | null> {
  const who = await identity();
  return who ? profileOf(who) : null;
}
