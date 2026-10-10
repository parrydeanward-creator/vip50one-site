import { test } from "node:test";
import assert from "node:assert/strict";
import { filterStory, productsIn, storyProduct } from "../lib/lifeStory.ts";

const e = (product: string, title: string) => ({ at: "2026-10-01T10:00:00Z", kind: "other" as const, product, title, detail: null });

test("life story: products in fixed order with counts; unknown products read as ONE MOVE; filter by one", () => {
  const ev = [e("showly", "Toured homes with you"), e("move", "Called"), e("showly", "Opened your tour recap"), e("mystery", "x"), e("open", "Signed in at your open house")];
  assert.deepEqual(productsIn(ev), [{ product: "move", count: 2 }, { product: "open", count: 1 }, { product: "showly", count: 2 }]);
  assert.equal(storyProduct(ev[3]), "move");
  assert.deepEqual(filterStory(ev, "showly").map((x) => x.title), ["Toured homes with you", "Opened your tour recap"]);
  assert.equal(filterStory(ev, null).length, 5);
});
