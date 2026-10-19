"use client";

import { useLayoutEffect } from "react";
import { exampleMoveAnswer, makeExampleStore, type ExampleStore } from "@/lib/examples/move2.ts";
import { todayIn } from "@/lib/hwc.ts";
import "@/app/showly-open-views.css";
import "@/app/move2-views.css";

// The example agent's ONE MOVE (walker 18 Oct; Parry: "the side information is blank"): while a native ONE MOVE view
// (Contacts, VIP Management, Touch Audit, Hot/Warm/Cold, Business Rolodex) is open for the example agent, its calls to
// ONE MOVE are answered in the browser from the invented store in lib/examples/move2.ts, so the view draws filled and its
// actions work on screen. Any other call goes out as usual. Never mounted for a signed-in agent. Rendered before the
// view: a layout effect runs before the view's own effects, so its first call is already answered here.

let store: ExampleStore | null = null;
let depth = 0;
let original: typeof fetch | null = null;
// A screen may bring its own example store (the Weekly Review's); then the calls are answered from it, not the shared one.
let given: ExampleStore | null = null;

function exampleFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
  let body: unknown = null;
  try {
    body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
  } catch {}
  store ??= makeExampleStore(todayIn());
  const a = exampleMoveAnswer(given ?? store, method, url, body);
  if (!a) return (original ?? fetch)(input, init);
  // a beat, as a real answer would take, so a tick or a save is seen to happen
  return new Promise((res) => setTimeout(() => res(new Response(JSON.stringify(a.body), { status: a.status, headers: { "Content-Type": "application/json" } })), 120));
}

export default function MoveExampleFetch({ store: own }: { store?: ExampleStore | null } = {}) {
  useLayoutEffect(() => {
    if (own) given = own;
    if (depth++ === 0) {
      original = window.fetch;
      window.fetch = exampleFetch as typeof fetch;
    }
    return () => {
      if (own && given === own) given = null;
      if (--depth === 0 && original) {
        if (window.fetch === (exampleFetch as typeof fetch)) window.fetch = original;
        original = null;
      }
    };
  }, [own]);
  return (
    <p className="m2-exbar" role="note">
      <span className="pso-ex">Example</span>
      <span className="m2-exbar-t"> Invented people. Changes stay on this screen; nothing is saved or sent.</span>
    </p>
  );
}
