import { test } from "node:test";
import assert from "node:assert/strict";
import { askUrl, logBody, readGroups, readPeople } from "../lib/permissionAsk.ts";

test("ask a group: groups and people checked; a text without ONE MOVE's own link is left out", () => {
  assert.equal(askUrl("vip50"), "https://move.vip50one.com/api/brain/permissions/ask?group=vip50");
  assert.deepEqual(readGroups({ groups: [{ key: "vip50", label: "VIP-50", count: 12 }, { key: "", label: "x" }] }), [{ key: "vip50", label: "VIP-50", count: 12 }]);
  const p = readPeople({
    people: [
      { contact_id: "a", name: "Jane Smith", phone: "8015551234", text: "Hi Jane, mind if I keep you posted? https://move.vip50one.com/ok/abc" },
      { contact_id: "b", name: "Bad Link", phone: "8015550000", text: "Hi https://evil.example/ok/abc" },
      { contact_id: "c", name: "No Phone", text: "https://move.vip50one.com/ok/x" },
    ],
  })!;
  assert.deepEqual(p.map((x) => x.id), ["a"]);
  assert.deepEqual(logBody(["a", "a", "b"]), { contact_ids: ["a", "b"] });
  assert.equal(readGroups({}), null);
});
