import Logo from "@/components/brand/Logo.tsx";
import Brain from "@/components/brain/Brain.tsx";
import { demoGraph, oneYouView } from "@/lib/graph/demo.ts";
import { PACKAGES_SIGNED_IN } from "@/lib/landing.ts";
import { PACKAGE_LABEL } from "@/lib/products.ts";
import { signedInBundle } from "@/lib/server/live.ts";
import type { PackageId } from "@/lib/types.ts";
import { redirect } from "next/navigation";
import { pageFromAddress } from "@/lib/moveMenu.ts";

// ONE Brain is the dashboard (Parry, 29 Sep; vip50-ecosystem research/ONE-BRAIN.md).
// Signed in: the agent's own business from MASTER's vip_summary (ONE GO and
// ONE MOVE today; the other products say "not connected yet").
// ?demo=1: the made-up agent, for the films and screenshots
// (?package=relationship|complete|elite shows the other packages).

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams, params }: { searchParams: Promise<Record<string, string | string[] | undefined>>; params?: Promise<{ page?: string[] }> }) {
  const sp = await searchParams;
  // /dashboard/team-leads, /dashboard/profile, ...: open on that page from the first paint (Parry, 13 Oct: Team Leads
  // showed the main page first, then flew over).
  const parts = (await params)?.page;
  const startPage = parts?.length ? pageFromAddress(`/dashboard/${parts.join("/")}`) : null;
  if (sp.demo === "1") {
    const p = typeof sp.package === "string" ? sp.package : "";
    const pkg: PackageId = p in PACKAGE_LABEL ? (p as PackageId) : "complete";
    return <Brain graph={oneYouView(demoGraph(pkg))} pkg={pkg} startPage={startPage} />;
  }
  const live = await signedInBundle();
  if (!live) redirect("/login");
  const { me, bundle } = live;
  if (!bundle) {
    // Had a plan that ended: Welcome back and Restart (walker, 14 Oct), never the new-signup page.
    if (me.lapsed) redirect("/reactivate");
    return (
      <main className="noaccess">
        <div className="login-card">
          <Logo label="VIP-50 ONE" size={56} />
          <h1>{me.named ? `Welcome, ${me.firstName}` : "Welcome"}</h1>
          <p className="login-sub">Your account ({me.email}) doesn't have a ONE package yet. Choose one to open your dashboard.</p>
          <a className="cta" href={PACKAGES_SIGNED_IN}>
            See the packages
          </a>
          <form method="post" action="/auth/signout">
            <button className="signout" type="submit" style={{ marginTop: 16 }}>
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }
  const { graph } = bundle;
  const label = `${me.displayName}, ${PACKAGE_LABEL[me.pkg]}${me.founding ? ", founding member" : ""}`;
  return <Brain graph={graph} pkg={me.pkg} live startPage={startPage} agent={{ firstName: me.firstName, initials: me.initials, label, photo: me.photo, admin: me.admin, growth: me.growth }} />;
}
