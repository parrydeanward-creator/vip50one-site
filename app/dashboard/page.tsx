import Brain from "@/components/brain/Brain.tsx";
import { demoGraph } from "@/lib/graph/demo.ts";
import { JOIN_URL } from "@/lib/master.ts";
import { PACKAGE_LABEL } from "@/lib/products.ts";
import { signedIn } from "@/lib/server/auth.ts";
import { liveBundle } from "@/lib/server/live.ts";
import type { PackageId } from "@/lib/types.ts";
import { redirect } from "next/navigation";

// ONE Brain is the dashboard (Parry, 29 Sep; vip50-ecosystem research/ONE-BRAIN.md).
// Signed in: the agent's own business from MASTER's vip_summary (ONE GO and
// ONE MOVE today; the other products say "not connected yet").
// ?demo=1: the made-up agent, for the films and screenshots
// (?package=relationship|complete|elite shows the other packages).

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  if (sp.demo === "1") {
    const p = typeof sp.package === "string" ? sp.package : "";
    const pkg: PackageId = p in PACKAGE_LABEL ? (p as PackageId) : "complete";
    return <Brain graph={demoGraph(pkg)} pkg={pkg} />;
  }
  const me = await signedIn();
  if (!me) redirect("/login");
  if (!me.member) {
    return (
      <main className="noaccess">
        <div className="login-card">
          <p className="brand" aria-label="VIP-50 ONE">
            VIP-50 <b>ONE</b>
          </p>
          <h1>Welcome, {me.firstName}</h1>
          <p className="login-sub">Your account ({me.email}) doesn't have a ONE package yet. Choose one to open your dashboard.</p>
          <a className="cta" href={JOIN_URL}>
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
  const { graph } = await liveBundle(me);
  const label = `${me.displayName}, ${PACKAGE_LABEL[me.pkg]}${me.founding ? ", founding member" : ""}`;
  return <Brain graph={graph} pkg={me.pkg} live agent={{ firstName: me.firstName, initials: me.initials, label, photo: me.photo }} />;
}
