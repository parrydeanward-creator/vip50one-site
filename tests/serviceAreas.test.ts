import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AREAS_MAX,
  DEMO_LIST,
  addArea,
  areasBody,
  areasChanged,
  areasError,
  areasUrl,
  countLine,
  demoAreas,
  onList,
  readAreas,
  removeArea,
  savedAreas,
  suggest,
} from "../lib/serviceAreas.ts";

// PROFILE.md §2 v1.9 "Where I work": ONE MOVE's GET/POST /api/brain/profile/areas, read defensively.

test("the route is ONE MOVE's", () => {
  assert.equal(areasUrl, "https://move.vip50one.com/api/brain/profile/areas");
});

test("GET is read defensively: junk dropped, repeats dropped, list A-Z, max never above 12", () => {
  const s = readAreas({ areas: ["Draper", " Sandy ", 4, "", "draper", null], list: ["Sandy", "Alpine", 7, "Draper", "Alpine"], max: 40 });
  assert.deepEqual(s, { areas: ["Draper", "Sandy"], list: ["Alpine", "Draper", "Sandy"], max: 12 });
  assert.equal(readAreas({ areas: [], list: [], max: 5 })!.max, 5);
  assert.equal(readAreas({ list: [] })!.max, AREAS_MAX, "max missing: 12");
  assert.deepEqual(readAreas({ list: ["Lehi"] })!.areas, [], "areas missing: none");
  assert.equal(readAreas(null), null);
  assert.equal(readAreas([]), null);
  assert.equal(readAreas({ areas: ["Lehi"] }), null, "no list: not an answer");
  const many = Array.from({ length: 20 }, (_, i) => `City ${i}`);
  assert.equal(readAreas({ areas: many, list: many })!.areas.length, 12);
});

test("suggestions: starts-with first, then contains; case-insensitive; picked hidden; at most 8", () => {
  const list = DEMO_LIST;
  assert.deepEqual(suggest(list, "salt", []), ["Salt Lake City", "South Salt Lake"]);
  assert.deepEqual(suggest(list, "SALT", ["Salt Lake City"]), ["South Salt Lake"]);
  assert.deepEqual(suggest(list, "  ", []), []);
  assert.deepEqual(suggest(list, "zzz", []), []);
  const s = suggest(list, "o", []);
  assert.equal(s.length, 8);
  assert.equal(s[0], "Orem", "the one starting with o comes first");
  assert.ok(!suggest(list, "dr", ["draper"]).includes("Draper"), "picked hidden whatever the case");
  assert.deepEqual(suggest(["Sandy", "Lehi"], "x", []), [], "only names from the list");
});

test("a typed name matches the list's spelling only when it is on the list", () => {
  assert.equal(onList(DEMO_LIST, "  park   city "), "Park City");
  assert.equal(onList(DEMO_LIST, "Parkville"), null);
  assert.equal(onList(DEMO_LIST, ""), null);
});

test("add and remove: no repeats (any case), never more than 12", () => {
  let p = addArea([], "Draper");
  p = addArea(p, "draper");
  assert.deepEqual(p, ["Draper"]);
  p = addArea(p, "  ");
  assert.deepEqual(p, ["Draper"]);
  const twelve = Array.from({ length: 12 }, (_, i) => `C${i}`);
  assert.equal(addArea(twelve, "Lehi"), twelve, "at 12 nothing is added");
  assert.deepEqual(removeArea(["Draper", "Sandy", "Lehi"], "Sandy"), ["Draper", "Lehi"]);
  assert.equal(countLine(3), "3 of 12");
  assert.equal(areasChanged(["Draper"], ["Draper"]), false);
  assert.equal(areasChanged(["Draper", "Sandy"], ["Sandy", "Draper"]), true);
});

test("the POST body: {areas}, trimmed, no repeats, at most 12, in the order picked", () => {
  assert.deepEqual(areasBody([" Lehi ", "Draper", "lehi"]), { areas: ["Lehi", "Draper"] });
  assert.deepEqual(areasBody([]), { areas: [] });
  const many = Array.from({ length: 15 }, (_, i) => `C${i}`);
  assert.equal(areasBody(many).areas.length, 12);
});

test("the answer: saved names from ONE MOVE, its error words on a refusal, with unknown names named", () => {
  assert.deepEqual(savedAreas({ ok: true, areas: ["Sandy"] }, ["x"]), ["Sandy"]);
  assert.deepEqual(savedAreas({ ok: true }, ["Lehi"]), ["Lehi"]);
  assert.equal(areasError({ error: "Pick names from the list.", unknown: ["Gotham"] }), "Pick names from the list. (Gotham)");
  assert.equal(areasError({ error: "Gotham is not a Utah city or town.", unknown: ["Gotham"] }), "Gotham is not a Utah city or town.");
  assert.equal(areasError({ error: "Up to 12." }), "Up to 12.");
  assert.equal(areasError(null), "That didn't save. Nothing was changed.");
});

test("demo: Draper, Sandy and Lehi from a short list that has the cities named", () => {
  const d = demoAreas();
  assert.deepEqual(d.areas, ["Draper", "Sandy", "Lehi"]);
  for (const c of ["Salt Lake City", "Cottonwood Heights", "South Salt Lake", "Draper", "Sandy", "Lehi", "Park City", "Heber City", "Bountiful", "Murray"]) assert.ok(d.list.includes(c), c);
  assert.ok(d.areas.every((a) => d.list.includes(a)));
});
