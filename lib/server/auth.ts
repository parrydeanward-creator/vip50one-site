import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { MASTER_PUBLISHABLE_KEY, MASTER_URL } from "../master.ts";
import { firstNameOf, initials, isMember, packageOf, safeImage } from "../live.ts";
import type { PackageId } from "../types.ts";

// The signed-in agent, from MASTER's session cookie. getUser() asks MASTER to
// verify the token, so the email here is one MASTER vouches for.

export async function masterClient() {
  const store = await cookies();
  return createServerClient(MASTER_URL, MASTER_PUBLISHABLE_KEY, {
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

export async function signedIn(): Promise<SignedIn | null> {
  const sb = await masterClient();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user?.email) return null;
  const email = user.email.trim().toLowerCase();
  // Own row only (RLS: user_id = auth.uid()); only the columns ONE needs.
  const { data: p } = await sb
    .from("user_profiles")
    .select("display_name, avatar_url, one_plan, vip_access, subscription_status, founding_member")
    .eq("user_id", user.id)
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
