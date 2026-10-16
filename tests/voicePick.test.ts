import { test } from "node:test";
import assert from "node:assert/strict";
import { pickVoice } from "../lib/voicePick.ts";

const v = (name: string, lang = "en-US", extra = {}) => ({ name, lang, ...extra });

test("Edge: a Natural voice beats the old desktop voice", () => {
  const got = pickVoice([v("Microsoft David - English (United States)", "en-US", { default: true }), v("Microsoft Aria Online (Natural) - English (United States)")]);
  assert.match(got!.name, /Aria Online \(Natural\)/);
});

test("Apple: Premium beats Enhanced beats Compact, and novelty voices are never chosen", () => {
  const got = pickVoice([v("Fred"), v("Zarvox"), v("Samantha (Compact)"), v("Ava (Enhanced)"), v("Zoe (Premium)")]);
  assert.equal(got!.name, "Zoe (Premium)");
  assert.equal(pickVoice([v("Fred"), v("Albert")]), null);
});

test("Chrome: the Google voice is taken over the local default", () => {
  const got = pickVoice([v("Microsoft Mark - English (United States)", "en-US", { default: true }), v("Google US English")]);
  assert.equal(got!.name, "Google US English");
});

test("English only; US first when two are equal", () => {
  assert.equal(pickVoice([v("Google Deutsch", "de-DE")]), null);
  assert.equal(pickVoice([v("Google UK English Female", "en-GB"), v("Google US English", "en-US")])!.name, "Google US English");
});

test("nothing to choose keeps the browser default", () => {
  assert.equal(pickVoice([]), null);
});

import { pickVoiceOf, voiceKind, fallbackLine, DEFAULT_VOICE_KIND } from "../lib/voicePick.ts";

test("man or woman: default Man; the best natural voice of the chosen kind; fall back and say so", () => {
  assert.equal(DEFAULT_VOICE_KIND, "man");
  const voices = [v("Microsoft Aria Online (Natural) - English (United States)"), v("Microsoft Guy Online (Natural) - English (United States)"), v("Samantha"), v("Google US English")];
  assert.match(pickVoiceOf(voices).voice!.name, /Guy Online/);
  assert.match(pickVoiceOf(voices, "woman").voice!.name, /Aria Online/);
  const onlyWomen = [v("Samantha (Enhanced)"), v("Google US English")];
  const r = pickVoiceOf(onlyWomen, "man");
  assert.equal(r.fellBack, true);
  assert.equal(r.voice!.name, "Samantha (Enhanced)");
  assert.equal(fallbackLine("man"), "This device has no natural man's voice, so Pulse is using a woman's.");
  assert.equal(voiceKind(v("Evan (Enhanced)")), "man");
  assert.equal(voiceKind(v("Google US English")), "woman");
  assert.equal(voiceKind(v("Fred")), null);
});
