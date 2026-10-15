import { test } from "node:test";
import assert from "node:assert/strict";
import { readAddons, readCheckout } from "../lib/addons.ts";

// Add-ons (CHECKOUT §2; vip50-web-crm#260): the Brain lists ONE MOVE's add-ons and only ever opens Stripe's own page.
test("reads the add-ons and the agent's own", () => {
  const a = readAddons({
    can_buy: true,
    addons: [
      { key: "premium_template", name: "Premium template", blurb: "A designer template for your site.", price_words: "$299 once", monthly: false, needs: "template", joins_plan: false, confirm: null },
      { key: "featured_areas", name: "Featured Areas", blurb: "Your areas featured.", price_words: "$29 a month", monthly: true, needs: "area", joins_plan: true, confirm: "Add Featured Areas for $29 a month to your plan?" },
      { key: "", name: "broken" },
    ],
    mine: [{ id: "m1", addon_key: "featured_areas", area: "Draper 84020", status: "active", created_at: "2026-10-15" }],
  })!;
  assert.equal(a.canBuy, true);
  assert.deepEqual(a.addons.map((x) => x.key), ["premium_template", "featured_areas"]);
  assert.equal(a.addons[1].joinsPlan, true);
  assert.equal(a.mine[0].area, "Draper 84020");
  assert.equal(readAddons({ nope: true }), null);
  assert.equal(readAddons({ can_buy: false, addons: [] })!.canBuy, false);
});

test("checkout: only Stripe's own page, a plan add, ask first, or plain words", () => {
  assert.deepEqual(readCheckout(200, { ok: true, url: "https://checkout.stripe.com/c/pay/cs_test_1" }), { kind: "url", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
  assert.equal(readCheckout(200, { ok: true, url: "https://evil.example.com/pay" }).kind, "error", "never another site");
  assert.deepEqual(readCheckout(200, { ok: true, joined: true }), { kind: "joined" });
  assert.deepEqual(readCheckout(200, { ok: false, needs_confirm: true, confirm: "Add it for $29 a month?" }), { kind: "confirm", confirm: "Add it for $29 a month?" });
  assert.equal((readCheckout(402, { ok: false, error: "Your card was declined. Nothing was bought." }) as { line: string }).line, "Your card was declined. Nothing was bought.");
  assert.equal((readCheckout(0, null) as { line: string }).line, "ONE MOVE could not be reached. Nothing was bought.");
});
