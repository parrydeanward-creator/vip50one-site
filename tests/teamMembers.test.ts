import { test } from "node:test";
import assert from "node:assert/strict";
import { canRemove, readMembers, removeConfirm } from "../lib/teamMembers.ts";

const rows = [
  { user_id: "u3", name: "Zed", role: "agent", active: true },
  { user_id: "u1", name: "Parry Ward", role: "owner", active: true },
  { user_id: "u2", name: "Amy", role: "admin", active: true },
  { user_id: "u4", name: "Bo", role: "agent", active: false, left_at: "2026-10-15T03:00:00Z" },
];

test("only the lead and admins get the members card; the lead first, people who left last", () => {
  assert.equal(readMembers({ team: { role: "agent" }, members: rows }), null);
  assert.equal(readMembers({ team: null, members: [] }), null);
  const m = readMembers({ team: { role: "owner" }, members: rows })!;
  assert.deepEqual(m.members.map((x) => x.name), ["Parry Ward", "Amy", "Zed", "Bo"]);
});

test("nobody removes the owner; only the owner removes an admin", () => {
  const m = readMembers({ team: { role: "admin" }, members: rows })!;
  const by = (n: string) => m.members.find((x) => x.name === n)!;
  assert.equal(canRemove("admin", by("Parry Ward")), false);
  assert.equal(canRemove("admin", by("Amy")), false);
  assert.equal(canRemove("owner", by("Amy")), true);
  assert.equal(canRemove("admin", by("Zed")), true);
  assert.match(removeConfirm("Zed"), /^Remove Zed from the team\? Their open team leads come back to you/);
});
