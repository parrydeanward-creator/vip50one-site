import { test } from "node:test";
import assert from "node:assert/strict";
import { reasonWord, readSends, sendsLine, sendsUrl, statusWord } from "../lib/sends.ts";

test("sendsUrl: ONE MOVE's per-contact route", () => {
  assert.equal(sendsUrl("a b"), "https://move.vip50one.com/api/brain/people/a%20b/sends");
});

test("readSends: checked, newest first, bad rows dropped, Stop only where allowed", () => {
  const s = readSends({
    stopped_all: false,
    items: [
      { id: "1", from: "pulse", what: "Birthday text", channel: "sms", status: "sent", at: "2026-10-01T15:00:00Z", can_stop: false },
      { id: "2", from: "move", what: "October newsletter", channel: "email", status: "queued", at: "2026-10-09T15:00:00Z", can_stop: true },
      { id: "3", what: "", status: "sent" },
      { what: "No id", status: "sent" },
    ],
  })!;
  assert.deepEqual(s.items.map((i) => i.id), ["2", "1"]);
  assert.equal(s.items[0].canStop, true);
  assert.equal(s.items[1].canStop, false);
  assert.equal(s.items[0].from, "move");
  assert.equal(sendsLine(s), "1 waiting to send");
  assert.equal(readSends({ nope: 1 }), null);
});

test("sendsLine and statusWord: plain words", () => {
  assert.equal(sendsLine({ stoppedAll: true, stoppedAt: null, items: [] }), "Pulse is stopped for this person");
  assert.equal(sendsLine({ stoppedAll: false, stoppedAt: null, items: [] }), "Nothing sent by Pulse or ONE MOVE yet");
  assert.equal(statusWord("queued"), "Waiting to send");
  assert.equal(statusWord("quiet_hours"), "Quiet hours");
});

test("reasonWord: the gate's codes in plain words", () => {
  assert.equal(reasonWord("stopped_by_agent"), "you stopped it");
  assert.equal(reasonWord("some_new_code"), "some new code");
});
