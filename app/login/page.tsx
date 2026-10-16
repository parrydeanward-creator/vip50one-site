import Logo from "@/components/brand/Logo.tsx";
import { emailLink, google, signIn } from "./actions.ts";
import { RESET_URL } from "@/lib/master.ts";
import { GOOGLE_SIGNIN } from "@/lib/landing.ts";
import PasswordField from "@/components/auth/PasswordField.tsx";

export const metadata = { title: "Sign in | VIP-50 ONE" };

const ERRORS: Record<string, string> = {
  missing: "Enter your email and password.",
  wrong: "That email and password don't match. Use the same ones as ONE GO and ONE MOVE.",
  down: "We couldn't reach sign-in just now. Try again in a minute.",
  slow: "Too many tries just now. Wait a minute, then try again.",
};

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  const next = typeof sp.next === "string" ? sp.next.slice(0, 200) : "";
  const sent = sp.sent === "1";
  const linkMode = sp.link === "1";
  return (
    <main className="login">
      <div className="login-card">
        <Logo label="VIP-50 ONE" size={56} />
        <h1>{sent ? "Check your email" : "Sign in"}</h1>
        {sent ? (
          <p className="login-sub" role="status">
            If that email has a ONE account, a sign-in link is on its way. It works once, for one hour.
          </p>
        ) : (
          <p className="login-sub">Use the same email and password as ONE GO and ONE MOVE.</p>
        )}
        {error && (
          <p className="login-err" role="alert">
            {error}
          </p>
        )}
        {GOOGLE_SIGNIN && !sent && (
          <form action={google}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="login-alt">Sign in with Google</button>
          </form>
        )}
        {linkMode || sent ? (
          <form action={emailLink} className="login-form">
            <input type="hidden" name="next" value={next} />
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required autoFocus={!sent} />
            <button type="submit">{sent ? "Send it again" : "Email me a sign-in link"}</button>
            <p className="login-links">
              <a href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Use my password instead</a>
            </p>
          </form>
        ) : (
          <form action={signIn} className="login-form">
            <input type="hidden" name="next" value={next} />
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required autoFocus />
            <label htmlFor="password">Password</label>
            <PasswordField />
            <button type="submit">Sign in</button>
            <p className="login-links">
              <a href={RESET_URL}>Forgot your password?</a>
              <span aria-hidden="true">·</span>
              <a href={`/login?link=1${next ? `&next=${encodeURIComponent(next)}` : ""}`}>Email me a sign-in link</a>
              <span aria-hidden="true">·</span>
              <a href="/#packages">New here? Pick a package</a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
