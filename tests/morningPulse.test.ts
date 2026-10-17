import { test } from "node:test";
import assert from "node:assert/strict";
import { ORB_IDS, awaySentence, buildMorningPulse, demoEvening, demoMorning, orbFor, readEvening, readMorning, readySentence, scriptMs, sinceSentence, type Known } from "../lib/morningPulse.ts";
import { OPP_NODE } from "../lib/opportunities.ts";
import { DEALS_NODE } from "../lib/deals.ts";
import { moveGroupId } from "../lib/moveMenu.ts";

// Morning Pulse (Parry, 16 Oct 21:14 MT): one voiced minute replacing Watch Pulse work, Watch ONE Work and Listen.

const known: Known = { planCount: 6, needs: [{ label: "Call Jen Alvarez", why: "Birthday today" }] };
const ROUTE = {
  since_yesterday: [
    { kind: "new_lead", count: 2, first_names: ["Rosa", "Ken"], orb: "leads" },
    { kind: "deadline", count: 1, first_names: ["Ken"], orb: "deals" },
    { kind: "rsvp", count: 0, first_names: [], orb: "events" },
    { kind: "nonsense", count: 4 },
  ],
  top3: [
    { contact_id: "c1", first_name: "Rosa", photo_url: "https://x.example/rosa.jpg", reason_plain: "She asked about Draper homes last night", tool: "call" },
    { contact_id: "c2", first_name: "Ken", photo_url: "http://insecure/ken.jpg", reason_plain: "Inspection deadline Thursday.", tool: "deal" },
    { contact_id: "c3", first_name: "Jen", photo_url: null, reason_plain: "Birthday today.", tool: "task" },
    { contact_id: "c4", first_name: "Fourth", reason_plain: "Never shown.", tool: "call" },
  ],
  ready: [{ kind: "text_draft", count: 3 }, { kind: "newsletter", count: 1 }],
  autopilot_sent: [{ worker: "speed_to_lead", count: 4 }, { worker: "seller_signals", count: 2 }],
};

test("readMorning: checks the route, drops empty and unknown kinds, keeps three, https photos only", () => {
  const m = readMorning(ROUTE)!;
  assert.deepEqual(m.since.map((s) => s.kind), ["new_lead", "deadline"]);
  assert.equal(m.top3.length, 3);
  assert.equal(m.top3[0].photoUrl, "https://x.example/rosa.jpg");
  assert.equal(m.top3[1].photoUrl, null);
  assert.equal(readMorning(null), null);
  assert.equal(readMorning({ error: "nope" }), null);
  assert.equal(readMorning([1, 2]), null);
});

test("sentences: what changed, what is ready, what Autopilot sent", () => {
  assert.equal(sinceSentence({ kind: "new_lead", count: 2, firstNames: ["Rosa", "Ken"], orb: "leads" }), "2 new leads came in: Rosa and Ken.");
  assert.equal(sinceSentence({ kind: "new_lead", count: 5, firstNames: ["Rosa", "Ken", "Amy"], orb: "leads" }), "5 new leads came in, including Rosa, Ken and Amy.");
  assert.equal(sinceSentence({ kind: "deadline", count: 1, firstNames: ["Ken"], orb: "deals" }), "A deal deadline is coming up, for Ken.");
  assert.equal(sinceSentence({ kind: "referral", count: 1, firstNames: [], orb: "referrals" }), "1 new referral came in.");
  assert.equal(readySentence([{ kind: "text_draft", count: 3 }, { kind: "newsletter", count: 1 }]), "3 texts are waiting on your phone; your newsletter draft is ready.");
  assert.equal(readySentence([]), null);
  assert.equal(awaySentence([{ worker: "speed_to_lead", count: 4 }, { worker: "seller_signals", count: 2 }]), "While you were away I sent 4 messages for speed to lead and 2 for seller signals.");
  assert.equal(awaySentence([]), null);
});

