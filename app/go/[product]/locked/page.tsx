import { notFound, redirect } from "next/navigation";
import Logo from "@/components/brand/Logo.tsx";
import { identity } from "@/lib/server/auth.ts";
import { isSignInProduct, lockedHref, lockedLine } from "@/lib/productSignIn.ts";

// Where /go/<product> lands when the agent's plan does not include that product (ENTITLEMENT §6b). The same words as
// ONE GO: "<Product> isn't in the plan for <email>." with See plans and Close. The email is the signed-in session's
// only; nothing in the address can change what this page says.
export const metadata = { title: "Not in your plan | VIP-50 ONE", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Locked({ params }: { params: Promise<{ product: string }> }) {
  const { product } = await params;
  if (!isSignInProduct(product)) notFound();
  const who = await identity();
  if (!who) redirect(`/login?next=${encodeURIComponent(lockedHref(product))}`);
  return (
    <main className="login">
      <div className="login-card">
        <Logo label="VIP-50 ONE" size={56} />
        {/* The email keeps its own case; the heading face is all capitals. */}
        <h1 id="locked-line" aria-label={lockedLine(product, who.email)}>
          {lockedLine(product, "").replace(/ for \.$/, " for")}{" "}
          <span style={{ textTransform: "none", fontFamily: "inherit", letterSpacing: 0, wordBreak: "break-all" }}>{who.email}</span>.
        </h1>
        <a className="cta" href="/reactivate">See plans</a>
        <a className="cta ghost" href="/dashboard">Close</a>
      </div>
    </main>
  );
}
