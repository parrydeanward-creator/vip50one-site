import { signedIn } from "@/lib/server/auth.ts";
import { MOVE_URL } from "@/lib/host.ts";
import { PACKAGE_LABEL } from "@/lib/products.ts";

// vip50one.com/reactivate (audit stage 1, 14 Oct): a ONE "Welcome back" page, never Classic's bare sign-in. Signed
// out: sign in first and come back here. Signed in: the plan they had, and one tap to the plan page (ONE MOVE's
// /upgrade, where restarting is the agent's own tap and Stripe's checkout; nothing is charged here).
export const metadata = { title: "Welcome back | VIP-50 ONE" };
export const dynamic = "force-dynamic";

const pass = (sp: Record<string, string | string[] | undefined>) => {
  const q = new URLSearchParams();
  for (const k of ["package", "interval", "code"]) {
    const v = sp[k];
    if (typeof v === "string" && /^[\w-]{1,40}$/.test(v)) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
};

export default async function Reactivate({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const me = await signedIn();
  const q = pass(sp);
  return (
    <main className="login">
      <div className="login-card">
        <p className="brand" aria-label="VIP-50 ONE">
          VIP-50 <b>ONE</b>
        </p>
        <h1>{me ? `Welcome back, ${me.firstName}` : "Welcome back"}</h1>
        {!me ? (
          <>
            <p className="login-sub">Sign in with the same email and password as before. Your contacts, VIPs and history are all still here.</p>
            <a className="cta" href={`/login?next=${encodeURIComponent(`/reactivate${q}`)}`}>Sign in to restart</a>
            <p className="login-links">
              <a href="/reset">Forgot your password?</a>
              <span aria-hidden="true">·</span>
              <a href="/#packages">New to ONE? See the packages</a>
            </p>
          </>
        ) : me.member ? (
          <>
            <p className="login-sub">Your {PACKAGE_LABEL[me.pkg]} plan is already active. Nothing to restart.</p>
            <a className="cta" href="/dashboard">Open ONE</a>
          </>
        ) : (
          <>
            <p className="login-sub">
              Your plan was <b>{PACKAGE_LABEL[me.pkg]}</b>
              {me.founding ? ", and your founding price is kept for you" : ""}. Your contacts, VIPs and history are all still here.
            </p>
            <a className="cta" href={`${MOVE_URL}/upgrade${q}`}>Restart my plan</a>
            <small className="login-sub">You choose and confirm on the next page. Nothing is charged until you do.</small>
            <p className="login-links">
              <a href="/#packages">See every package</a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
