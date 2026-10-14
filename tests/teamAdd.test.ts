import { test } from "node:test";
import assert from "node:assert/strict";
import { addBody, checkAdd, readAdd } from "../lib/teamAdd.ts";

const f = { name: " Sam Lee ", email: " Sam@X.co ", phone: "", role: "agent" as const, rotation: false };

test("Add a member: checks, body, rotation off unless ticked", () => {
  assert.equal(checkAdd(f), null);
  assert.equal(checkAdd({ ...f, name: "" }), "Add their name.");
  assert.match(checkAdd({ ...f, email: "x" })!, /email/);
  assert.deepEqual(addBody(f), { name: "Sam Lee", email: "sam@x.co", role: "agent", rotation: false });
  assert.equal(addBody({ ...f, phone: "801 555 0100" }).phone, "801 555 0100");
});

test("Add a member: answers in plain words; a missing seat charges nothing", () => {
  assert.equal(readAdd(200, { ok: true, emailed: true }, "Sam").kind, "added");
  assert.match(readAdd(200, { ok: true, emailed: true }, "Sam").line, /welcome email/);
  assert.equal(readAdd(200, { ok: true, already: true }, "Sam").kind, "already");
  assert.deepEqual(readAdd(402, { error: "Every seat is in use. Add a seat for $99 a month." }, "Sam"), { kind: "seat", line: "Every seat is in use. Add a seat for $99 a month." });
  assert.equal(readAdd(403, {}, "Sam").kind, "error");
});
