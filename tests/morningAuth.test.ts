import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanEmail, serverCallOk } from "../lib/morningAuth.ts";

test("serverCallOk: closed without a secret; exact match only", () => {
  assert.equal(serverCallOk("abc", undefined), false);
  assert.equal(serverCallOk("abc", ""), false);
  assert.equal(serverCallOk(null, "abc"), false);
  assert.equal(serverCallOk("abd", "abc"), false);
  assert.equal(serverCallOk("ab", "abc"), false);
  assert.equal(serverCallOk("abc", "abc\n"), true);
});

test("cleanEmail", () => {
  assert.equal(cleanEmail(" Parry@Example.com "), "parry@example.com");
  assert.equal(cleanEmail("not an email"), null);
  assert.equal(cleanEmail(null), null);
});
