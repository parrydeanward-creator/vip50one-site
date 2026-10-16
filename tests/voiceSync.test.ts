import { test } from "node:test";
import assert from "node:assert/strict";
import { readKind, readPulseVoice, syncKind, voiceKindBody } from "../lib/voicePick.ts";

// Pulse's voice from MASTER (user_profiles.pulse_voice, vip50-web-crm#277) via ONE MOVE's /api/brain/profile.

test("readPulseVoice: man, woman; null means Man; missing or odd leaves the local copy alone", () => {
  assert.equal(readPulseVoice({ email: "a@b.com", pulse_voice: "woman" }), "woman");
  assert.equal(readPulseVoice({ pulse_voice: "man" }), "man");
  assert.equal(readPulseVoice({ pulse_voice: null }), "man");
  assert.equal(readPulseVoice({ email: "a@b.com" }), undefined);
  assert.equal(readPulseVoice({ pulse_voice: "robot" }), undefined);
  assert.equal(readPulseVoice(null), undefined);
  assert.equal(readPulseVoice("woman"), undefined);
  assert.equal(readPulseVoice([]), undefined);
});

test("syncKind writes MASTER's value into the local copy say() reads", () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown };
  const had = "window" in g;
  g.window = { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } };
  try {
    assert.equal(readKind(), "man");
    assert.equal(syncKind({ pulse_voice: "woman" }), "woman");
    assert.equal(readKind(), "woman");
    assert.equal(syncKind({ email: "a@b.com" }), undefined);
    assert.equal(readKind(), "woman"); // an older route's answer leaves it
    assert.equal(syncKind({ pulse_voice: null }), "man");
    assert.equal(readKind(), "man");
  } finally {
    if (!had) delete g.window;
  }
});

test("the save body", () => {
  assert.deepEqual(voiceKindBody("woman"), { pulse_voice: "woman" });
});
