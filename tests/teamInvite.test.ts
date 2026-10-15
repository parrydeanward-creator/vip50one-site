import { test } from "node:test";
import assert from "node:assert/strict";
import { readInvite } from "../lib/teamInvite.ts";

test("invite link: none, one, refused or junk", () => {
  assert.equal(readInvite(true, { ok: true, link: null }), null);
  const l = readInvite(true, { ok: true, link: { url: "https://move.vip50one.com/join/team/abc_123", expires_at: "2026-10-22T00:00:00Z", uses: 1, max_uses: 25, line: "Ends Wed, Oct 21. Used 1 of 25." } })!;
  assert.equal(l.uses, 1);
  assert.equal(l.line, "Ends Wed, Oct 21. Used 1 of 25.");
  assert.equal(readInvite(false, { error: "For the team lead and admins." }), undefined, "403 hides the card");
  assert.equal(readInvite(true, { ok: true, link: { url: "https://evil.example/join/team/x" } }), undefined, "only ONE MOVE's join page");
});