test("buildMorningPulse: since, three with faces and tools, ready, Autopilot, ends on the plan", () => {
  const beats = buildMorningPulse({ firstName: "Sarah", greeting: "Good morning", evening: false, morning: readMorning(ROUTE), eveningAnswer: null, known });
  assert.deepEqual(beats.map((b) => b.part), ["hello", "since", "since", "top", "top", "top", "top", "ready", "away", "plan"]);
  assert.equal(beats[0].words, "Good morning, Sarah. Here's your Morning Pulse: what changed, what matters today, and what I got ready.");
  assert.equal(beats[1].words, "2 new leads came in: Rosa and Ken.");
  assert.equal(beats[1].orb, "leads");
  assert.equal(beats[2].orb, "deals");
  const rosa = beats[4];
  assert.equal(rosa.words, "First, Rosa. She asked about Draper homes last night.");
  assert.deepEqual(rosa.face, { name: "Rosa", photo: "https://x.example/rosa.jpg", initials: "R" });
  assert.deepEqual(rosa.tool, { kind: "call", contactId: "c1", label: "Call Rosa" });
  assert.equal(beats[5].tool?.label, "Open Deals");
  assert.equal(beats[5].orb, "deals");
  assert.equal(beats[6].tool?.label, "Open the task");
  assert.equal(beats[7].words, "3 texts are waiting on your phone; your newsletter draft is ready.");
  assert.equal(beats[8].product, "ONE Growth");
  const plan = beats[beats.length - 1];
  assert.equal(plan.words, "Here's your plan: 6 things round your calendar. Tap Looks good to approve your day.");
  assert.equal(plan.product, "ONE YOU");
  for (const b of beats) {
    assert.ok(b.words.length > 0 && b.ms >= 2600, b.id);
    assert.ok(!/ONE GO/.test(b.words), "the desktop is ONE YOU, never ONE GO");
  }
  assert.equal(new Set(beats.map((b) => b.id)).size, beats.length);
  // about a minute with the sound off
  const s = scriptMs(beats);
  assert.ok(s > 35_000 && s < 90_000, String(s));
});

test("buildMorningPulse: nothing new still says so; an approved plan is not asked again", () => {
  const beats = buildMorningPulse({ firstName: "", greeting: "Good morning", evening: false, morning: { since: [], top3: [], ready: [], autopilotSent: [] }, eveningAnswer: null, known, approved: true });
  assert.deepEqual(beats.map((b) => b.words), [
    "Good morning. Here's your Morning Pulse: what changed, what matters today, and what I got ready.",
    "Nothing new came in since yesterday.",
    "Your plan for today is approved. Here it is.",
  ]);
});

test("buildMorningPulse: the route failed: says less from what the Brain knows, never empty", () => {
  const beats = buildMorningPulse({ firstName: "Sarah", greeting: "Good morning", evening: false, morning: null, eveningAnswer: null, known });
  assert.deepEqual(beats.map((b) => b.words), [
    "Good morning, Sarah. Here's your Morning Pulse.",
    "One thing needs you today.",
    "First, Call Jen Alvarez. Birthday today.",
    "Here's your plan: 6 things round your calendar. Tap Looks good to approve your day.",
  ]);
  const bare = buildMorningPulse({ firstName: "", greeting: "Good morning", evening: false, morning: null, eveningAnswer: null, known: { planCount: 0, needs: [] } });
  assert.deepEqual(bare.map((b) => b.part), ["hello", "plan"]);
});

test("buildMorningPulse after 5 pm: how today went, then tomorrow", () => {
  const e = readEvening({ done: 7, moved: 2, wins: ["Rosa booked a showing.", { text: "Closed on Elm St" }], tomorrow_top3: [{ contact_id: "c2", first_name: "Ken", reason_plain: "Inspection deadline tomorrow.", tool: "deal" }] })!;
  const beats = buildMorningPulse({ firstName: "Sarah", greeting: "Good evening", evening: true, morning: null, eveningAnswer: e, known });
  assert.deepEqual(beats.map((b) => b.words), [
    "Good evening, Sarah. Here's how today went.",
    "You got 7 things done. 2 things move to tomorrow.",
    "Your wins today: Rosa booked a showing; Closed on Elm St.",
    "Here's tomorrow: the one thing that matters most.",
    "First, Ken. Inspection deadline tomorrow.",
    "Tomorrow's plan is in Plan my day. Look it over when you're ready.",
  ]);
  assert.equal(beats[4].tool?.label, "Open Deals");
  assert.equal(readEvening("x"), null);
});

test("the example agent: Rosa, Ken and a deal deadline", () => {
  const m = demoMorning();
  assert.deepEqual(m.since[0].firstNames, ["Rosa", "Ken"]);
  assert.ok(m.since.some((s) => s.kind === "deadline"));
  assert.ok(demoEvening().tomorrowTop3.length > 0);
});

test("orbFor: the first of the orb's ids on the graph; Opportunities for leads and Looks hot", () => {
  const has = (ids: string[]) => (id: string) => ids.includes(id);
  assert.equal(orbFor("leads", has([OPP_NODE])), OPP_NODE);
  assert.equal(orbFor("looks_hot", has([OPP_NODE])), OPP_NODE);
  assert.equal(orbFor("deals", has([DEALS_NODE])), DEALS_NODE);
  assert.equal(orbFor("events", has([moveGroupId("events")])), moveGroupId("events"));
  assert.equal(orbFor("market_reports", has([moveGroupId("outreach")])), moveGroupId("outreach"), "Outreach when Market Reports is not on the graph");
  assert.equal(orbFor("referrals", has([])), null);
  assert.equal(orbFor(null, has([OPP_NODE])), null);
  assert.equal(ORB_IDS.leads[0], OPP_NODE);
});
