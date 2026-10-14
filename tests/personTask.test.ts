import { test } from "node:test";
import assert from "node:assert/strict";
import { namesPerson } from "../lib/personTask.ts";

test("Who is this? only for tasks that name a person", () => {
  for (const t of ["Call Jen Alvarez", "Text Mike", "Follow up with Sarah Park", "Lunch with Marcus Lee", "Send note to Amy"]) assert.equal(namesPerson(t), true, t);
  for (const t of ["Agent Attraction 1", "Agent Attraction 2", "Set Up Open House", "Newsletter", "Approve 5 posts", ""]) assert.equal(namesPerson(t), false, t);
});
