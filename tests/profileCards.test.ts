import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planName, readMembership, standing } from "../lib/membership.ts";
import { readChange, readNotify } from "../lib/notifyPrefs.ts";
import { connectCalendarUrl, connectContactsUrl, readGoogle } from "../lib/googleLink.ts";
import { readProfile, winsChange } from "../lib/profile.ts";

test("membership names the plan with Growth and never a price", () => {
  const m = readMembership({ plan: "complete", growth: true, status: "active", access: "comp", stripe: false })!;
  assert.equal(planName(m), "ONE Complete + ONE Growth");
  assert.equal(standing(m).text, "Comped: nothing to pay.");
  assert.equal(planName(readMembership({ plan: null, growth: false, status: null, access: "free", stripe: false })!), "No plan yet");
  assert.equal(standing(readMembership({ plan: "relationship", growth: false, status: "past_due", access: "paid", stripe: true })!).warn, true);
  assert.equal(readMembership({}), null);
  for (const s of ["active", "trialing", "past_due", "expired", null]) {
    const x = standing(readMembership({ plan: "relationship", growth: false, status: s, access: "paid", stripe: true })!);
    assert.doesNotMatch(x.text, /\$/);
  }
});

test("notifications read both switches and accept one change at a time", () => {
  assert.deepEqual(readNotify({ dm: true, community: false }), { dm: true, community: false });
  assert.equal(readNotify({ dm: true }), null);
  assert.deepEqual(readChange({ key: "dm", on: false }), { key: "dm", on: false });
  assert.equal(readChange({ key: "user_id", on: true }), null);
  assert.equal(readChange({ key: "dm", on: "yes" }), null);
});

test("Google status hides the card until ONE MOVE answers; Connect comes back to the Brain", () => {
  assert.equal(readGoogle({ error: "Please sign in." }), null);
  const g = readGoogle({ available: true, connected: true, calendar_available: true, calendar_on: false, last_photos_at: "2026-10-14T20:00:00Z" })!;
  assert.equal(g.connected, true);
  assert.equal(g.calendarOn, false);
  assert.match(connectContactsUrl, /^https:\/\/move\.vip50one\.com\/api\/google\/connect\?from=brain$/);
  assert.match(connectCalendarUrl, /want=calendar&from=brain$/);
});

test("VIP-50 Wins shows only once ONE MOVE sends it, and saves only a change", () => {
  const base = { email: "a@b.co", full_name: "A B" };
  assert.equal(readProfile(base)!.vip_50_wins, null);
  const p = readProfile({ ...base, vip_50_wins: null })!;
  assert.equal(p.vip_50_wins, "");
  assert.equal(winsChange(p, { ...p, vip_50_wins: "  " }), undefined);
  assert.equal(winsChange(p, { ...p, vip_50_wins: "First closing" }), "First closing");
  const q = readProfile({ ...base, vip_50_wins: "Old" })!;
  assert.equal(winsChange(q, { ...q, vip_50_wins: "" }), null);
});

test("My Profile lays its cards out in two columns, with every Classic card (Parry, 14 Oct, hard rule)", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.pf-cards \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  const src = readFileSync(new URL("../components/brain/MyProfile.tsx", import.meta.url), "utf8");
  for (const c of ["RezenSection", "MembershipSection", "LeadMailSection", "GoogleSections", "OwnAISection", "NotificationsSection", "Contact sharing", "VIP-50 Wins", "Lounge", "PulseModesSection"]) {
    assert.ok(src.includes(c), `${c} is on the Brain's My Profile`);
  }
  assert.ok(!src.includes("pf-side"), "no single side column");
});
