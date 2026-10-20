import { test } from "node:test";
import assert from "node:assert/strict";
import { blockNumbers, whoLine } from "../lib/dayLabels.ts";

const titles = new Map([
  ["go:task:1", "Call John"],
  ["go:task:2", "Call Brent"],
  ["go:task:3", "Video text Lycia"],
  ["go:task:4", "Social media touch — Steve"],
  ["go:task:5", "Handwritten note to Sarah"],
  ["go:task:6", "Drop by Alex"],
  ["day-x", "Approve 5 posts for 1482 Maple Ridge Dr."],
]);

test("whoLine: who each block is for, grouped by touch", () => {
  assert.equal(whoLine(["go:task:1", "go:task:2", "go:task:3", "go:task:4"], titles), "Call John, Brent · Video text Lycia · Social Steve");
  assert.equal(whoLine(["go:task:5"], titles), "Note Sarah");
  assert.equal(whoLine(["go:task:6"], titles), "Drop by Alex");
  assert.equal(whoLine(["day:day-x"], titles), "Approve 5 posts for 1482 Maple Ridge Dr");
  assert.equal(whoLine(["unknown"], titles), "");
  assert.equal(whoLine(["w"], new Map([["w", "Write Dave Kim a handwritten note."]])), "Note Dave Kim");
});

test("whoLine: at most eight names, then how many more", () => {
  const many = new Map(Array.from({ length: 11 }, (_, i) => [`r${i}`, `Call P${i}`] as [string, string]));
  assert.equal(whoLine([...many.keys()], many), "Call P0, P1, P2, P3, P4, P5, P6, P7 · +3 more");
});

test("blockNumbers: numbered in time order", () => {
  const n = blockNumbers([{ id: "b", start: "12:40" }, { id: "a", start: "09:00" }, { id: "c", start: "15:00" }]);
  assert.deepEqual([n.get("a"), n.get("b"), n.get("c")], [1, 2, 3]);
});
