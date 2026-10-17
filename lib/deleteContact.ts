import type { GraphNode } from "./graph/types.ts";
import { MOVE_URL } from "./host.ts";

// Delete a contact from the Brain (Parry, 16 Oct 18:39 MT: "in contacts i need a way to delete a contact"; walker
// 2026-10-17-0042). ONE MOVE's routes (vip50-web-crm#286): `DELETE /api/brain/people/[id]` for one and
// `POST /api/brain/people/delete {ids}` for many (up to 500), the agent's own contacts only, answering
// `{ok, deleted}`. There is no restore route on purpose, so the Brain holds the delete in the browser for 6 seconds
// with "Deleted Rosa. Undo"; Undo cancels it and nothing was sent. When the time is up the route is called; if it does
// not take it, the person comes back on screen and the agent is told. "Remove from VIP-50" (a tier change) is not
// this. The example agent's delete works on screen and saves nothing. Pure, apart from holdDelete's timer.

export const UNDO_MS = 6000;
export const MAX_DELETE = 500;
export const deleteOneUrl = (id: string) => `${MOVE_URL}/api/brain/people/${encodeURIComponent(id)}`;
export const deleteManyUrl = `${MOVE_URL}/api/brain/people/delete`;

/** The first name for the words ("Rosa"), from "Rosa Diaz"; "this contact" when there is none. */
export function firstOf(name: string | null | undefined): string {
  const w = String(name ?? "").trim().split(/\s+/)[0] ?? "";
  return w.replace(/[^\p{L}\p{N}'.-]/gu, "") || "this contact";
}

/** The confirm names the person (walker: "Delete Rosa? Their notes, tasks and history go too."). */
export function confirmWords(first: string, n = 1): string {
  return n === 1 ? `Delete ${first}? Their notes, tasks and history go too.` : `Delete ${n} contacts? Their notes, tasks and history go too.`;
}

/** The toast while the delete is held: "Deleted Rosa." (the Undo button sits beside it). */
export function heldWords(first: string, n = 1): string {
  return n === 1 ? `Deleted ${first}.` : `Deleted ${n} contacts.`;
}

/** When ONE MOVE did not take it: the person is back and the agent is told plainly. */
export function failWords(first: string, n = 1): string {
  return n === 1 ? `${first} was not deleted: ONE MOVE did not take it. They are back in your contacts.` : `Those ${n} contacts were not deleted: ONE MOVE did not take it. They are back in your contacts.`;
}

/** The one request: DELETE for one id, POST {ids} for several. Null when there is nothing to delete. */
export function deleteRequest(ids: string[]): { url: string; init: RequestInit } | null {
  const list = [...new Set(ids.filter((x) => typeof x === "string" && x.trim()))].slice(0, MAX_DELETE);
  if (!list.length) return null;
  if (list.length === 1) return { url: deleteOneUrl(list[0]), init: { method: "DELETE", credentials: "include" } };
  return { url: deleteManyUrl, init: { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: list }) } };
}

/** ONE MOVE's answer: deleted (a 404 for one id means it is already gone, so it counts as done), or not. */
export function readDeleted(status: number, body: unknown): { ok: true; deleted: number } | { ok: false } {
  const b = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  if (status >= 200 && status < 300 && b.ok === true) return { ok: true, deleted: typeof b.deleted === "number" && Number.isFinite(b.deleted) ? Math.max(0, Math.round(b.deleted)) : 0 };
  if (status === 404) return { ok: true, deleted: 0 };
  return { ok: false };
}

/** Take people off the graph at once (optimistic): every node that matches, and everything under it. */
export function dropPeople<G extends { nodes: GraphNode[] }>(g: G, match: (n: GraphNode) => boolean): { graph: G; removed: GraphNode[] } {
  const gone = new Set(g.nodes.filter(match).map((n) => n.id));
  if (!gone.size) return { graph: g, removed: [] };
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of g.nodes) if (n.parentId && gone.has(n.parentId) && !gone.has(n.id)) (gone.add(n.id), (grew = true));
  }
  return { graph: { ...g, nodes: g.nodes.filter((n) => !gone.has(n.id)) }, removed: g.nodes.filter((n) => gone.has(n.id)) };
}

/** Put people back (Undo, or ONE MOVE did not take it): the removed nodes not already there, under a parent that is. */
export function putBack<G extends { nodes: GraphNode[] }>(g: G, removed: GraphNode[]): G {
  const have = new Set(g.nodes.map((n) => n.id));
  const back = removed.filter((n) => !have.has(n.id));
  if (!back.length) return g;
  const ids = new Set([...have, ...back.map((n) => n.id)]);
  const fits = back.filter((n) => !n.parentId || ids.has(n.parentId));
  return fits.length ? { ...g, nodes: [...g.nodes, ...fits] } : g;
}

/**
 * Hold a delete for `ms`, then run it. `undo()` cancels it (true when it was still held); `flush()` runs it now (the
 * page is closing, or a second delete starts). It runs at most once.
 */
export function holdDelete(opts: {
  run: () => void;
  ms?: number;
  setTimer?: (f: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
}): { undo: () => boolean; flush: () => boolean; held: () => boolean } {
  const set = opts.setTimer ?? ((f: () => void, ms: number) => setTimeout(f, ms));
  const clear = opts.clearTimer ?? ((t: unknown) => clearTimeout(t as ReturnType<typeof setTimeout>));
  let state: "held" | "ran" | "undone" = "held";
  const fire = () => {
    if (state !== "held") return false;
    state = "ran";
    opts.run();
    return true;
  };
  const t = set(fire, opts.ms ?? UNDO_MS);
  return {
    undo: () => {
      if (state !== "held") return false;
      state = "undone";
      clear(t);
      return true;
    },
    flush: () => {
      if (state !== "held") return false;
      clear(t);
      return fire();
    },
    held: () => state === "held",
  };
}
