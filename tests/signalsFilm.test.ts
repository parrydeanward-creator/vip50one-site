import { test } from "node:test";
import assert from "node:assert/strict";
import { SIGNAL_SPOTS, SIGNAL_STEPS, SIGNALS_MS, signalsGraph, signalsVtt } from "../lib/signalsFilm.ts";
import { needsOf } from "../lib/needs.ts";
import { shownAt } from "../lib/watch.ts";

// v2 (Parry, 15 Oct: "lets redo the video with the correct info and added features"). Rewritten on purpose: the film
// now follows research/films/what-everything-means-v2.md word for word (22 moments); v1's "lines" and in-page moments
// (Touch Audit, Rolodex, Contacts) were dropped by that script.
const SCRIPT = [
  "Every light, ring and colour in ONE, in about two minutes.",
  "The gold ONE in the middle is breathing. That's Pulse, awake and watching your business. Tap it to meet Pulse.",
  "Pulsing red means right now. Tom's follow-up is three days late. Do this first.",
  "Pulsing yellow means today. Sarah's call is due.",
  "Every orb above a pulse pulses too, with a number. Follow it straight to the person.",
  "A still green ring means all good. Nothing here needs you.",
  "A gold glow is a special day. Jen's birthday is today.",
  "A gold dot is an opportunity Pulse spotted for you.",
  "A ring that spreads once means something changed since you were last here.",
  "A light flying into ONE means something just happened, like a box ticked on your phone or a visitor at your open house.",
  "The arc around an orb shows how far along you are. 14 of 25 VIP touches this month.",
  "A faded orb is not in your package yet. Tap it to see what it adds.",
  "The gold pill at the top always tells you what to do right now. Tap it to open your day.",
  "Pulse plans your day round your calendar. Tap Looks good, then tick Done as you go. Anything you miss moves up by itself.",
  "Ask Pulse anything about your business. \"Who haven't I called in 60 days?\" The people come up as orbs.",
  "Tap any orb and it comes to the middle and opens. The back arrow takes you back to everything.",
  "Slide the timeline left to see what happened, right to see what is coming: birthdays, open houses, posts. Tap Today to come back.",
  "Hot, Warm and Cold pulse every day until you work them.",
  "Your VIP-50 and VIP-100 sit in rings. A red glow means overdue.",
  "Your photo opens your menu: My Profile, your website, your Growth results and your plan.",
  "Lost? Tap the gold question mark for this key any time.",
  "Red, now. Yellow, today. Green, all good. Follow the pulse.",
];

test("the film says the v2 script, word for word, in order", () => {
  assert.deepEqual(SIGNAL_STEPS.map((s) => s.say), SCRIPT);
  assert.ok(SIGNALS_MS > 110_000 && SIGNALS_MS < 170_000, `about two minutes (${SIGNALS_MS / 1000}s)`);
  const words = SCRIPT.join(" ");
  assert.ok(!/ONE GO/.test(words), "ONE GO is ONE YOU on the map and 'your phone' in speech");
  for (const s of SIGNAL_STEPS) assert.ok(s.ms >= s.say!.split(/\s+/).length * 330, `${s.id} leaves time to say its line`);
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

test("captions say exactly the spoken words, one cue a moment", () => {
  const v = signalsVtt();
  assert.ok(v.startsWith("WEBVTT\n\n00:00.300 --> "));
  assert.equal(v.match(/-->/g)?.length, SIGNAL_STEPS.length);
  for (const line of SCRIPT) assert.ok(v.includes(`\n${line}\n`), `caption: ${line}`);
});
