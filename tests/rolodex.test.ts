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
