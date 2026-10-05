import { test } from "node:test";
import assert from "node:assert/strict";
import { SIGNAL_SPOTS, SIGNAL_STEPS, SIGNALS_MS, signalsGraph, signalsVtt } from "../lib/signalsFilm.ts";
import { needsOf } from "../lib/needs.ts";
import { shownAt } from "../lib/watch.ts";

test("every signal the Brain draws has its moment in the film", () => {
  const titles = SIGNAL_STEPS.map((s) => s.title).join(" | ");
  for (const w of ["breathing", "red: right now", "yellow: today", "green ring: all good", "follow the pulse", "special day", "opportunity", "it changed", "flying into ONE", "along the lines", "how far along", "not in your package", "frost", "VIP-100", "Touches fill up", "gold badge"]) {
    assert.ok(titles.includes(w), `missing: ${w}`);
  }
  assert.ok(SIGNALS_MS > 60_000 && SIGNALS_MS < 120_000, "about a minute or so");
});

test("every node it shows has a place, and the counts it promises are what the Brain would draw", () => {
  const g = signalsGraph();
  for (const s of SIGNAL_STEPS) for (const id of s.show) if (id !== "one") assert.ok(SIGNAL_SPOTS[id], `no spot for ${id}`);
  const i = SIGNAL_STEPS.findIndex((s) => s.id === "sg-count");
  const shown = new Set(shownAt(i, SIGNAL_STEPS));
  const needs = needsOf(g.nodes.filter((n) => shown.has(n.id)));
  assert.deepEqual(needs.get("move"), { count: 2, level: "now" }, "ONE MOVE 2, as the caption says");
  assert.deepEqual(needs.get("s-follow"), { count: 2, level: "now" });
  assert.deepEqual(needs.get("s-sarah"), { count: 1, level: "today" });
});

test("captions follow the steps in order", () => {
  const v = signalsVtt();
  assert.ok(v.startsWith("WEBVTT\n\n00:00.300 --> 00:04.000\nEvery light, ring and colour in ONE."));
  assert.equal(v.match(/-->/g)?.length, SIGNAL_STEPS.length);
});
