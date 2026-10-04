import { test } from "node:test";
import assert from "node:assert/strict";
import {
  faceUrl,
  shortName,
  canPromote,
  initialsOf,
  lastTouchLine,
  readRoster,
  ringSeats,
  rosterLine,
  seatAt,
  swapQuestion,
  tierQuestion,
  touchSegments,
  vipSwapUrl,
  vipTierUrl,
  vipsUrl,
  type VipPerson,
} from "../lib/vips.ts";

// VIP-SUMMARY §3d (v1.7): the VIP rings.
const id = (n: number) => `8a1b2c3d-4e5f-4a6b-8c7d-${String(n).padStart(12, "0")}`;
const person = (n: number, name: string, month: Record<string, boolean> = {}): VipPerson => ({ id: id(n), name, month });

test("routes are ONE MOVE's", () => {
  assert.equal(vipsUrl, "https://move.vip50one.com/api/brain/vips");
  assert.equal(vipSwapUrl, "https://move.vip50one.com/api/brain/vip/swap");
  assert.equal(vipTierUrl, "https://move.vip50one.com/api/brain/vip/tier");
});

test("a roster keeps only well-formed people; a wrong shape is refused", () => {
  const r = readRoster({ cap: 50, vip50: [person(1, "Lycia Ward"), { id: "1; drop", name: "X" }, { id: id(3) }], vip100: [person(2, "Sam Lee")] });
  assert.ok(r);
  assert.deepEqual(r!.vip50.map((p) => p.name), ["Lycia Ward"]);
  assert.equal(r!.vip100.length, 1);
  assert.equal(readRoster({ vip50: "no" }), null);
  assert.equal(readRoster(null), null);
  assert.equal(readRoster({ vip50: [], vip100: [] })!.cap, 50);
});

test("initials", () => {
  assert.equal(initialsOf("Lycia Ward"), "LW");
  assert.equal(initialsOf("  Mary Ann  de Souza "), "MS");
  assert.equal(initialsOf("Cher"), "CH");
  assert.equal(initialsOf(""), "?");
  assert.equal(initialsOf("\u{1F3E1} Wendy"), "WE");
  assert.equal(initialsOf("\u{2764}\u{FE0F}Jo Walker"), "JW");
  assert.equal(initialsOf("Ángel Ñúñez"), "ÁÑ");
});

test("the touch ring follows Parry's order and grows when ONE MOVE sends a sixth", () => {
  const five = touchSegments({ call: true, video_text: false, social: true, newsletter: false, mixer: false });
  assert.deepEqual(five.map((s) => s.key), ["call", "video_text", "social", "newsletter", "mixer"]);
  assert.deepEqual(five.map((s) => s.done), [true, false, true, false, false]);
  const six = touchSegments({ call: true, video_text: true, social: true, newsletter: true, mixer: true, market_report: false });
  assert.equal(six.length, 6);
  assert.equal(six[5].label, "Market report");
  assert.equal(touchSegments(null).length, 5);
});

test("50 faces fit the inner ring without overlapping; the first sits at the top", () => {
  const ids = Array.from({ length: 50 }, (_, i) => id(i));
  const seats = ringSeats(ids, 0, 0, 260, 30);
  assert.equal(seats.length, 50);
  assert.ok(Math.abs(seats[0].x) < 1e-9 && seats[0].y < 0);
  const step = Math.hypot(seats[1].x - seats[0].x, seats[1].y - seats[0].y);
  assert.ok(step >= 2 * seats[0].r, `faces overlap: step ${step}, r ${seats[0].r}`);
  assert.equal(ringSeats(ids.slice(0, 3), 0, 0, 260, 30)[0].r, 30);
});

test("a drop lands on the face under the pointer, or on nothing", () => {
  const seats = ringSeats([id(1), id(2)], 0, 0, 100, 20);
  assert.equal(seatAt(seats, 0, -95)!.id, id(1));
  assert.equal(seatAt(seats, 0, 0), null);
});

test("nothing moves without the question; first names only", () => {
  assert.equal(swapQuestion(person(1, "Lycia Ward"), person(2, "Sam Lee")), "Move Lycia to your VIP-100 and Sam to your VIP-50?");
  assert.equal(tierQuestion({ ...person(2, "Samuel Lee"), first_name: "Sam" }, "vip50"), "Move Sam to your VIP-50?");
});

test("the line at the top and the open spots", () => {
  const r = readRoster({ cap: 50, vip50: [person(1, "A B", { call: true, video_text: true, social: true, newsletter: true, mixer: true }), person(2, "C D")], vip100: [person(3, "E F")] })!;
  assert.equal(rosterLine(r), "2 of 50 in your VIP-50 · 1 fully touched this month · 1 in your VIP-100 · 48 open spots");
  assert.equal(canPromote(r), true);
  assert.equal(canPromote({ ...r, cap: 2 }), false);
});

test("last touch in plain words", () => {
  assert.equal(lastTouchLine({ ...person(1, "A") }, "2026-10-04"), "Never touched");
  assert.equal(lastTouchLine({ ...person(1, "A"), last_touch_on: "2026-10-04" }, "2026-10-04"), "Touched today");
  assert.equal(lastTouchLine({ ...person(1, "A"), last_touch_on: "2026-10-03" }, "2026-10-04"), "Touched yesterday");
  assert.equal(lastTouchLine({ ...person(1, "A"), last_touch_on: "2026-09-20" }, "2026-10-04"), "Last touched 14 days ago");
});

test("the name under an orb is the first name, without emoji", () => {
  assert.equal(shortName({ name: "Lycia Ward" }), "Lycia");
  assert.equal(shortName({ name: "\u{1F3E1} Wendy Walker", first_name: "\u{1F3E1}" }), "Wendy");
  assert.equal(shortName({ name: "\u{1F3E1}" }), "?");
  assert.equal(shortName({ name: "Sam Lee", first_name: "Sammy" }), "Sammy");
});

test("faces: only ONE MOVE's signed face links are drawn", () => {
  const ok = "https://move.vip50one.com/api/face/8a1b2c3d-4e5f-4a6b-8c7d-000000000001?e=1791100000&s=" + "a".repeat(64);
  assert.equal(faceUrl(ok), ok);
  assert.equal(faceUrl(null), null);
  assert.equal(faceUrl("http://move.vip50one.com/api/face/x"), null);
  assert.equal(faceUrl("https://evil.example/api/face/x"), null);
  assert.equal(faceUrl("https://move.vip50one.com/contacts?id=x"), null);
  assert.equal(faceUrl("javascript:alert(1)"), null);
});
