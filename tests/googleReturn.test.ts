import { test } from "node:test";
import assert from "node:assert/strict";
import { returnNote, withoutNotes } from "../lib/googleReturn.ts";

// vip50-web-crm#49: the notes ONE MOVE sends back to the Brain.
test("back from Google: connected, failed and cancelled in plain words", () => {
  assert.equal(returnNote("?google=connected")!.ok, true);
  assert.match(returnNote("?google=connected")!.what, /Add photos from Google/);
  assert.equal(returnNote("?google=failed")!.ok, false);
  assert.match(returnNote("?google=cancelled")!.what, /cancelled/);
  assert.equal(returnNote("?google=<script>"), null);
  assert.equal(returnNote(""), null);
});

test("back from Lofty and billing", () => {
  assert.equal(returnNote("?lofty=connected")!.kicker, "ONE MOVE · Lofty");
  assert.equal(returnNote("?lofty=error")!.ok, false);
  assert.equal(returnNote("?billing=done")!.ok, true);
  assert.equal(returnNote("?billing=anything"), null);
});

test("the notes are removed from the address, everything else kept", () => {
  assert.equal(withoutNotes("https://www.vip50one.com/dashboard?google=connected"), "/dashboard");
  assert.equal(withoutNotes("https://www.vip50one.com/dashboard?pkg=complete&lofty=error&billing=done#x"), "/dashboard?pkg=complete#x");
});
