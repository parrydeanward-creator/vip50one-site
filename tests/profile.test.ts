import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELDS, changes, fitSize, greetingName, photoProblem, problem, readProfile } from "../lib/profile.ts";

const raw = { email: "a@b.com", full_name: "Parry Dean Ward", preferred_name: "", mobile: "8015551234", brokerage: "Luxury Realty", license_no: "", license_state: "ut", time_zone: "", title: "", bio: "", photo_url: "http://insecure/x.jpg", photo_version: "abc" };

test("readProfile: defaults, https photos only, refuses no email", () => {
  const p = readProfile(raw)!;
  assert.equal(p.time_zone, "America/Denver");
  assert.equal(p.photo_url, null);
  assert.equal(readProfile({ bio: "x" }), null);
  assert.equal(readProfile({ email: null, full_name: "Parry Ward", bio: null })!.bio, "");
});

test("changes sends only what changed, licence state upper-cased", () => {
  const p = readProfile(raw)!;
  assert.deepEqual(changes(p, { ...p }), {});
  assert.deepEqual(changes(p, { ...p, brokerage: " Luxury Realty Agency ", license_state: "id" }), { brokerage: "Luxury Realty Agency", license_state: "ID" });
});

test("form and photo problems in plain words; greeting name", () => {
  const p = readProfile(raw)!;
  assert.equal(problem({ ...p, full_name: " " }), "Your full name can't be empty.");
  assert.equal(problem({ ...p, license_state: "Utah" }), "Licence state is two letters, like UT.");
  assert.equal(problem({ ...p, mobile: "555-12" }), "That mobile number looks too short.");
  assert.equal(problem(p), null);
  assert.equal(photoProblem({ type: "image/gif", size: 10 }), "Choose a JPEG, PNG, WebP or HEIC photo.");
  assert.equal(photoProblem({ type: "image/jpeg", size: 9e6 }), null);
  assert.equal(photoProblem({ type: "image/jpeg", size: 3e7 }), "That photo is over 25 MB. Choose a smaller one.");
  assert.deepEqual(fitSize(4000, 3000), { w: 1200, h: 900 });
  assert.deepEqual(fitSize(800, 600), { w: 800, h: 600 });
  assert.equal(photoProblem({ type: "image/png", size: 1e6 }), null);
  assert.equal(greetingName(p), "Parry");
  assert.equal(greetingName({ ...p, preferred_name: "PD" }), "PD");
});

test("a long bio and title are kept in full, up to ONE MOVE's limits (bio 1000, title 120)", () => {
  const bio = "B".repeat(971);
  const title = "T".repeat(110);
  const p = readProfile({ ...raw, bio, title })!;
  assert.equal(p.bio.length, 971);
  assert.equal(p.title.length, 110);
  assert.equal(readProfile({ ...raw, bio: "B".repeat(1200) })!.bio.length, 1000);
  assert.equal(FIELDS.find((f) => f.key === "bio")!.max, 1000);
  assert.equal(FIELDS.find((f) => f.key === "title")!.max, 120);
});

test("§3j.4: privacy and the agent's own answers, hidden until ONE MOVE sends them", async () => {
  const { ABOUT, aboutChanges } = await import("../lib/profile.ts");
  const before = readProfile({ email: "a@b.co", full_name: "Parry Ward" })!;
  assert.equal(before.share_contact_info, null, "no switch until the route sends it");
  assert.equal(before.about, null);
  const p = readProfile({ email: "a@b.co", full_name: "Parry Ward", share_contact_info: false, about: { favorite_treat: "Peanut M&Ms", hometown_city: null, junk: "x" } })!;
  assert.equal(p.share_contact_info, false);
  assert.equal(p.about!.favorite_treat, "Peanut M&Ms");
  assert.equal(p.about!.hometown_city, "");
  assert.ok(!("junk" in p.about!), "only the 13 columns");
  assert.equal(ABOUT.length, 13);
  assert.deepEqual(ABOUT.map(([l]) => l).slice(0, 4), ["Hobbies / Interests", "Favorite Restaurant", "Favorite Store", "Morning Drink"]);
  const draft = { ...p.about!, favorite_treat: "", dream_vacation: " Bora Bora " };
  assert.deepEqual(aboutChanges(p.about, draft), { favorite_treat: null, dream_vacation: "Bora Bora" });
  assert.equal(aboutChanges(p.about, p.about), null);
});
