import { test } from "node:test";
import assert from "node:assert/strict";
import { within } from "../lib/within.ts";

const after = <T,>(ms: number, v: T) => new Promise<T>((r) => setTimeout(() => r(v), ms));

test("answer in time wins", async () => {
  assert.equal(await within(after(5, "ai"), 200, () => "rules"), "ai");
});

test("slow answer falls back", async () => {
  assert.equal(await within(after(300, "ai"), 20, () => "rules"), "rules");
});

test("a failure falls back", async () => {
  assert.equal(await within(Promise.reject(new Error("x")), 200, () => "rules"), "rules");
});
