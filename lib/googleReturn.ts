// Coming back to ONE Brain from another site (Parry, 4 Oct: Connect Google
// must work from the Brain). ONE MOVE's sign-in and payment buttons open at
// the top and return to /dashboard with one note (vip50-web-crm#49):
//   ?google=connected|failed|cancelled   ?lofty=connected|error   ?billing=done
// The Brain opens My Profile and says what happened in plain words, once.

export type ReturnNote = { ok: boolean; kicker: string; what: string } | null;

const NOTES: Record<string, Record<string, { ok: boolean; what: string }>> = {
  google: {
    connected: { ok: true, what: "Google is connected. Press “Add photos from Google” in My Profile to bring your contacts’ faces in." },
    failed: { ok: false, what: "Google didn’t connect. Try Connect Google again from My Profile." },
    error: { ok: false, what: "Google didn’t connect. Try Connect Google again from My Profile." },
    cancelled: { ok: false, what: "Google wasn’t connected: the sign-in was cancelled. Nothing changed." },
    denied: { ok: false, what: "Google wasn’t connected: the sign-in was cancelled. Nothing changed." },
  },
  lofty: {
    connected: { ok: true, what: "Lofty is connected." },
    error: { ok: false, what: "Lofty didn’t connect. Try Connect Lofty again from My Profile." },
  },
  billing: {
    done: { ok: true, what: "You’re back from billing. Any change you made there is saved." },
  },
};
const KICKER: Record<string, string> = { google: "ONE MOVE · Google", lofty: "ONE MOVE · Lofty", billing: "ONE MOVE · Billing" };

export function returnNote(search: string): ReturnNote {
  const q = new URLSearchParams(search);
  for (const key of Object.keys(NOTES)) {
    const n = NOTES[key][q.get(key) ?? ""];
    if (n) return { ...n, kicker: KICKER[key] };
  }
  return null;
}

/** The same address without the notes, so a reload does not repeat them. */
export function withoutNotes(href: string): string {
  const u = new URL(href);
  for (const key of Object.keys(NOTES)) u.searchParams.delete(key);
  return u.pathname + (u.searchParams.toString() ? `?${u.searchParams}` : "") + u.hash;
}
