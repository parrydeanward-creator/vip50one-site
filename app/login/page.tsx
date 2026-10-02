import { signIn } from "./actions.ts";
import { JOIN_URL, RESET_URL } from "@/lib/master.ts";
import PasswordField from "@/components/auth/PasswordField.tsx";

export const metadata = { title: "Sign in | VIP-50 ONE" };

const ERRORS: Record<string, string> = {
  missing: "Enter your email and password.",
  wrong: "That email and password don't match. Use the same ones as ONE GO and ONE MOVE.",
  down: "We couldn't reach sign-in just now. Try again in a minute.",
};

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  return (
    <main className="login">
      <form className="login-card" action={signIn}>
        <p className="brand" aria-label="VIP-50 ONE">
          VIP-50 <b>ONE</b>
        </p>
        <h1>Sign in</h1>
        <p className="login-sub">Use the same email and password as ONE GO and ONE MOVE.</p>
        {error && (
          <p className="login-err" role="alert">
            {error}
          </p>
        )}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        <label htmlFor="password">Password</label>
        <PasswordField />
        <button type="submit">Sign in</button>
        <p className="login-links">
          <a href={RESET_URL}>Forgot your password?</a>
          <span aria-hidden="true">·</span>
          <a href={JOIN_URL}>New here? Join ONE</a>
        </p>
      </form>
    </main>
  );
}
