import { test } from "node:test";
import assert from "node:assert/strict";
import { MOVE_MENU, moveMenuHref } from "../lib/moveMenu.ts";

test("ONE MOVE menu matches the Classic sidebar, no admin items", () => {
  assert.equal(MOVE_MENU.length, 23);
  assert.equal(MOVE_MENU[0].label, "Dashboard");
  assert.equal(MOVE_MENU.at(-1)!.label, "What's New");
  assert.ok(MOVE_MENU.every((m) => m.path.startsWith("/") && !m.path.startsWith("/admin") && m.path !== "/users"));
  assert.equal(new Set(MOVE_MENU.map((m) => m.path)).size, MOVE_MENU.length);
});

test("menu links open on move.vip50one.com", () => {
  assert.equal(moveMenuHref("/contacts/vip"), "https://move.vip50one.com/contacts/vip");
});
