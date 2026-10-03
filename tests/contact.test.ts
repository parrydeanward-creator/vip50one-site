import { test } from "node:test";
import assert from "node:assert/strict";
import { contactUrl, dialable, mailable, touchUrl } from "../lib/contact.ts";
import { liveGraph, type SummaryEnvelope, type SummaryItem } from "../lib/live.ts";

// VIP-SUMMARY §3c (v1.4): act on a person from the Brain.
const ID = "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const follow: SummaryItem = { id: "go:task:ff01", kind: "follow_up", title: "Call Brian Irby", urgency: "alert", due: "2026-10-01", why: ["Due Oct 1."], link: "https://move.vip50one.com/contacts?id=x", contact_id: ID };

test("a person item carries its ONE MOVE contact id; a bad id is dropped", () => {
  const env: SummaryEnvelope = { v: 1, product: "go", found: true, stats: [], items: [follow, { ...follow, id: "go:task:ff02", title: "Call X", contact_id: "1; drop" }] };
  const g = liveGraph(env, { pkg: "relationship", firstName: "P", reachable: true, today: "2026-10-03" }, {});
  assert.equal(g.nodes.find((n) => n.id === "live:go:task:ff01")!.contactId, ID);
  assert.equal(g.nodes.find((n) => n.id === "live:go:task:ff02")!.contactId, undefined);
});

test("routes are ONE MOVE's, and only plain numbers and emails reach tel:, sms: and mailto:", () => {
  assert.equal(contactUrl(ID), `https://move.vip50one.com/api/brain/contact?id=${ID}`);
  assert.equal(touchUrl, "https://move.vip50one.com/api/brain/touch");
  assert.equal(dialable("(801) 555-0123"), "8015550123");
  assert.equal(dialable("+1 801 555 0123"), "+18015550123");
  assert.equal(dialable("javascript:alert(1)"), null);
  assert.equal(mailable(" brian@example.com "), "brian@example.com");
  assert.equal(mailable("x?subject=<script>"), null);
});
