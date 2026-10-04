// Coming back to ONE Brain from Google's sign-in (Parry, 4 Oct: Connect Google
// must work from the Brain). ONE MOVE's callback lands on
// /dashboard?google=connected or ?google=error; the Brain opens My Profile and
// says so in plain words.

export type GoogleReturn = { ok: boolean; what: string } | null;

export function googleReturn(search: string): GoogleReturn {
  const v = new URLSearchParams(search).get("google");
  if (v === "connected") return { ok: true, what: "Google is connected. Press “Add photos from Google” in My Profile to bring your contacts’ faces in." };
  if (v === "error" || v === "denied") return { ok: false, what: "Google didn’t connect. Try Connect Google again from My Profile." };
  return null;
}

/** The same address without the google= note, so a reload does not repeat it. */
export function withoutGoogle(href: string): string {
  const u = new URL(href);
  u.searchParams.delete("google");
  return u.pathname + (u.searchParams.toString() ? `?${u.searchParams}` : "") + u.hash;
}
