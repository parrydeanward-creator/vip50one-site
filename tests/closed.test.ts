import { test } from "node:test";
import assert from "node:assert/strict";
import { demoClosed, readClosed, readReview, reviewLinks, stepAction, stepBody, stepsLeft } from "../lib/closed.ts";

test("closed: reads homes, orders steps, drops bad ones", () => {
  const h = readClosed({ homes: [{ id: "a", title: "Closed: 1 Elm St", closed_on: "2026-10-10", price: 500000, sources: ["marquee", "move"], steps: [
    { key: "off_sale", label: "Off sale", done: true, auto: true },
    { key: "goal", label: "Log it", done: false, auto: false, ready: true },
    { key: "goal", label: "dup" },
    { key: "nope", label: "x" },
  ] }, { id: "", steps: [] }, "junk"] })!;
  assert.equal(h.length, 1);
  assert.deepEqual(h[0].steps.map((s) => s.key), ["goal", "off_sale"]);
  assert.deepEqual(h[0].sources, ["marquee", "move"]);
  assert.equal(readClosed({}), null);
});

test("closed: every step waits for a tap; auto steps have no button; review only once ready", () => {
  const [h] = demoClosed();
  const by = Object.fromEntries(h.steps.map((s) => [s.key, s]));
  assert.equal(stepAction(by.goal), "Log it");
  assert.equal(stepAction(by.review), null); // not until goal is logged
  assert.equal(stepAction(by.move_watch), null);
  assert.equal(stepAction(by.off_sale), null);
  assert.equal(stepAction(by.results_wall), "My client said yes");
  assert.equal(stepAction({ ...by.results_wall, done: true }), "Take it down");
  assert.equal(stepsLeft(h), 3);
});

test("closed: bodies; GCI only on goal and only a positive number", () => {
  const [h] = demoClosed();
  const goal = h.steps.find((s) => s.key === "goal")!;
  const wall = h.steps.find((s) => s.key === "results_wall")!;
  assert.deepEqual(stepBody("x", goal, "$12,500"), { id: "x", step: "goal", gci: 12500 });
  assert.deepEqual(stepBody("x", goal, "abc"), { id: "x", step: "goal" });
  assert.deepEqual(stepBody("x", wall), { id: "x", step: "results_wall", ok: true });
  assert.deepEqual(stepBody("x", { ...wall, done: true }), { id: "x", step: "results_wall", ok: false });
});

test("closed: the review is the agent's own send (sms/mailto), never sent by ONE", () => {
  const d = readReview({ text: "Would you leave a review?", email: "pat@example.com", phone: "(801) 555-0100" })!;
  const l = reviewLinks(d);
  assert.match(l.sms!, /^sms:8015550100\?&body=Would%20you/);
  assert.match(l.mail!, /^mailto:pat@example\.com\?subject=/);
  assert.equal(readReview({ email: "x@y.z" }), null);
  assert.equal(reviewLinks({ text: "t", email: null, phone: null }).sms, null);
});
