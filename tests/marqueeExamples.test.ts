import { test } from "node:test";
import assert from "node:assert/strict";
import { MQ_DECKS, MQ_KEYS, MQ_LISTINGS, MQ_POSTS, MQ_REPORTS, MQ_ROOMS, MQ_START, calendarWeek, dayName, mqCaption, mqKeyOf, mqReduce, mqWaiting } from "../lib/examples/marquee.ts";
import { marqueeToolOrbs } from "../lib/productTools.ts";

// Marquee's side panels show the example itself (Parry, 18 Oct: "the side information is blank").

test("every Marquee tool orb has its example view", () => {
  const ids = marqueeToolOrbs(null, "2026-10-18").map((t) => t.id);
  assert.deepEqual(ids.map(mqKeyOf), [...MQ_KEYS]);
  assert.equal(mqKeyOf("marquee-tool-nope"), null);
  assert.equal(mqKeyOf("showly-tool-tours"), null);
  assert.equal(mqKeyOf(undefined), null);
});

test("the example holds what Parry asked for", () => {
  assert.equal(MQ_LISTINGS.length, 3);
  assert.equal(MQ_POSTS.length, 7);
  assert.equal(MQ_REPORTS.length, 2);
  assert.equal(MQ_DECKS.length, 2);
  assert.equal(MQ_ROOMS.length, 4);
  assert.ok(MQ_DECKS.every((d) => d.sections.length === d.pages), "one section per page");
  assert.ok(MQ_REPORTS.every((r) => !/\s/.test(r.seller)), "sellers by first name only");
  // the Posts waiting orb's own example rows add up to the 7 posts
  const posts = marqueeToolOrbs(null, "2026-10-18").find((t) => t.key === "posts")!;
  assert.equal(posts.sub, "Example · 7 to approve");
  assert.equal(posts.rows.reduce((n, r) => n + Number(r.label.split(" ")[0]), 0), 7);
});

test("calendar: seven days from today, every built post on its day, nothing posts unapproved", () => {
  const w = calendarWeek("2026-10-18");
  assert.equal(w.length, 7);
  assert.equal(w[0].name, "Today");
  assert.equal(w[1].name, "Tomorrow");
  assert.equal(w[2].name, "Tue");
  assert.equal(w[2].date, "20 Oct");
  assert.equal(dayName("2026-10-18", 6), "Sat");
  const all = w.flatMap((d) => d.posts);
  assert.equal(all.filter((p) => p.post).length, 7);
  assert.ok(all.filter((p) => p.post).every((p) => p.words === "Waiting for you"));
  // in time order within a day
  const day1 = w[1].posts.map((p) => p.time);
  assert.deepEqual(day1, ["9:00 AM", "7:00 PM"]);
  const s = mqReduce(mqReduce(MQ_START, { t: "approve", id: "p1" }), { t: "approve", id: "p2" });
  const s2 = mqReduce(s, { t: "publish" });
  const words = (st: typeof s) => Object.fromEntries(calendarWeek("2026-10-18", st).flatMap((d) => d.posts).filter((p) => p.post).map((p) => [p.post, p.words]));
  assert.equal(words(s).p1, "Approved, tap Publish");
  assert.equal(words(s2).p1, "Scheduled");
  assert.equal(words(s2).p3, "Waiting for you");
});

test("approve, edit, publish and send change the example only as asked", () => {
  let s = mqReduce(MQ_START, { t: "publish" });
  assert.deepEqual(s.published, [], "publish with nothing approved publishes nothing");
  s = mqReduce(s, { t: "approve", id: "p3" });
  s = mqReduce(s, { t: "approve", id: "p3" });
  assert.deepEqual(s.approved, ["p3"]);
  assert.equal(mqReduce(s, { t: "approve", id: "zzz" }), s, "unknown post changes nothing");
  s = mqReduce(s, { t: "caption", id: "p4", text: "  New words  " });
  assert.equal(mqCaption(s, MQ_POSTS[3]), "New words");
  assert.equal(mqCaption(mqReduce(s, { t: "caption", id: "p4", text: "   " }), MQ_POSTS[3]), MQ_POSTS[3].caption, "empty goes back to the draft");
  s = mqReduce(s, { t: "publish" });
  assert.deepEqual(s.published, ["p3"]);
  assert.equal(mqWaiting(s).length, 6);
  assert.equal(mqReduce(s, { t: "unapprove", id: "p3" }), s, "a published post stays published");
  assert.equal(mqReduce(s, { t: "caption", id: "p3", text: "x" }), s, "a published caption is not edited");
  s = mqReduce(s, { t: "send", id: "r1" });
  assert.deepEqual(s.sent, ["r1"]);
  assert.equal(mqReduce(s, { t: "send", id: "nope" }), s);
  assert.deepEqual(MQ_START, { approved: [], captions: {}, published: [], sent: [] }, "the start state is never changed");
});
