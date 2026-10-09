import { test } from "node:test";
import assert from "node:assert/strict";
import { readConnector, readLeadMail, readLog } from "../lib/connector.ts";

test("connector state: checked; the server address must be ONE MOVE's; nothing connected shows while off", () => {
  const s = readConnector({ allowed: true, on: true, server_url: "https://move.vip50one.com/mcp", connected: [{ client_id: "c1", client_name: "Claude", connected_at: "2026-10-09T20:00:00Z", last_used_at: null }, { client_id: "x" }] })!;
  assert.deepEqual([s.on, s.serverUrl, s.connected.length], [true, "https://move.vip50one.com/mcp", 1]);
  assert.equal(readConnector({ allowed: true, on: true, server_url: "https://evil.example/mcp" })!.serverUrl, "https://move.vip50one.com/mcp");
  assert.equal(readConnector({ allowed: true, on: false, connected: [{ client_id: "c1", client_name: "Claude", connected_at: "x" }] })!.connected.length, 0);
  assert.equal(readConnector({ on: true }), null);
});

test("log: newest first, lines only", () => {
  const l = readLog({ log: [{ line: "Claude looked at your day (3 records)", at: "2026-10-09T20:00:00Z" }, { line: "Claude looked at a contact (1 record)", at: "2026-10-09T21:00:00Z" }, { at: "x" }] });
  assert.deepEqual(l.map((x) => x.line), ["Claude looked at a contact (1 record)", "Claude looked at your day (3 records)"]);
  assert.deepEqual(readLog(null), []);
});

test("lead mail: only a leads.vip50one.com address; statuses in plain words", () => {
  const m = readLeadMail({ address: "leads+3echmlz6@leads.vip50one.com", recent: [{ received_at: "2026-10-09T23:00:00Z", summary: "Zillow: Sam Lee", status: "lead" }] })!;
  assert.equal(m.recent[0].status, "Added");
  assert.equal(readLeadMail({ address: "someone@else.com" }), null);
  assert.equal(readLeadMail({ address: null }), null);
});
