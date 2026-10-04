import { test } from "node:test";
import assert from "node:assert/strict";
import { LOGGABLE, audit, logQuestion, pct } from "../lib/audit.ts";
import { readRoster } from "../lib/vips.ts";

// VIP-SUMMARY §3f (v1.10): the ring of touches.
const id = (n: number) => `8a1b2c3d-4e5f-4a6b-8c7d-${String(n).padStart(12, "0")}`;
const all = { call: true, video_text: true, social: true, newsletter: true, mixer: true };
const none = { call: false, video_text: false, social: false, newsletter: false, mixer: false };
const r = readRoster({
  cap: 75,
  vip50: [
    { id: id(1), name: "Lycia Ward", month: all, quarter: { face_to_face: true, handwritten_note: false, drop_by: false } },
    { id: id(2), name: "Sam Lee", month: { ...none, call: true }, quarter: {} },
    { id: id(3), name: "Ann Park", month: none, quarter: {} },
  ],
  vip100: [{ id: id(9), name: "Out Side", month: all }],
})!;

test("counts VIP-50 only, per touch, with who is missing", () => {
  const a = audit(r);
  assert.equal(a.people, 3);
  const call = a.touches.find((t) => t.key === "call")!;
  assert.equal(call.done, 2);
  assert.deepEqual(call.missing.map((p) => p.name), ["Ann Park"]);
  const f2f = a.touches.find((t) => t.key === "face_to_face")!;
  assert.equal(f2f.kind, "quarter");
  assert.equal(f2f.done, 1);
  assert.equal(a.touches.length, 8);
});

test("coverage, fully touched and untouched as Classic's audit counts them", () => {
  const a = audit(r);
  assert.equal(a.coverage, 6 / 15);
  assert.equal(pct(a.coverage), "40%");
  assert.equal(a.fully, 1);
  assert.equal(a.untouched, 1);
  assert.equal(audit({ ...r, vip50: [] }).coverage, 0);
});

test("newsletter and mixer are never logged by hand; the question reads right", () => {
  assert.equal(LOGGABLE.newsletter, undefined);
  assert.equal(LOGGABLE.mixer, undefined);
  assert.equal(LOGGABLE.social, "social");
  assert.equal(logQuestion("Social", "Sarah"), "Log a social with Sarah?");
  assert.equal(logQuestion("Face-to-face", "Sam"), "Log a face-to-face with Sam?");
  assert.equal(logQuestion("Handwritten note", "Ann"), "Log a handwritten note with Ann?");
});

test("grid rows: least touched first, then quarter, then name; eight cells each", async () => {
  const { gridRows, hasTouch } = await import("../lib/audit.ts");
  const r = {
    cap: 75,
    vip50: [
      { id: "a", name: "Zed", month: { call: true, social: true }, quarter: {} },
      { id: "b", name: "Amy", month: {}, quarter: { drop_by: true } },
      { id: "c", name: "Bob", month: {}, quarter: {} },
      { id: "d", name: "Cal", month: { call: true, video_text: true, social: true, newsletter: true, mixer: true }, quarter: {} },
    ],
    vip100: [],
  } as never;
  const rows = gridRows(r);
  assert.deepEqual(rows.map((x) => x.person.name), ["Bob", "Amy", "Zed", "Cal"]);
  assert.equal(rows[0].cells.length, 8);
  assert.equal(rows[2].monthDone, 2);
  assert.equal(rows[3].monthDone, 5);
  assert.equal(rows[1].quarterDone, 1);
  assert.equal(hasTouch(rows[1].person, { key: "drop_by", kind: "quarter" }), true);
  assert.equal(hasTouch(rows[1].person, { key: "drop_by", kind: "month" }), false);
});
