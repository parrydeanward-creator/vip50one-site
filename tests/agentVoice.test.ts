import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTERVIEW,
  VOICE_FIELDS,
  VOICE_LIMITS,
  demoVoiceState,
  fillFrom,
  forgetUrl,
  interviewBody,
  isEdited,
  learnBody,
  plainFill,
  readVoice,
  readVoiceState,
  saveBody,
  sourceWords,
  voiceChanged,
  EMPTY_VOICE,
} from "../lib/agentVoice.ts";

// PROFILE.md §5c "Pulse knows me": ONE MOVE's GET /api/brain/voice (vip50-web-crm#273), read defensively.

test("the GET answer is read field by field; nulls are empty and the switch is on unless it says false", () => {
  const s = readVoiceState({
    voice: { sample: "Hi there", never_say: null, known_for: 7, serves: "Move-up families", sign_off: "Talk soon" },
    learn_on: null,
    updated_at: "2026-10-16T10:00:00Z",
    learned: [
      { id: "a1", body: "Hi [name], so good to see you.", source: "brain:text", created_at: "2026-10-16T09:00:00Z" },
      { id: "", body: "no id" },
      { id: "a2", body: "   " },
      "junk",
    ],
    questions: ["Q1?", "", 4, "Q2?"],
  });
  assert.ok(s);
  assert.deepEqual(s!.voice, { sample: "Hi there", never_say: "", known_for: "", serves: "Move-up families", sign_off: "Talk soon" });
  assert.equal(s!.learnOn, true, "on by default");
  assert.equal(s!.updatedAt, "2026-10-16T10:00:00Z");
  assert.deepEqual(s!.learned, [{ id: "a1", body: "Hi [name], so good to see you.", source: "brain:text", createdAt: "2026-10-16T09:00:00Z" }]);
  assert.deepEqual(s!.questions, ["Q1?", "Q2?"]);
  assert.equal(readVoiceState({ voice: {}, learn_on: false })!.learnOn, false);
});

test("not an answer: null; no questions sent: the six interview questions", () => {
  assert.equal(readVoiceState(null), null);
  assert.equal(readVoiceState([]), null);
  assert.equal(readVoiceState({ learned: [] }), null, "no voice object");
  const s = readVoiceState({ voice: {} })!;
  assert.deepEqual(s.voice, EMPTY_VOICE);
  assert.deepEqual(s.learned, []);
  assert.equal(s.questions.length, 6);
  assert.deepEqual(s.questions, INTERVIEW);
});

test("at most 20 learned pieces are shown", () => {
  const learned = Array.from({ length: 25 }, (_, i) => ({ id: `p${i}`, body: `piece ${i}`, source: "move:text", created_at: null }));
  assert.equal(readVoiceState({ voice: {}, learned })!.learned.length, 20);
});

test("sizes: sample 12000, never_say 6000, known_for 6000, serves 4000, sign_off 300; reading and saving both clamp", () => {
  assert.deepEqual(VOICE_LIMITS, { sample: 12000, never_say: 6000, known_for: 6000, serves: 4000, sign_off: 300 });
  const long = Object.fromEntries(VOICE_FIELDS.map((f) => [f, "x".repeat(20000)]));
  const read = readVoice(long);
  const saved = saveBody(read);
  for (const f of VOICE_FIELDS) {
    assert.equal(read[f].length, VOICE_LIMITS[f], f);
    assert.equal(saved[f].length, VOICE_LIMITS[f], f);
  }
  assert.deepEqual(saveBody({ ...EMPTY_VOICE, sign_off: "  Talk soon, Sarah  " }), { ...EMPTY_VOICE, sign_off: "Talk soon, Sarah" });
});

test("a change is a change only when the trimmed words differ", () => {
  const a = { ...EMPTY_VOICE, sample: "Hi" };
  assert.equal(voiceChanged(a, { ...a, sample: "Hi  " }), false);
  assert.equal(voiceChanged(a, { ...a, sample: "Hello" }), true);
});

