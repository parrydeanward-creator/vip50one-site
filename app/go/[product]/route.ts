import { masterClient } from "@/lib/server/auth.ts";
import { LOCKED_HREF, fallbackUrl, hopOutcome, isSignInProduct, landingFor } from "@/lib/productSignIn.ts";

// ENTITLEMENT §6b (v1.6, 16 Oct; Parry: "once a person signs into the system they need access to all the tools without
// having to sign in again"): GET /go/<product>?next=<path>. Signed in to the Brain, it asks MASTER for a one-time ticket
// as that agent (`vip_product_ticket`) and forwards to the product's enter page with the ticket in the fragment. Signed
// out, the sign-in page brings them straight back here. Not in the package: the Brain. Anything else (MASTER's RPC not
// live yet, an error): the plain product address, as before this hop existed.

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const go = (location: string) => new Response(null, { status: 302, headers: { Location: location, ...HEADERS } });

export async function GET(req: Request, ctx: { params: Promise<{ product: string }> }) {
  const { product } = await ctx.params;
  if (!isSignInProduct(product)) return new Response("Not found", { status: 404, headers: HEADERS });
  const u = new URL(req.url);
  const next = landingFor(product, u.searchParams.get("next")); // never the product's sales page
  const sb = await masterClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims?.sub) {
    const back = `/go/${product}?next=${encodeURIComponent(next)}`;
    return go(new URL(`/login?next=${encodeURIComponent(back)}`, u).toString());
  }
  let out: ReturnType<typeof hopOutcome>;
  try {
    const { data, error } = await sb.rpc("vip_product_ticket", { p_product: product, p_next: next });
    out = hopOutcome(product, data, error, next);
  } catch {
    out = { kind: "fallback", url: fallbackUrl(product, next) };
  }
  if (out.kind === "locked") return go(new URL(LOCKED_HREF, u).toString());
  return go(out.url);
}
