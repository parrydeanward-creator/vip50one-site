"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { masterClient } from "@/lib/server/auth.ts";
import { LAST_COOKIE, afterSignIn } from "@/lib/landing.ts";
import { SITE } from "@/lib/reset.ts";

// Sign in with the same email and password as ONE GO and ONE MOVE (MASTER). Afterwards: the place asked for, else
// where the agent last was in the Brain, else the Brain.
export async function signIn(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  const back = (e: string) => `/login?error=${e}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  if (!email || !password) redirect(back("missing"));
  const sb = await masterClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  // A wrong password comes back as a 400; anything else means MASTER couldn't be reached.
  if (error) redirect(back(error.status === 400 || error.status === 401 ? "wrong" : "down"));
  redirect(afterSignIn(next, (await cookies()).get(LAST_COOKIE)?.value));
}

const origin = async () => {
  const host = (await headers()).get("host") ?? "";
  return host.startsWith("localhost") ? `http://${host}` : SITE;
};

// A one-time sign-in link by email (audit stage 1 idea, approved 14 Oct). Only for existing accounts, and the page says
// the same thing either way.
export async function emailLink(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/login?error=missing&link=1");
  const sb = await masterClient();
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${await origin()}/auth/confirm?next=%2Fdashboard` } });
  if (error?.status === 429) redirect("/login?error=slow&link=1");
  redirect("/login?sent=1");
}

// Sign in with Google (approved 14 Oct); the button shows once MASTER's Google provider is on (GOOGLE_SIGNIN).
export async function google() {
  const sb = await masterClient();
  const { data } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${await origin()}/auth/confirm?next=%2Fdashboard` } });
  redirect(data?.url ?? "/login?error=down");
}
