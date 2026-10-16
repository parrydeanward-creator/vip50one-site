// ENTITLEMENT.md §6b (v1.6, 16 Oct; Parry: "this is a one sign in system"): every Brain link into ONE Open, Marquee or
// Showly goes through /go/<product>?next=<path>. Signed in, the Brain asks MASTER (`vip_product_ticket`, as the agent)
// for a one-time ticket and sends the browser to `<product>/auth/one?next=<path>#t=<ticket>`; the ticket sits in the
// fragment, so it never reaches a server log or a Referer header. Until MASTER has the RPC (or on any other failure),
// the hop falls back to the plain product address, so nothing is worse than before.

export type SignInProduct = "vip-open" | "marquee" | "showly";

/** The one host each product may be entered on. */
export const PRODUCT_HOSTS: Record<SignInProduct, string> = {
  "vip-open": "open.vip-50.com",
  marquee: "marquee.vip-50.com",
  showly: "showly.net",
};

export const SIGN_IN_PRODUCTS = Object.keys(PRODUCT_HOSTS) as SignInProduct[];

export const isSignInProduct = (v: unknown): v is SignInProduct => typeof v === "string" && Object.hasOwn(PRODUCT_HOSTS, v);

/** The product a host belongs to, or null ("www.showly.net" is not one of them). */
export function productOfHost(host: string): SignInProduct | null {
  const h = host.toLowerCase();
  return SIGN_IN_PRODUCTS.find((p) => PRODUCT_HOSTS[p] === h) ?? null;
}

const NEXT_MAX = 500;

/** A same-product path: one leading "/", no "//", no backslash, no spaces or control characters, at most 500 chars.
 * Anything else is the product's home, "/". */
export function cleanNext(v: unknown): string {
  if (typeof v !== "string" || !v.startsWith("/") || v.length > NEXT_MAX) return "/";
  if (v.includes("//") || v.includes("\\") || /[\s\u0000-\u001f\u007f]/.test(v)) return "/";
  return v;
}

/** The Brain's hop into a product: `/go/<product>?next=<path>`. */
export const goHref = (product: SignInProduct, path = "/"): string => `/go/${product}?next=${encodeURIComponent(cleanNext(path))}`;

/** The same hop as a full address, for links that may be opened outside the Brain (ONE GO, an email). */
export const goUrl = (product: SignInProduct, path = "/"): string => `https://www.vip50one.com${goHref(product, path)}`;

/** Any link: an https address on ONE Open, Marquee or Showly goes through the hop (path, query and fragment kept, so a
 * prefilled form such as Showly's `/app#new&name=...` still opens filled); anything else
 * comes back unchanged. Built for links that arrive as data (a product's summary, a launch piece, a contact offer). */
export function productLink<T extends string | null | undefined>(url: T): T | string {
  if (!url) return url;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  const product = u.protocol === "https:" && !u.username && !u.password && !u.port ? productOfHost(u.hostname) : null;
  return product ? goHref(product, `${u.pathname}${u.search}${u.hash}`) : url;
}

/** The plain product address, today's behaviour: `https://<host><next>`. */
export const fallbackUrl = (product: SignInProduct, next: unknown): string => `https://${PRODUCT_HOSTS[product]}${cleanNext(next)}`;

/** Where the ticket goes: MASTER's enter page, only https on that product's own host, with a 64-hex ticket; else null. */
export function enterUrl(product: SignInProduct, url: unknown, ticket: unknown, next: unknown): string | null {
  if (typeof url !== "string" || typeof ticket !== "string" || !/^[0-9a-f]{64}$/.test(ticket)) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port || u.hostname !== PRODUCT_HOSTS[product]) return null;
  return `https://${u.hostname}${u.pathname}?next=${encodeURIComponent(cleanNext(next))}#t=${ticket}`;
}

export type HopOutcome = { kind: "enter"; url: string } | { kind: "locked" } | { kind: "fallback"; url: string };

/** Where the hop sends the browser, from MASTER's answer: the enter page, the Brain (not in the package), or the plain
 * product address for anything else (the RPC missing, an error, a refusal for too many tries, a bad answer). */
export function hopOutcome(product: SignInProduct, data: unknown, error: unknown, next: unknown): HopOutcome {
  const r = (!error && data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  if (r.ok === false && r.reason === "not_included") return { kind: "locked" };
  const url = r.ok === true ? enterUrl(product, r.url, r.ticket, next) : null;
  return url ? { kind: "enter", url } : { kind: "fallback", url: fallbackUrl(product, next) };
}

/** Where a product the agent's package does not include sends them: the Brain (it has no locked-product view yet). */
export const LOCKED_HREF = "/dashboard";
