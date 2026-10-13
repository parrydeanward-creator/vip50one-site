import { test } from "node:test";
import assert from "node:assert/strict";
import { networkLine, readNetwork } from "../lib/referrals.ts";

test("network counts: only counts, wrong shape refused", () => {
  assert.equal(readNetwork(null), null);
  assert.equal(readNetwork({ sent: [] }), null);
  const n = readNetwork({
    sent: [{ status: "closed", accepted_at: "2026-10-01" }, { status: "working", accepted_at: "2026-10-05" }, { status: "declined" }],
    received: [{ status: "sent" }, { status: "closed", accepted_at: "2026-09-01" }, { status: "expired" }],
  })!;
  assert.deepEqual(n, { sent: 3, sentAccepted: 2, sentClosed: 1, received: 3, receivedOpen: 1, receivedClosed: 1 });
  assert.equal(networkLine(n), "Sent 3 (2 accepted, 1 closed) · received 3 (1 closed)");
});
