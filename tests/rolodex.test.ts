import { test } from "node:test";
import assert from "node:assert/strict";
import { bizInitials, fanSeats, readRolodex, recommendedLine, safeWebsite, withShared } from "../lib/rolodex.ts";

const raw = {
  my_city: "Salt Lake City",
  mine: [
    { id: "a", name: "Rocky Mountain Plumbing", family: "repair", phone: "(801) 555-0142", notes: "ask for Mike", shared: true, website: "rmplumbing.com" },
    { id: "b", name: "  ", family: "repair" },
    { id: "c", name: "Odd Family", family: "nope", website: "javascript:alert(1)" },
  ],
  community: [
    { key: "8015550142", name: "Rocky Mountain Plumbing", family: "repair", recommended_by: [{ name: "Parry W.", me: true }, { name: "Suzanne G." }], in_mine: true },
    { key: "", name: "No key" },
  ],
};

test("readRolodex keeps good rows, maps unknown families to other, drops bad links", () => {
  const r = readRolodex(raw)!;
  assert.equal(r.mine.length, 2);
  assert.equal(r.mine[0].website, "https://rmplumbing.com/");
  assert.equal(r.mine[1].family, "other");
  assert.equal(r.mine[1].website, null);
  assert.equal(r.community.length, 1);
  assert.equal(readRolodex({ mine: [] }), null);
});

test("community never carries notes", () => {
  const r = readRolodex({ ...raw, community: [{ ...raw.community[0], notes: "secret" }] })!;
  assert.equal("notes" in r.community[0], false);
});

test("lines, sharing, initials, seats", () => {
  const r = readRolodex(raw)!;
  assert.equal(recommendedLine(r.community[0]), "Recommended by you and 1 other VIP-50 agent.");
  assert.equal(withShared(r, "a", false).mine[0].shared, false);
  assert.equal(bizInitials("Rocky Mountain Plumbing"), "RM");
  assert.equal(bizInitials("Handyhal"), "HA");
  assert.equal(safeWebsite("ftp://x.com"), null);
  assert.equal(fanSeats(["a", "b", "c"], 600, 300, 500, 500).length, 3);
});

// §3i.7 (v1.15): Pulse sorts into ten system groups; add, edit, delete from the Brain.
import { FAMILIES as TEN, FAN_MAX, draftOf, draftProblem, groupSeats, placedLine, saveBody, suggestGroup } from "../lib/rolodex.ts";

test("ten system groups, Other last", () => {
  assert.deepEqual(TEN.map((f) => f.key), ["financing", "closing", "repair", "cleaning", "referral", "auto", "food", "business", "lifestyle", "other"]);
});

test("Pulse's rules read what they do first, then the name", () => {
  const g = (name: string, category: string | null = null) => suggestGroup({ name, category });
  assert.equal(g("United Tire", "All Tire Needs"), "auto");
  assert.equal(g("Envision", "Automotive cosmetic surgeon"), "auto");
  assert.equal(g("Smokehouse", "Catering"), "food");
  assert.equal(g("The Corner", "Sports bar"), "food");
  assert.equal(g("Kensie Co", "Social Media Management"), "business");
  assert.equal(g("Sugar Properties", "Property Management"), "business");
  assert.equal(g("Crystal Co", "Spas"), "lifestyle");
  assert.equal(g("Arms Co", "Gun Smith"), "lifestyle");
  assert.equal(g("Black & Co", "Handyman/BBQ"), "repair"); // the first rule wins
  assert.equal(g("Havenwood", "Home Builder/Remodeler"), "repair");
  assert.equal(g("Wright Demo", "Demolition and junk removal"), "cleaning");
  // no category: the name
  assert.equal(g("Secure Title"), "closing");
  assert.equal(g("Boise Home Inspections"), "closing");
  assert.equal(g("Grace realty"), "referral");
  assert.equal(g("Brooks Contracting"), "repair");
  assert.equal(g("A Dame's Dogs"), "lifestyle");
  assert.equal(g("Agency Arms"), null); // "agency" is not "agent"
  assert.equal(g("The Break"), null); // Pulse's AI decides, in ONE MOVE
});

test("the Brain places what ONE MOVE left in Other only while ONE MOVE doesn't sort", () => {
  const raw = (extra: Record<string, unknown>) => ({ mine: [{ id: "a", name: "Tire Pro", category: "Tires", family: "other", ...extra }], community: [{ key: "k", name: "Tire Pro", category: "Tires", family: "other" }] });
  const before = readRolodex(raw({}))!;
  assert.equal(before.mine[0].family, "auto");
  assert.equal(before.community[0].family, "auto");
  assert.equal(placedLine(before.mine[0]), "Pulse put this in Auto.");
  const sorted = readRolodex(raw({ group_by: "pulse" }))!;
  assert.equal(sorted.mine[0].family, "other"); // ONE MOVE sorts: its answer stands
  assert.match(placedLine(sorted.mine[0]), /couldn't tell/);
  const moved = readRolodex({ mine: [{ id: "a", name: "Tire Pro", family: "food", group_by: "agent" }], community: [] })!;
  assert.equal(placedLine(moved.mine[0]), "You moved this to Food & events.");
});

test("the form: a name is needed, bad email and website refused, edits send only what changed", () => {
  const d = draftOf(null);
  assert.equal(draftProblem(d), "Give the business a name.");
  assert.equal(draftProblem({ ...d, name: "X", email: "nope" }), "That email address doesn't look right.");
  assert.equal(draftProblem({ ...d, name: "X", website: "ftp://x.com" }), "That website doesn't look right.");
  assert.equal(draftProblem({ ...d, name: "X", website: "x.com" }), null);
  const fresh = saveBody({ ...d, name: " The Break ", category: "Sports bar", website: "thebreak.com" }, null);
  assert.equal(fresh.name, "The Break");
  assert.equal(fresh.website, "https://thebreak.com/");
  assert.equal(fresh.notes, null);
  assert.equal("id" in fresh, false);
  const was = readRolodex({ mine: [{ id: "b1", name: "The Break", category: null, family: "other", notes: "Ask for Sam" }], community: [] })!.mine[0];
  assert.deepEqual(saveBody({ ...draftOf(was), category: "Sports bar" }, was), { id: "b1", category: "Sports bar" });
  assert.deepEqual(saveBody({ ...draftOf(was), notes: "" }, was), { id: "b1", notes: null });
  assert.deepEqual(saveBody(draftOf(was), was), { id: "b1" });
});

test("ten groups' fans never overlap, even at the cap", () => {
  const SIZE = 1320, C = SIZE / 2, FR = 330, SLICE = ((2 * Math.PI) / 10) * 0.86;
  const all: { x: number; y: number; g: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / 10;
    groupSeats(FAN_MAX, C + FR * Math.cos(a), C + FR * Math.sin(a), C, C, SLICE, FR).forEach((s) => all.push({ ...s, g: i }));
  }
  assert.equal(all.length, 10 * FAN_MAX);
  let closest = Infinity;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) closest = Math.min(closest, Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y));
  assert.ok(closest >= 50, `closest pair ${closest.toFixed(1)}px`);
  assert.ok(all.every((s) => s.x > 0 && s.x < SIZE && s.y > 0 && s.y < SIZE));
});
