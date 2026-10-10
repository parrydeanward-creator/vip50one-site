import type { TimelineEvent } from "./people.ts";

// Life story (PULSE-ROADMAP #17; VIP-SUMMARY §3k.6a): one history per person from every product, newest first, with a
// filter by product. The events come from ONE MOVE's timeline route, which merges what each product records.

export const STORY_PRODUCTS = ["move", "go", "open", "showly", "marquee", "web"] as const;
export type StoryProduct = (typeof STORY_PRODUCTS)[number];
export const STORY_LABEL: Record<StoryProduct, string> = { move: "ONE MOVE", go: "ONE GO", open: "ONE Open", showly: "Showly", marquee: "Marquee", web: "Website" };

const known = (p: string): p is StoryProduct => (STORY_PRODUCTS as readonly string[]).includes(p);
export const storyProduct = (e: TimelineEvent): StoryProduct => (known(e.product) ? e.product : "move");

/** The products present in the history so far, in a fixed order, with counts. */
export function productsIn(events: TimelineEvent[]): { product: StoryProduct; count: number }[] {
  const n = new Map<StoryProduct, number>();
  for (const e of events) n.set(storyProduct(e), (n.get(storyProduct(e)) ?? 0) + 1);
  return STORY_PRODUCTS.filter((p) => n.has(p)).map((p) => ({ product: p, count: n.get(p)! }));
}

export const filterStory = (events: TimelineEvent[], only: StoryProduct | null) => (only ? events.filter((e) => storyProduct(e) === only) : events);
