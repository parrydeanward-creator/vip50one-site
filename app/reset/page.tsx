import Logo from "@/components/brand/Logo.tsx";
import { requestReset } from "./actions.ts";

export const metadata = { title: "Reset your password | VIP-50 ONE" };

const ERRORS: Record<string, string> = {
  email: "Enter the email you sign in with.",
  slow: "Too many tries just now. Wait a minute, then try again.",
  expired: "That link has expired or was already used. Ask for a new one below.",
};

export default async function Reset({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  const sent = sp.sent === "1";
  return (
    <main className="login">
      <form className="login-card" action={requestReset}>
        <Logo label="VIP-50 ONE" size={56} />
        <h1>{sent ? "Check your email" : "Reset your password"}</h1>
        {sent ? (
          <p className="login-sub" role="status">
            If that email has a ONE account, a link to choose a new password is on its way. It works once, for one hour. Nothing
            arrived? Check spam, or send it again.
          </p>
        ) : (
          <p className="login-sub">Enter the email you use for ONE GO and ONE MOVE. We&apos;ll email you a link to choose a new password.</p>
        )}
        {error && (
          <p className="login-err" role="alert">
            {error}
          </p>
        )}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required autoFocus={!sent} />
        <button type="submit">{sent ? "Send it again" : "Email me a link"}</button>
        <p className="login-links">
          <a href="/login">Back to sign in</a>
        </p>
      </form>
    </main>
  );
}
