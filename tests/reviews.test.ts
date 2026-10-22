import { test } from "node:test";
import assert from "node:assert/strict";
import { addBody, checkAdd, countWords, dateWords, deleteBody, demoReviews, emptyForm, filterReviews, readDeleteAnswer, readReview, readReviewAnswer, readReviews, reviewsUrl, siteBody, sourceWords, starsWords, withReviews } from "../lib/reviews.ts";

const good = { id: "r1", reviewer: " Ann ", text: "Great", rating: 5, source: "zillow", site_ok: true, created_at: "2026-10-01T00:00:00Z" };

test("url is the MOVE route", () => assert.equal(reviewsUrl, "https://move.vip50one.com/api/brain/reviews"));

test("readReview: strict", () => {
  assert.equal(readReview(good)?.reviewer, "Ann");
  assert.equal(readReview({ ...good, rating: 6 }), null);
  assert.equal(readReview({ ...good, rating: 2.5 }), null);
  assert.equal(readReview({ ...good, text: " " }), null);
  assert.equal(readReview({ ...good, id: "" }), null);
  assert.equal(readReview(null), null);
  assert.equal(readReview({ ...good, source: "yelp" })?.source, "other");
  assert.equal(readReview({ ...good, site_ok: "yes" })?.site_ok, false);
});

test("readReviews: hidden unless 200 and ok; counts recomputed; bad rows dropped", () => {
  assert.equal(readReviews(404, { ok: true, reviews: [] }), null);
  assert.equal(readReviews(200, { ok: false }), null);
  assert.equal(readReviews(200, { ok: true }), null);
  const l = readReviews(200, { ok: true, count: 99, shown_on_site: 99, reviews: [good, { ...good, id: "r2", site_ok: false }, { bad: 1 }] });
  assert.deepEqual([l?.count, l?.shown_on_site], [2, 1]);
});

test("answers", () => {
  assert.equal(readReviewAnswer(200, { ok: true, review: good }).ok, true);
  assert.deepEqual(readReviewAnswer(403, { ok: false, error: "Not yours" }), { ok: false, error: "Not yours" });
  assert.equal(readReviewAnswer(200, { ok: true, review: {} }).ok, false);
  assert.equal(readDeleteAnswer(200, { ok: true }).ok, true);
  assert.equal(readDeleteAnswer(404, { ok: false, error: "Gone" }).ok, false);
});

test("form check and bodies", () => {
  assert.equal(checkAdd(emptyForm()), "Add the reviewer's name.");
  assert.equal(checkAdd({ ...emptyForm(), reviewer: "A" }), "Add what they said.");
  assert.equal(checkAdd({ ...emptyForm(), reviewer: "A", text: "x", rating: 0 }), "Choose 1 to 5 stars.");
  assert.equal(checkAdd({ ...emptyForm(), reviewer: "A", text: "x" }), null);
  assert.deepEqual(addBody({ reviewer: " A ", text: " x ", rating: 4, source: "google" }), { action: "add", reviewer: "A", text: "x", rating: 4, source: "google" });
  assert.deepEqual(siteBody("i", true), { action: "site_ok", id: "i", on: true });
  assert.deepEqual(deleteBody("i"), { action: "delete", id: "i" });
});

test("counts, filter, words", () => {
  const l = demoReviews();
  assert.deepEqual(countWords(l), { all: "3 reviews", site: "2 on your website" });
  assert.equal(countWords(withReviews([l.reviews[0]])).all, "1 review");
  assert.equal(filterReviews(l.reviews, "site").length, 2);
  assert.equal(filterReviews(l.reviews, "all").length, 3);
  assert.equal(starsWords(4), "★★★★☆");
  assert.equal(sourceWords("ratemyagent"), "RateMyAgent");
  assert.equal(dateWords("2026-10-12T16:00:00Z"), "Oct 12, 2026");
  assert.equal(dateWords("nope"), "");
});
