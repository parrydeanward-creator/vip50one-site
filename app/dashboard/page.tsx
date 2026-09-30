import Brain from "@/components/brain/Brain.tsx";
import { demoGraph } from "@/lib/graph/demo.ts";
import { PACKAGE_LABEL } from "@/lib/products.ts";
import type { PackageId } from "@/lib/types.ts";

// ONE Brain is the dashboard (Parry, 29 Sep; vip50-ecosystem research/ONE-BRAIN.md).
// Demo data until sign-in and the product contracts are live.
// ?package=relationship|complete|elite shows the other packages.

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const p = typeof sp.package === "string" ? sp.package : "";
  const pkg: PackageId = p in PACKAGE_LABEL ? (p as PackageId) : "complete";
  return <Brain graph={demoGraph(pkg)} pkg={pkg} />;
}
