import { test } from "node:test";
import assert from "node:assert/strict";
import { DIAL_LINE, dialBody, dialStatusUrl, readDial, readDialStatus } from "../lib/dial.ts";

test("a sent dial keeps its id", () => {
  assert.deepEqual(readDial({ ok: true, id: "d1", expires_at: "2026-10-12T03:10:00Z" }), { ok: true, id: "d1", expiresAt: "2026-10-12T03:10:00Z" });
});

test("a refusal shows ONE MOVE's line first, then a plain one", () => {
  assert.equal((readDial({ ok: false, reason: "no_go", error: "Install ONE GO first." }) as { line: string }).line, "Install ONE GO first.");
  assert.equal((readDial({ ok: false, reason: "away" }) as { line: string }).line, "You are on time off, so nothing goes to your phone.");
  assert.match((readDial(null) as { line: string }).line, /did not reach your phone/);
  assert.equal(readDial({ ok: true }).ok, false); // no id is not a send
});

test("status: opened wins, then expired, then sent", () => {
  assert.equal(readDialStatus({ sent_at: "x", opened_at: "y", expired: true }), "opened");
  assert.equal(readDialStatus({ sent_at: "x", opened_at: null, expired: true }), "expired");
  assert.equal(readDialStatus({ sent_at: "x", opened_at: null, expired: false }), "sent");
  assert.equal(readDialStatus({}), null);
  assert.ok(DIAL_LINE.opened);
});

test("body and status url", () => {
  assert.deepEqual(dialBody("c1"), { contact_id: "c1", ref: null });
  assert.deepEqual(dialBody("c1", "hwc:hot"), { contact_id: "c1", ref: "hwc:hot" });
  assert.match(dialStatusUrl("a b"), /\/api\/brain\/dial\?id=a%20b$/);
});