test("learn: skipped when the agent sent the draft unchanged (after trim), sent when they changed it", () => {
  assert.equal(isEdited("Hi Jenna, see you Saturday.", "  Hi Jenna, see you Saturday.  "), false);
  assert.equal(isEdited("Hi Jenna,\nsee you Saturday.", "hi jenna, see you saturday."), false, "case and spacing are not an edit");
  assert.equal(isEdited("Hi Jenna", ""), false, "nothing sent");
  assert.equal(isEdited("Hi Jenna", "Hey Jenna!"), true);
  assert.equal(learnBody("Hi Jenna", " Hi Jenna ", "brain:text"), null);
  assert.deepEqual(learnBody("Hi Jenna", " Hey Jenna! ", "brain:text", "c-1"), { draft: "Hi Jenna", final: "Hey Jenna!", source: "brain:text", contact_id: "c-1" });
  assert.deepEqual(learnBody("Hi", "Hey", "brain:email"), { draft: "Hi", final: "Hey", source: "brain:email" });
  assert.equal(learnBody("Hi", "Hey", "text"), null, "the source names the Brain and the piece");
  assert.equal(learnBody("Hi", "Hey", "move:text"), null, "the Brain only sends brain: pieces");
});

test("interview body: each answered question with its answer; nothing answered is null", () => {
  const qs = ["Q1?", "Q2?", "Q3?"];
  assert.deepEqual(interviewBody(qs, ["  Come to the party  ", "", "Never 'dream home'"]), { answers: [{ q: "Q1?", a: "Come to the party" }, { q: "Q3?", a: "Never 'dream home'" }] });
  assert.equal(interviewBody(qs, []), null);
  assert.equal(interviewBody(qs, [" ", ""]), null);
  assert.equal(interviewBody(qs, ["x".repeat(5000)])!.answers[0].a.length, 4000);
});

test("the interview's answer fills the form; a field it did not cover keeps what was there", () => {
  const form = { ...EMPTY_VOICE, sign_off: "Talk soon", known_for: "Old words" };
  const next = fillFrom(form, { voice: { sample: "Hi friend", never_say: "Act now", known_for: "", serves: null, sign_off: "" }, source: "pulse" });
  assert.deepEqual(next, { sample: "Hi friend", never_say: "Act now", known_for: "Old words", serves: "", sign_off: "Talk soon" });
  assert.equal(fillFrom(form, { error: "Answer at least one question first." }), null);
  assert.equal(fillFrom(form, null), null);
});

test("the example agent's interview places each answer by its question, as ONE MOVE's plain fallback does", () => {
  const v = plainFill(EMPTY_VOICE, ["Party at mine", "Hey stranger", "Act now", "Straight answers", "First-time buyers", "Talk soon"]);
  assert.deepEqual(v, { sample: "Party at mine\n\nHey stranger", never_say: "Act now", known_for: "Straight answers", serves: "First-time buyers", sign_off: "Talk soon" });
});

test("where a learned piece came from, in plain words", () => {
  assert.equal(sourceWords("brain:text"), "A text from the Brain");
  assert.equal(sourceWords("open:visitor_followup"), "A visitor follow-up from ONE Open");
  assert.equal(sourceWords("marquee_caption"), "A caption from Marquee");
  assert.equal(sourceWords("websites:blog"), "A blog post from your website");
  assert.equal(sourceWords("showly"), "From Showly");
  assert.equal(sourceWords("move:new_thing"), "New thing from ONE MOVE");
});

test("delete names one piece; the example agent's data reads back as a valid answer", () => {
  assert.equal(forgetUrl("a b"), "https://move.vip50one.com/api/brain/voice?id=a%20b");
  const d = demoVoiceState();
  const again = readVoiceState({ voice: d.voice, learn_on: d.learnOn, updated_at: d.updatedAt, learned: d.learned.map((x) => ({ id: x.id, body: x.body, source: x.source, created_at: x.createdAt })), questions: d.questions });
  assert.deepEqual(again, d);
  for (const x of d.learned) assert.doesNotMatch(x.body, /@|\d{3}[-. ]\d{4}/, "no emails or phone numbers in the example");
});
