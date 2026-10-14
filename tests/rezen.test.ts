import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanKey, readConnect, readRezen, sinceWords } from "../lib/rezen.ts";

test("rezen: state read, boxes kept in order, duplicates dropped; no key field ever read", () => {
  const s = readRezen({ connected: true, name: "Pat Lee", key: "SHOULD-NOT-APPEAR", boxes: [
    { key: "profile", label: "My profile", brings: "licence, phone, office", on: true },
    { key: "payouts", label: "My payouts", on: false },
    { key: "profile", label: "dup", on: false },
  ] })!;
  assert.equal(s.connected, true);
  assert.deepEqual(s.boxes.map((b) => [b.key, b.on]), [["profile", true], ["payouts", false]]);
  assert.ok(!JSON.stringify(s).includes("SHOULD-NOT-APPEAR"));
  assert.equal(readRezen({}), null);
});

test("rezen: connect answers (ok, Is that you?, plain error)", () => {
  assert.deepEqual(readConnect(true, { ok: true, name: "Pat" }), { kind: "ok", name: "Pat" });
  const c = readConnect(false, { ok: false, needs_confirm: true, name: "Pat", email: "p@x.co", error: "This key belongs to Pat (p@x.co). Is that you?" });
  assert.equal(c.kind, "confirm");
  assert.match((c as { line: string }).line, /Is that you\?/);
  assert.deepEqual(readConnect(false, { ok: false, error: "This reZEN account is already connected to another ONE login." }), { kind: "error", line: "This reZEN account is already connected to another ONE login." });
  assert.equal(readConnect(false, null).kind, "error");
});

test("rezen: key cleaning and time words", () => {
  assert.equal(cleanKey("  abcdefghijklmnop1234  "), "abcdefghijklmnop1234");
  assert.equal(cleanKey("short"), null);
  assert.equal(cleanKey("abcdefgh ijklmnop1234"), null);
  const now = Date.parse("2026-10-14T12:00:00Z");
  assert.equal(sinceWords("2026-10-14T11:30:00Z", now), "30 min ago");
  assert.equal(sinceWords("2026-10-14T09:00:00Z", now), "3 hours ago");
  assert.equal(sinceWords("bad", now), null);
});

test("rezen read line, as Classic's: counts and totals only, only for ticked boxes", async () => {
  const { readLine, readRezenRead } = await import("../lib/rezen.ts");
  const r = readRezenRead({
    deals: { read_at: "2026-10-14T22:23:00Z", data: { open: new Array(10).fill({}), closed: new Array(20).fill({}) } },
    revshare: { read_at: "2026-10-14T22:23:00Z", data: { paid: 1240.4 } },
    network: { read_at: "2026-10-14T22:23:00Z", data: { total: 12 } },
  });
  assert.equal(readLine(r), "From reZEN: 10 open and 20 recent closed deals, $1,240 revenue share paid, 12 agents in your network");
  assert.equal(readLine(readRezenRead({ deals: { data: { open: [], closed: [] } } })), "From reZEN: 0 open and 0 recent closed deals");
  assert.equal(readLine(readRezenRead(undefined)), null);
});
