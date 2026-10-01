import { test } from "node:test";
import assert from "node:assert/strict";
import { FAQ, JOIN, PACKAGES, PRODUCTS, TESTIMONIALS, shownTestimonials } from "../lib/sales.ts";

test("prices are the settled ones (ECOSYSTEM.md §7)", () => {
  const p = Object.fromEntries(PACKAGES.map((x) => [x.id, x]));
  assert.equal(p.relationship.founding, "$199");
  assert.equal(p.relationship.list, "$299");
  assert.equal(p.complete.founding, "$399");
  assert.equal(p.complete.list, "$499");
  assert.equal(p.elite.founding, "$2,500");
  assert.match(p.relationship.annual, /\$1,990.*\$2,990.*two months free/);
  assert.match(p.complete.annual, /\$3,990.*\$4,990.*two months free/);
  assert.match(p.elite.annual, /ONE Complete from day 90/);
  // trial on Relationship and Complete, never Elite
  assert.deepEqual(PACKAGES.filter((x) => x.trial).map((x) => x.id), ["relationship", "complete"]);
});

test("packages hold the right products; nothing is sold on its own", () => {
  const rel = PRODUCTS.filter((x) => x.in.includes("relationship")).map((x) => x.id);
  const comp = PRODUCTS.filter((x) => x.in.includes("complete")).map((x) => x.id);
  assert.deepEqual(rel, ["go", "move"]);
  assert.deepEqual(comp, ["go", "move", "marquee", "open", "showly"]);
  assert.ok(FAQ.some((f) => /packages/.test(f.a) && /on its own/.test(f.q)));
  assert.equal(JOIN, "https://vip50one.com/join");
});

test("honest copy: nothing posts without the agent, no loves, visitors never into the VIP-50", () => {
  const all = JSON.stringify({ PRODUCTS, PACKAGES, FAQ });
  assert.ok(!/\blove[sd]?\b/i.test(all));
  assert.ok(!/\bDean\b/.test(all));
  assert.match(JSON.stringify(PRODUCTS.find((x) => x.id === "marquee")), /Scheduled posting stays off until you turn it on/);
  assert.ok(FAQ.some((f) => /Never on their own/.test(f.a)));
});

test("testimonials: only shown with real content; ties disclosed", () => {
  assert.deepEqual(shownTestimonials([{ name: "A", role: "r" }]), []);
  assert.equal(shownTestimonials([{ name: "A", role: "r", quote: "Real words." }]).length, 1);
  for (const n of ["Annette Judd", "Travis Evenden"]) assert.match(TESTIMONIALS.find((t) => t.name === n)!.tie ?? "", /with Parry/);
  for (const t of TESTIMONIALS) assert.ok(!/\bDean\b/.test(t.quote ?? ""), t.name);
});
