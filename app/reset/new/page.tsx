import Logo from "@/components/brand/Logo.tsx";
import { redirect } from "next/navigation";
import PasswordField from "@/components/auth/PasswordField.tsx";
import { identity } from "@/lib/server/auth.ts";
import { MIN_PASSWORD } from "@/lib/reset.ts";
import { setNewPassword } from "../actions.ts";

export const metadata = { title: "Choose a new password | VIP-50 ONE" };
export const dynamic = "force-dynamic";

export default async function NewPassword({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const who = await identity();
  if (!who) redirect("/reset?error=expired");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error.slice(0, 120) : undefined;
  return (
    <main className="login">
      <form className="login-card" action={setNewPassword}>
        <Logo label="VIP-50 ONE" size={56} />
        <h1>Choose a new password</h1>
        <p className="login-sub">
          For {who.email}. It works in ONE GO, ONE MOVE and here. At least {MIN_PASSWORD} characters.
        </p>
        {error && (
          <p className="login-err" role="alert">
            {error}
          </p>
        )}
        <label htmlFor="password">New password</label>
        <PasswordField id="password" name="password" autoComplete="new-password" />
        <label htmlFor="again">Type it again</label>
        <PasswordField id="again" name="again" autoComplete="new-password" />
        <button type="submit">Save and open ONE</button>
      </form>
    </main>
  );
}
