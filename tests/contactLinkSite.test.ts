import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// A contact opened by address (/dashboard/contacts/<uuid>, ?contact=<uuid>) renders ContactLinkView -> ContactPanel.
// It shows the same "On your site" / "Their account" block as My Contacts' full contact (VIP-SUMMARY §3ar), not a copy.
const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");

test("the by-address contact view renders ContactPanel", () => {
  assert.match(read("../components/brain/ContactLinkView.tsx"), /<ContactPanel\b/);
});

test("ContactPanel includes the shared OnYourSite block for its contact", () => {
  const src = read("../components/brain/ContactPanel.tsx");
  assert.match(src, /import \{ OnYourSite \} from "\.\/SiteActivity\.tsx"/);
  assert.match(src, /<OnYourSite[\s\S]*?contactId=\{contactId\}/);
});

test("the block is the one shared component: it renders nothing unless the route answers 200", () => {
  const src = read("../components/brain/SiteActivity.tsx");
  assert.match(src, /r\.status === 200/);
  assert.match(src, /if \(!site\) return null/);
  assert.doesNotMatch(read("../components/brain/ContactPanel.tsx"), /personSiteUrl|readPersonSite/);
});

test("inside the narrow contact drawer the block stacks in one column at every width", () => {
  assert.match(read("../app/site-activity.css"), /\.cc \.sa-contact \{ grid-template-columns: minmax\(0, 1fr\); \}/);
});

test("Google Calendar card tells agents what Google's unverified screen will say (vip50-web-crm#400)", () => {
  const src = readFileSync(new URL("../components/brain/ProfileCards.tsx", import.meta.url), "utf8");
  assert.match(src, /data-note="gcal-unverified"[^\n]*tap Advanced, then Continue/);
});
