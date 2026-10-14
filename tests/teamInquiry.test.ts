import { test } from "node:test";
import assert from "node:assert/strict";
import { readTalk } from "../lib/teamInquiry.ts";

test("talk form: trims, lowercases email, needs name, email and team", () => {
  const r = readTalk({ name: " Sam ", email: " Sam@Team.COM ", phone: "801 555 0100", team: " Peak Team ", agents: "12" });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.form, { name: "Sam", email: "sam@team.com", phone: "801 555 0100", team: "Peak Team", agents: 12 });
  assert.equal(readTalk({ email: "a@b.co", team: "x" }).ok, false);
  assert.equal(readTalk({ name: "a", email: "nope", team: "x" }).ok, false);
  assert.equal(readTalk({ name: "a", email: "a@b.co" }).ok, false);
  assert.equal(readTalk({ name: "a", email: "a@b.co", team: "x", phone: "12" }).ok, false);
  assert.equal(readTalk(null).ok, false);
});

test("talk form: a filled hidden field is refused; agents optional", () => {
  assert.equal(readTalk({ name: "a", email: "a@b.co", team: "x", website: "spam.example" }).ok, false);
  const r = readTalk({ name: "a", email: "a@b.co", team: "x", agents: "" });
  assert.ok(r.ok && r.form.agents === null);
});
