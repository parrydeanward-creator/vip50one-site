import { test } from "node:test";
import assert from "node:assert/strict";
import { dayFilm, readDayItems } from "../lib/dayFilm.ts";

test("day film: the agent's own items in time order; nothing invented; nothing planned, no film", () => {
  const r = readDayItems({
    first: "Parry",
    items: [
      { start: "12:30", what: "Lunch with Marcus", product: "move", minutes: 60 },
      { start: "08:00", what: "Call Jen Alvarez", product: "move", minutes: 10, done: true },
      { start: "9am", what: "bad time" },
      { start: "10:00", what: "Approve 5 posts", product: "elsewhere", minutes: 15 },
    ],
  })!;
  assert.deepEqual(r.items.map((i) => i.what), ["Call Jen Alvarez", "Approve 5 posts", "Lunch with Marcus"]);
  assert.equal(r.items[1].product, "one", "an unknown product is ONE");
  const f = dayFilm(r.items, r.first)!;
  assert.equal(f.steps.length, 5);
  assert.equal(f.steps[0].title, "Parry, here is your day.");
  assert.equal(f.steps[1].kicker, "8:00am · ONE MOVE");
  assert.equal(f.steps[1].line, "Done. 10 min.");
  assert.equal(f.steps.at(-1)!.title, "3 things. About 1 h 25 min. 1 done already.");
  assert.ok(f.steps.every((s) => !s.coming), "the agent's own day: nothing is labelled coming");
  for (const s of f.steps) for (const id of s.show) assert.ok(f.spots[id] || id === "one", `${id} has a place`);
  assert.equal(dayFilm([], "Parry"), null);
  assert.equal(readDayItems({}), null);
});
