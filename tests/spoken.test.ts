import { test } from "node:test";
import assert from "node:assert/strict";
import { spokenMorning } from "../lib/spoken.ts";

test("greets by first name, then the note", () => {
  assert.equal(spokenMorning("Good morning", "Sarah", "Three things first.  Call Jen."), "Good morning, Sarah. Three things first. Call Jen.");
  assert.equal(spokenMorning("Good morning", "", "Call Jen."), "Good morning. Call Jen.");
});

test("stays inside a minute, cut at a sentence end", () => {
  const long = Array.from({ length: 40 }, (_, i) => `Sentence ${i} has five words.`).join(" ");
  const s = spokenMorning("Good morning", "Sarah", long);
  assert.ok(s.split(" ").length <= 150);
  assert.match(s, /\.$/);
  assert.match(spokenMorning("Hi", "A", "One two three. Four five six.", 6), /^Hi, A\. One two three\.$/);
});
