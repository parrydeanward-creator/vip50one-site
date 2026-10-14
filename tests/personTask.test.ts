import { test } from "node:test";
import assert from "node:assert/strict";
import { namesPerson } from "../lib/personTask.ts";

test("Who is this? only for tasks that name a person", () => {
  for (const t of ["Call Jen Alvarez", "Text Mike", "Follow up with Sarah Park", "Lunch with Marcus Lee", "Send note to Amy"]) assert.equal(namesPerson(t), true, t);
  for (const t of ["Agent Attraction 1", "Agent Attraction 2", "Set Up Open House", "Newsletter", "Approve 5 posts", ""]) assert.equal(namesPerson(t), false, t);
});

test("Agent Attraction: never 'Who is this?'; the marker never shows", async () => {
  const { stripMarkers } = await import("../lib/personTask.ts");
  assert.equal(namesPerson("Invite an agent to Friday's Agent Attraction (1 of 2)"), false);
  assert.equal(stripMarkers("[agent_attraction|week=2026-10-12|n=1] Text or call an agent you would like on the team."), "Text or call an agent you would like on the team.");
});
