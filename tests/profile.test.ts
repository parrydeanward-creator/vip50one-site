import { test } from "node:test";
import assert from "node:assert/strict";
import { changes, fitSize, greetingName, photoProblem, problem, readProfile } from "../lib/profile.ts";

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
