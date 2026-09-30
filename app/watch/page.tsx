import Watch from "@/components/brain/Watch.tsx";
import { FILM_PRODUCTS, type FilmProduct } from "@/lib/productFilms.ts";

// Watch ONE Work (vip50-ecosystem research/ONE-BRAIN.md §7). ?film=1 plays the
// long film; ?product=go|move|marquee|open|showly plays that product's film. ?record=1 hides the
// controls, for the sales-page recording; with it, ?slow=N plays N times slower
// so a slow machine can record smoothly (scripts/record-watch.mjs speeds it back up).

export const metadata = { title: "Watch ONE Work | VIP-50 ONE" };

export default async function WatchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const slow = sp.record === "1" ? Math.min(8, Math.max(1, Number(sp.slow) || 1)) : 1;
  const product = typeof sp.product === "string" && (FILM_PRODUCTS as string[]).includes(sp.product) ? (sp.product as FilmProduct) : undefined;
  return <Watch record={sp.record === "1"} slow={slow} film={sp.film === "1"} product={product} />;
}
