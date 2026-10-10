import { test } from "node:test";
import assert from "node:assert/strict";
import { readPulseModes, setBody } from "../lib/pulseModes.ts";

test("pulse modes: checked; unknown modes read as Off; ONE MOVE's words kept; the body is set_via profile", () => {
  const m = readPulseModes({
    asked_at: null,
    autopilot_confirm: "Pulse will send these emails without asking you first.",
    handback_line: "Pulse always hands these back to you.",
    modes: { off: "Off", ask_me: "Ask me", autopilot: "Autopilot" },
    mode_lines: { off: "Pulse won't do this.", ask_me: "Pulse writes it; you tap Send.", autopilot: "Pulse sends emails for you." },
    workers: [
      { worker: "birthdays", question: "Birthdays?", example: "Happy birthday", mode: "ask_me", chosen: true, autopilot_blocked: "Autopilot opens once Pulse passes its safety test." },
      { worker: "nurture", question: "Nurture?", mode: "sideways" },
      { question: "no worker" },
    ],
  })!;
  assert.equal(m.workers.length, 2);
  assert.deepEqual([m.workers[0].mode, m.workers[0].blocked !== null, m.workers[1].mode], ["ask_me", true, "off"]);
  assert.equal(m.line.ask_me, "Pulse writes it; you tap Send.");
  assert.deepEqual(setBody("birthdays", "off"), { set_via: "profile", modes: { birthdays: "off" } });
  assert.equal(readPulseModes({ nope: 1 }), null);
});
