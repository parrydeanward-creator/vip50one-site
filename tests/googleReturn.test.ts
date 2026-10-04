import { test } from "node:test";
import assert from "node:assert/strict";
import { googleReturn, withoutGoogle } from "../lib/googleReturn.ts";

test("back from Google: plain words for connected and failed, nothing otherwise", () => {
  assert.equal(googleReturn("?google=connected")!.ok, true);
  assert.match(googleReturn("?google=connected")!.what, /Add photos from Google/);
  assert.equal(googleReturn("?google=error")!.ok, false);
  assert.equal(googleReturn("?google=denied")!.ok, false);
  assert.equal(googleReturn("?google=<script>"), null);
  assert.equal(googleReturn(""), null);
});

test("the note is removed from the address, everything else kept", () => {
  assert.equal(withoutGoogle("https://www.vip50one.com/dashboard?google=connected"), "/dashboard");
  assert.equal(withoutGoogle("https://www.vip50one.com/dashboard?pkg=complete&google=error#x"), "/dashboard?pkg=complete#x");
});
