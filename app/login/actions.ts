"use server";

import { redirect } from "next/navigation";
import { masterClient } from "@/lib/server/auth.ts";

// Sign in with the same email and password as ONE GO and ONE MOVE (MASTER).
export async function signIn(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing");
  const sb = await masterClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  // A wrong password comes back as a 400; anything else means MASTER couldn't be reached.
  if (error) redirect(error.status === 400 || error.status === 401 ? "/login?error=wrong" : "/login?error=down");
  redirect("/dashboard");
}
