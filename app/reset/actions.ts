"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { masterClient } from "@/lib/server/auth.ts";
import { SITE, confirmUrl, passwordProblem } from "@/lib/reset.ts";

// Always the same answer, whether or not the email has an account, so the page never tells anyone who is a member.
export async function requestReset(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/reset?error=email");
  const host = (await headers()).get("host") ?? "";
  const origin = host.startsWith("localhost") ? `http://${host}` : SITE;
  const sb = await masterClient();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: confirmUrl(origin) });
  // Too many tries is the one thing worth saying; any other failure still reads as sent.
  if (error?.status === 429) redirect("/reset?error=slow");
  redirect("/reset?sent=1");
}

export async function setNewPassword(form: FormData) {
  const a = String(form.get("password") ?? "");
  const b = String(form.get("again") ?? "");
  const problem = passwordProblem(a, b);
  if (problem) redirect(`/reset/new?error=${encodeURIComponent(problem)}`);
  const sb = await masterClient();
  const { data } = await sb.auth.getClaims();
  if (!data?.claims?.sub) redirect("/reset?error=expired");
  const { error } = await sb.auth.updateUser({ password: a });
  if (error) {
    const line = error.status === 422 ? "Choose a password you haven't used here before." : "That didn't save. Try again.";
    redirect(`/reset/new?error=${encodeURIComponent(line)}`);
  }
  redirect("/dashboard");
}
