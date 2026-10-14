import { test } from "node:test";
import assert from "node:assert/strict";
import { postDay, readTeamPosts } from "../lib/teamPosts.ts";

const H = "luxury-agency.vip50homes.com";

test("team posts: same-site https links only, newest first, at most 5", () => {
  assert.deepEqual(readTeamPosts(null, H), []);
  assert.deepEqual(readTeamPosts({ posts: [] }, "not a host"), []);
  const posts = readTeamPosts({ posts: [
    { title: "Old", url: `https://${H}/blog/old`, published_at: "2026-10-10T15:00:00Z", by_pulse: false },
    { title: "New", url: `https://${H}/blog/new`, published_at: "2026-10-14T15:23:00Z", by_pulse: true },
    { title: "Elsewhere", url: "https://evil.example/blog", published_at: "2026-10-14T16:00:00Z" },
    { title: "Plain http", url: `http://${H}/blog/x`, published_at: "2026-10-14T16:00:00Z" },
    { title: "", url: `https://${H}/blog/blank` },
  ] }, H);
  assert.deepEqual(posts.map((p) => p.title), ["New", "Old"]);
  assert.equal(posts[0].byPulse, true);
  const many = readTeamPosts({ posts: Array.from({ length: 9 }, (_, i) => ({ title: `P${i}`, url: `https://${H}/blog/${i}`, published_at: `2026-10-0${i + 1}` })) }, H);
  assert.equal(many.length, 5);
  assert.equal(many[0].title, "P8");
});

test("post day in Denver time", () => {
  assert.equal(postDay(null), "");
  assert.equal(postDay("nope"), "");
  assert.match(postDay("2026-10-14T15:23:00Z"), /Wed, Oct 14|Wed 14 Oct|Wed, 14 Oct/);
});
