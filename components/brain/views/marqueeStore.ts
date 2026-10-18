"use client";

import { useSyncExternalStore } from "react";
import { MQ_START, mqReduce, type MqAction, type MqState } from "@/lib/examples/marquee.ts";

// The Marquee example's state, shared by the side panel and the full view so an Approve in one shows in the other.
// On screen only: it lives in this page and is gone on reload. Nothing is posted, published or sent.

let state: MqState = MQ_START;
const subs = new Set<() => void>();

export function mqDispatch(a: MqAction) {
  const next = mqReduce(state, a);
  if (next === state) return;
  state = next;
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

export function useMarquee(): MqState {
  return useSyncExternalStore(subscribe, () => state, () => MQ_START);
}
