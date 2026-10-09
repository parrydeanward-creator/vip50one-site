import { test } from "node:test";
import assert from "node:assert/strict";
import { permissionsUrl, readPermissions, stateWord, stopBody, yesBody } from "../lib/permissions.ts";

const ans = {
  channels: [
    { channel: "sms", label: "Texts", address: "+18015551234", state: "no", needs_added_back: true, carrier_note: "They texted STOP to a ONE number.", since: "2026-10-01T10:00:00Z" },
    { channel: "email", label: "Email", address: null, state: "unknown" },
    { channel: "fax", label: "Fax", state: "yes" },
  ],
  hows: [{ key: "in_person", label: "In person" }, { key: "", label: "x" }],
  history: [{ at: "2026-10-01T10:00:00Z", channel: "sms", granted: false, line: "Texts: stopped, 1 Oct" }],
};

test("permissionsUrl and readPermissions: checked, unknown channels dropped", () => {
  assert.equal(permissionsUrl("a b"), "https://move.vip50one.com/api/brain/people/a%20b/permissions");
  const p = readPermissions(ans)!;
  assert.deepEqual(p.channels.map((c) => c.channel), ["sms", "email"]);
  assert.equal(p.channels[0].needsAddedBack, true);
  assert.equal(p.hows.length, 1);
  assert.equal(p.history.length, 1);
  assert.equal(stateWord(p.channels[1].state), "Not asked yet");
  assert.equal(readPermissions({}), null);
});

test("yesBody: how, the tick, and added back after a stop; an address on file", () => {
  const p = readPermissions(ans)!;
  const sms = p.channels[0], email = p.channels[1];
  assert.match((yesBody(email, "in_person", "", true, false) as { problem: string }).problem, /no email on file/);
  assert.match((yesBody(sms, "", "", true, true) as { problem: string }).problem, /how they agreed/);
  assert.match((yesBody(sms, "in_person", "", false, true) as { problem: string }).problem, /Tick that you have/);
  assert.match((yesBody(sms, "in_person", "", true, false) as { problem: string }).problem, /added back/);
  assert.deepEqual((yesBody(sms, "in_person", " at lunch ", true, true) as { body: unknown }).body, { channel: "sms", action: "yes", how: "in_person", note: "at lunch", permission: true, added_back: true, via: "one_brain" });
  assert.deepEqual(stopBody(sms), { channel: "sms", action: "stop", via: "one_brain" });
});
