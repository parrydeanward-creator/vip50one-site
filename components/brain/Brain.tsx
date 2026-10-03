"use client";

import { CLASSIC_DASHBOARD_URL } from "@/lib/host.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BusinessGraph, GraphNode } from "@/lib/graph/types.ts";
import { DESKTOP_BUDGET, PHONE_BUDGET, childrenOf, indexGraph, pathTo, visibleSet } from "@/lib/graph/model.ts";
import { bounds, layout } from "@/lib/brain/layout.ts";
import { fit, pan, zoomAt } from "@/lib/brain/camera.ts";
import * as nav from "@/lib/brain/nav.ts";
import { PRODUCT_COLOR, STATUS, hex } from "@/lib/brain/theme.ts";
import { UPGRADE_URL } from "@/lib/products.ts";
import type { BrainScene } from "./scene.ts";
import Icon from "./Icon.tsx";
import { iconFor, iconForText } from "@/lib/brain/icons.ts";
import { SUGGESTED, answerSet, factsFor, type AskAnswer } from "@/lib/ask.ts";
import { changesSince, firstVisitToday, morningTop, orbsToPing, sinceLabel } from "@/lib/morning.ts";
import type { ChangeNote } from "@/lib/graph/types.ts";
import { DEMO_SIGNALS, applySignal, lightFrom, usable, type Signal } from "@/lib/signals.ts";
import { RANGE, dayLabel, inWindow, offsetLabel, windowTitle } from "@/lib/timeline.ts";
import { clock, completedBy, duration, isEvening, planDay, recap } from "@/lib/day.ts";
import { localDay } from "@/lib/morning.ts";
import { MOVE_BOTTOM, MOVE_GROUPS, MOVE_TOP, moveGroupId, moveMenuHref, type MovePage } from "@/lib/moveMenu.ts";

// The ONE Brain shell: navigation controller, gestures, the accessible layer
// of real buttons over the drawn nodes, and the detail drawer. Business data
// comes in as a graph; nothing here knows about any product's internals.

const PHONE_QUERY = "(max-width: 719px)";
const CARD_ROOM = 420; // desktop width kept free for the floating card
const RAIL_ROOM = 250; // and for the rail of floating buttons on the left

export interface BrainAgent {
  firstName: string;
  initials: string;
  label: string; // spoken name for the account button
  photo?: string; // the agent's own photo (MASTER user_profiles.avatar_url)
}

// The made-up agent the demo, films and screenshots use.
const DEMO_AGENT: BrainAgent = { firstName: "Sarah", initials: "SB", label: "Sarah Bennett, ONE Complete, founding member" };

export default function Brain({ graph: initialGraph, pkg = "complete", agent = DEMO_AGENT, live = false }: { graph: BusinessGraph; pkg?: string; agent?: BrainAgent; live?: boolean }) {
  const hello = `${greeting()}, ${agent.firstName}.`;
  // The graph changes while the page is open (live signals tick its numbers).
  const [graph, setGraph] = useState(initialGraph);
  // ONE's morning note, written by the AI when it is available (rules otherwise).
  const [note, setNote] = useState<{ note: string; source: "ai" | "rules" } | null>(null);
  useEffect(() => {
    let current = true;
    fetch(`/api/note?package=${encodeURIComponent(pkg)}${live ? "" : "&demo=1"}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((n) => current && n && setNote(n))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [pkg, live]);
  const ix = useMemo(() => indexGraph(graph), [graph]);
  const [state, setState] = useState(() => nav.start(graph.rootId));
  const [phone, setPhone] = useState(false);
  const [ready, setReady] = useState(false);
  const [highlight, setHighlight] = useState<string[] | null>(null);
  const [openWhy, setOpenWhy] = useState<number | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const btnRefs = useRef(new Map<string, HTMLButtonElement>());
  const drawerRef = useRef<HTMLElement>(null);
  const leaderRef = useRef<SVGLineElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const whyRef = useRef<HTMLDivElement>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  const peekIdRef = useRef<string | null>(null);
  peekIdRef.current = peekId;
  const [orbWhy, setOrbWhy] = useState(false);
  const stateRef = useRef(state.focusId);
  stateRef.current = state.focusId;
  const drag = useRef({ down: false, moved: false, x: 0, y: 0, pointers: new Map<number, { x: number; y: number }>(), pinch: 0 });

  // Ask ONE: while an answer is showing, the map is laid out around it.
  const [ask, setAsk] = useState<AskAnswer | null>(null);
  const [askText, setAskText] = useState("");
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [askWhy, setAskWhy] = useState<string | null>(null);
  const askInputRef = useRef<HTMLInputElement>(null);
  const askIds = useMemo(() => ask?.results.map((r) => r.id) ?? [], [ask]);
  // Morning fly-through: step 0 is ONE, then each of today's top three.
  const router = useRouter();
  const [decided, setDecided] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState(false);
  const [decideErr, setDecideErr] = useState<string | null>(null);
  const [gci, setGci] = useState("");
  // Which ONE MOVE menu groups are open (this browser only).
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem("one.moveMenu.open") ?? "[]");
      if (Array.isArray(v)) setOpenGroups(v.filter((k): k is string => typeof k === "string"));
    } catch {}
  }, []);
  const [tour, setTour] = useState<{ ids: string[]; step: number } | null>(null);
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const [since, setSince] = useState<{ label: string; changes: ChangeNote[] } | null>(null);
  // Timeline: days from today the slider is at (0 = today, the normal map).
  const [when, setWhen] = useState(0);
  const whenRef = useRef(when);
  whenRef.current = when;
  const [now] = useState(() => new Date());
  const dated = useMemo(() => (tour || ask ? [] : inWindow(graph.dated, when, now, ix)), [graph.dated, when, now, ix, tour, ask]);
  const datedIds = useMemo(() => [...new Set(dated.map((d) => d.id))], [dated]);
  const timeline = when !== 0 && !tour && !ask;
  // Your day: today's work in order, with times; done as the products report
  // it (or the agent ticks it), compiled in the evening.
  const [dayDone, setDayDone] = useState<Set<string>>(() => new Set());
  const [dayMap, setDayMap] = useState(false);
  const [evening, setEvening] = useState(false);
  const slots = useMemo(() => planDay(graph.today ?? [], dayDone), [graph.today, dayDone]);
  const day = useMemo(() => recap(slots), [slots]);
  const dayIds = useMemo(() => [...new Set(slots.map((x) => x.nodeId))], [slots]);
  const dayView = dayMap && !tour && !ask && !timeline;
  const sceneFocus = ask || tour || timeline || dayView ? graph.rootId : state.focusId;
  // Live signals: the latest arrival (a small card) and the numbers that just ticked.
  const [toast, setToast] = useState<Signal | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(() => new Set());
  const askRef = useRef(ask);
  askRef.current = ask;

  const focus = ix.byId.get(state.focusId)!;
  const vs = useMemo(
    () =>
      tour
        ? answerSet(ix, tour.ids)
        : ask
          ? answerSet(ix, askIds)
          : timeline
            ? answerSet(ix, datedIds)
            : dayView
              ? answerSet(ix, dayIds)
              : visibleSet(ix, state.focusId, phone ? PHONE_BUDGET : DESKTOP_BUDGET),
    [ix, state.focusId, phone, ask, askIds, tour, timeline, datedIds, dayView, dayIds],
  );
  const placed = useMemo(() => layout(vs), [vs]);
  // ONE MOVE focused: the rail is ONE MOVE's main menu, as in Classic (Parry, 3 Oct).
  // Its live items stay in the panel on the right.
  const moveMenu = state.focusId === "move" && !focus.locked && !ask && !tour && !timeline && !dayView;
  // The rail: the focused node's children as floating buttons on the left.
  const railNodes = useMemo(
    () =>
      moveMenu
        ? []
        : tour
        ? tour.ids.map((id) => ix.byId.get(id)!).filter(Boolean)
        : ask
          ? askIds.map((id) => ix.byId.get(id)!).filter(Boolean)
          : timeline
            ? datedIds.map((id) => ix.byId.get(id)!).filter(Boolean)
            : dayView
              ? dayIds.map((id) => ix.byId.get(id)!).filter(Boolean)
              : childrenOf(ix, state.focusId).slice(0, 9),
    [ix, state.focusId, ask, askIds, tour, timeline, datedIds, dayView, dayIds, moveMenu],
  );
  const railCount = railNodes.length;
  const railRefs = useRef(new Map<string, HTMLButtonElement>());
  const railLineRefs = useRef(new Map<string, SVGLineElement>());
  const [railHover, setRailHover] = useState<string | null>(null);

  // ---- scene lifecycle ----------------------------------------------------
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const onMq = () => setPhone(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    let dead = false;
    let scene: BrainScene | null = null;
    (async () => {
      const { BrainScene } = await import("./scene.ts");
      if (dead || !hostRef.current) return;
      scene = new BrainScene();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      await scene.init(hostRef.current, reduced);
      if (dead) return scene.destroy();
      sceneRef.current = scene;
      scene.onFrame = syncOverlay;
      setReady(true);
    })();
    return () => {
      dead = true;
      mq.removeEventListener("change", onMq);
      scene?.destroy();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Point the camera at a world rectangle, leaving room for the card and rail.
  const frameOn = useCallback(
    (b: { minX: number; minY: number; maxX: number; maxY: number }, animate: boolean, keep = { top: 0, bottom: 0 }) => {
      const s = sceneRef.current;
      if (!s) return;
      const vp = s.viewport;
      if (phone) {
        // screen pixels kept clear above and below (the bar, the timeline)
        const c = fit(b, { width: vp.width, height: vp.height - keep.top - keep.bottom }, 12);
        return s.setCamera({ ...c, y: c.y - (keep.top - keep.bottom) / 2 / c.scale }, animate);
      }
      // Desktop: the detail card floats on the right; fit the graph to the rest.
      const room = Math.min(CARD_ROOM, vp.width * 0.4);
      const rail = (railCount > 0 || moveMenu) && vp.width > 1100 ? RAIL_ROOM : 0;
      const c = fit(b, { width: vp.width - room - rail, height: vp.height }, 40);
      s.setCamera({ ...c, x: c.x + (room - rail) / 2 / c.scale }, animate);
    },
    [phone, railCount, moveMenu],
  );
  const fitNow = useCallback(
    (animate: boolean) => {
      const b = bounds(placed, 20);
      if (phone) return frameOn(b, animate, { top: 76, bottom: 70 }); // the Ask ONE bar; the controls and timeline row
      b.maxY += 90; // keep clear of the controls and the timeline
      b.minY -= 70; // and of the Ask ONE bar across the top
      frameOn(b, animate);
    },
    [placed, phone, frameOn],
  );

  // Refit only when what is on screen changes, not when a number ticks (the
  // agent may have panned).
  const framedKey = useRef("");
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.setScene(placed, ix.byId, vs.edges, sceneFocus);
    const key = `${sceneFocus}|${phone}|${placed.map((p) => `${p.id}:${p.role}`).join(",")}`;
    if (key === framedKey.current) return;
    framedKey.current = key;
    if (!tourRef.current) fitNow(true);
  }, [ready, placed, vs, ix, sceneFocus, fitNow, phone]);

  useEffect(() => {
    drawerRef.current?.scrollTo({ top: 0 });
    setOrbWhy(false);
    setPeekId(null);
  }, [state.focusId]);

  useEffect(() => {
    sceneRef.current?.setHighlight(highlight);
  }, [highlight, ready]);

  // ---- morning: fly-through on the first visit of the day, then ring the
  // products that changed since the last visit -----------------------------
  const topIds = useMemo(() => morningTop(ix), [ix]);
  const pingChanges = useCallback(
    (changes: ChangeNote[]) => {
      const ids = orbsToPing(changes, ix);
      setTimeout(() => sceneRef.current?.ping(ids), 900);
    },
    [ix],
  );
  const endTour = useCallback(() => {
    if (!tourRef.current) return;
    setTour(null);
    if (since) pingChanges(since.changes);
  }, [since, pingChanges]);
  const startTour = useCallback(() => {
    if (!topIds.length) return;
    setWhen(0);
    setAsk(null);
    setHighlight(null);
    setState((st) => (st.focusId === graph.rootId ? st : nav.reset(st, graph.rootId)));
    setTour({ ids: topIds, step: 0 });
  }, [topIds, graph.rootId]);

  useEffect(() => {
    if (!ready) return;
    let prev: string | null = null;
    try {
      prev = localStorage.getItem("one.lastVisit");
      localStorage.setItem("one.lastVisit", new Date().toISOString());
    } catch {}
    const now = new Date();
    const changes = changesSince(graph.changes, prev, ix);
    setSince({ label: sinceLabel(prev, now), changes });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forced = new URLSearchParams(window.location.search).get("tour") === "1";
    if (!reduced && (forced || firstVisitToday(prev, now)) && topIds.length) {
      setTimeout(() => setTour({ ids: topIds, step: 0 }), 700);
    } else {
      pingChanges(changes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Each step: point the camera, hold, move on. Any input ends it (below).
  useEffect(() => {
    if (!tour || !sceneRef.current) return;
    const at = (id: string) => placed.find((p) => p.id === id);
    const hold = tour.step === 0 ? 1700 : 2800;
    if (tour.step === 0) {
      // ONE and today's three, all in view
      const b = bounds(placed, 20);
      b.minY -= phone ? 150 : 70; // the question bar, or the caption on a phone
      b.maxY += phone ? 70 : 170; // the controls, or the caption on desktop
      frameOn(b, true);
    } else {
      // In close on one item, with room for the caption (bottom on desktop, top on a phone)
      const p = at(tour.ids[tour.step - 1]);
      if (p)
        frameOn(
          phone
            ? { minX: p.x - p.r - 120, maxX: p.x + p.r + 120, minY: p.y - p.r - 230, maxY: p.y + p.r + 110 }
            : { minX: p.x - p.r - 170, maxX: p.x + p.r + 170, minY: p.y - p.r - 110, maxY: p.y + p.r + 300 },
          true,
        );
    }
    const t = setTimeout(() => {
      if (tour.step >= tour.ids.length) endTour();
      else setTour({ ...tour, step: tour.step + 1 });
    }, hold);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, placed]);

  // Your day: remember what is done today (this browser), and whether it is evening.
  const dayKey = `one.day.${localDay(now)}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(dayKey) ?? "[]");
      if (Array.isArray(saved)) setDayDone(new Set(saved.filter((x) => typeof x === "string")));
    } catch {}
    const q = new URLSearchParams(window.location.search).get("day");
    setEvening(q === "evening" || (q !== "morning" && isEvening(new Date())));
  }, [dayKey]);
  const setDone = useCallback(
    (ids: string[], on: boolean) =>
      setDayDone((cur) => {
        const next = new Set(cur);
        for (const id of ids) {
          if (on) next.add(id);
          else next.delete(id);
        }
        try {
          localStorage.setItem(dayKey, JSON.stringify([...next]));
        } catch {}
        return next;
      }),
    [dayKey],
  );

  // Timeline: ring each item as it comes into view while dragging.
  const shownOnTimeline = useRef(new Set<string>());
  useEffect(() => {
    const fresh = datedIds.filter((id) => !shownOnTimeline.current.has(id));
    shownOnTimeline.current = new Set(datedIds);
    if (fresh.length && timeline) setTimeout(() => sceneRef.current?.ping(fresh), 350);
  }, [datedIds, timeline]);

  // ---- live signals: something new arrives in a product --------------------
  // Demo: a timer plays the examples (?signals=fast for a quick look,
  // ?signals=off to stop them). Real: poll vip_summary and diff (lib/signals.ts).
  const sceneFocusRef = useRef(sceneFocus);
  sceneFocusRef.current = sceneFocus;
  const receive = useCallback(
    (sig: Signal) => {
      const scene = sceneRef.current;
      const path = pathTo(ix, sig.nodeId).map((n) => n.id);
      const visible = (id: string) => !!scene?.isVisible(id);
      const from = lightFrom(sig, path, visible);
      const to = visible("one") ? "one" : sceneFocusRef.current;
      const flying = !!(scene && from && scene.signal(from, to));
      setTimeout(() => {
        const at = new Date().toISOString();
        setGraph((g) => applySignal(g, sig, at));
        setSince((s) => (s ? { ...s, changes: [{ id: sig.nodeId, product: sig.product, what: sig.what, at }, ...s.changes] } : s));
        setToast(sig);
        const keys = new Set(sig.bumps.map((b) => `${b.nodeId}|${b.label ?? "sub"}`));
        setTicked(keys);
        setTimeout(() => setTicked((cur) => (cur === keys ? new Set() : cur)), 1800);
        const finished = completedBy(graph.today ?? [], sig.id);
        if (finished.length) setDone(finished, true);
      }, flying ? 1500 : 0);
    },
    [ix, graph.today, setDone],
  );
  useEffect(() => {
    if (!ready) return;
    const mode = new URLSearchParams(window.location.search).get("signals");
    // Real accounts: no example signals (polling vip_summary comes later).
    if (mode === "off" || live) return;
    const fast = mode === "fast";
    const queue = usable(DEMO_SIGNALS, indexGraph(initialGraph));
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const next = (ms: number) => {
      t = setTimeout(() => {
        if (i >= queue.length) return;
        // not while the morning plays, an answer is up, or the tab is hidden
        if (tourRef.current || askRef.current || whenRef.current || document.hidden) return next(3000);
        receiveRef.current(queue[i++]);
        next(fast ? 7000 : 40000);
      }, ms);
    };
    next(fast ? 2500 : 9000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const receiveRef = useRef(receive);
  receiveRef.current = receive;
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onResize = () => fitNow(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitNow]);

  // Keep each real button exactly over its drawn node, every frame.
  function syncOverlay() {
    const s = sceneRef.current;
    if (!s) return;
    for (const [id, el] of btnRefs.current) {
      const p = s.screenOf(id);
      if (!p || p.a < 0.05) {
        el.style.visibility = "hidden";
        continue;
      }
      const size = Math.max(48, p.r * 2);
      el.style.visibility = "visible";
      el.style.width = el.style.height = `${size}px`;
      el.style.transform = `translate(${p.x - size / 2}px, ${p.y - size / 2}px)`;
    }
    // Things anchored to orbs: the hover preview, the focused orb's action
    // chips, and its WHY box. Placed in screen space every frame.
    const vp = s.viewport;
    // The side panel sits over the right of the map: cards stop at its left edge.
    const peekHost = peekRef.current?.offsetParent as HTMLElement | null;
    const dr = drawerRef.current?.getBoundingClientRect();
    const hr = peekHost?.getBoundingClientRect();
    const right = dr && hr && dr.width > 0 && dr.left > hr.left ? Math.min(vp.width, dr.left - hr.left) : vp.width;
    const place = (el: HTMLElement | null, id: string | null, fn: (p: { x: number; y: number; r: number }, w: number, h: number) => [number, number]) => {
      if (!el) return;
      const p = id ? s.screenOf(id) : null;
      if (!p || p.a < 0.3) {
        el.style.visibility = "hidden";
        return;
      }
      const [x, y] = fn(p, el.offsetWidth, el.offsetHeight);
      el.style.visibility = "visible";
      el.style.transform = `translate(${Math.round(Math.min(Math.max(8, x), right - el.offsetWidth - 8))}px, ${Math.round(Math.min(Math.max(8, y), vp.height - el.offsetHeight - 8))}px)`;
    };
    const pid = peekIdRef.current;
    place(peekRef.current, pid && pid !== stateRef.current ? pid : null, (p, w, h) => (p.x + p.r + 14 + w > right - 8 ? [p.x - p.r - 14 - w, p.y - h / 2] : [p.x + p.r + 14, p.y - h / 2]));
    place(chipsRef.current, stateRef.current, (p, w) => [p.x - w / 2, p.y + p.r + 14]);
    place(whyRef.current, stateRef.current, (p, w, h) => {
      const chipsW = chipsRef.current?.offsetWidth ?? 0;
      const left = Math.min(p.x - p.r - 18, p.x - chipsW / 2 - 12) - w; // clear of the orb and its chips
      return left > 8 ? [left, Math.min(p.y - h / 2, p.y + p.r + 6 - h)] : [p.x - w / 2, p.y + p.r + 64];
    });
    // Rail lines: from each floating button to its orb.
    const hostRect = hostRef.current?.getBoundingClientRect();
    for (const [id, line] of railLineRefs.current) {
      const btn = railRefs.current.get(id);
      const p = s.screenOf(id);
      if (!btn || !p || !hostRect || p.a < 0.2 || btn.offsetParent === null) {
        line.style.opacity = "0";
        continue;
      }
      const br = btn.getBoundingClientRect();
      const x1 = br.right - hostRect.left, y1 = br.top + br.height / 2 - hostRect.top;
      const dx = p.x - x1, dy = p.y - y1, len = Math.hypot(dx, dy) || 1;
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(p.x - (dx / len) * (p.r + 4)));
      line.setAttribute("y2", String(p.y - (dy / len) * (p.r + 4)));
      line.style.opacity = "1";
    }
    // Leader line from the selected node to the floating card (desktop).
    const line = leaderRef.current, card = drawerRef.current, host = hostRef.current;
    if (line && card && host) {
      const p = s.screenOf(stateRef.current);
      const hr = host.getBoundingClientRect(), cr = card.getBoundingClientRect();
      const floating = getComputedStyle(card).position === "absolute";
      if (!p || !floating || p.a < 0.3) {
        line.style.opacity = "0";
      } else {
        const x2 = cr.left - hr.left, y2 = Math.min(Math.max(p.y, cr.top - hr.top + 40), cr.bottom - hr.top - 40);
        line.setAttribute("x1", String(p.x + p.r + 6));
        line.setAttribute("y1", String(p.y));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(y2));
        line.style.opacity = "1";
      }
    }
  }

  // ---- navigation ---------------------------------------------------------
  const goTo = useCallback((id: string) => {
    setHighlight(null);
    setOpenWhy(null);
    setAsk(null);
    setTour(null);
    setWhen(0);
    setDayMap(false);
    setState((s) => nav.go(s, id));
  }, []);
  const clearAsk = useCallback(() => {
    setAsk(null);
    setAskWhy(null);
    setAskErr(null);
  }, []);
  const goBack = useCallback(() => {
    setHighlight(null);
    setOpenWhy(null);
    if (ask) return clearAsk(); // back from an answer is the map you were on
    setState((s) => nav.back(s));
  }, [ask, clearAsk]);
  const goHome = useCallback(() => {
    setHighlight(null);
    setAsk(null);
    setWhen(0);
    setDayMap(false);
    setState((s) => (s.focusId === graph.rootId ? s : nav.reset(s, graph.rootId)));
    fitNow(true);
  }, [graph.rootId, fitNow]);

  const askOne = useCallback(
    async (q: string) => {
      const question = q.trim();
      if (!question || asking) return;
      setTour(null);
      setWhen(0);
      setAskText(question);
      setAskOpen(false);
      setAsking(true);
      setAskErr(null);
      try {
        const r = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, package: pkg, demo: !live }),
        });
        const a = (await r.json()) as AskAnswer & { error?: string };
        if (!r.ok || a.error) throw new Error(a.error ?? "no answer");
        setHighlight(null);
        setOpenWhy(null);
        setAskWhy(null);
        setAsk(a);
      } catch {
        setAskErr("ONE couldn't answer that just now. Try again.");
      } finally {
        setAsking(false);
      }
    },
    [asking, pkg],
  );
  const zoom = (f: number) => {
    const s = sceneRef.current;
    if (s) s.setCamera(zoomAt(s.camera, s.viewport, f), true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (tourRef.current) {
        endTour();
        if (e.key === "Escape") return;
      }
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === "/") {
        e.preventDefault();
        askInputRef.current?.focus();
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        goBack();
      } else if (e.key === "+" || e.key === "=") zoom(1.25);
      else if (e.key === "-") zoom(0.8);
      else if (e.key === "0") goHome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- gestures: drag to pan, wheel and pinch to zoom -------------------
  const onPointerDown = (e: React.PointerEvent) => {
    if (tourRef.current) endTour();
    const d = drag.current;
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    d.down = true;
    d.moved = false;
    d.x = e.clientX;
    d.y = e.clientY;
    if (d.pointers.size === 2) {
      const [a, b] = [...d.pointers.values()];
      d.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const s = sceneRef.current;
    if (!d.down || !s || !d.pointers.has(e.pointerId)) return;
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (d.pointers.size === 2) {
      const [a, b] = [...d.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (d.pinch > 0) {
        const rect = hostRef.current!.getBoundingClientRect();
        s.setCamera(zoomAt(s.camera, s.viewport, dist / d.pinch, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top), false);
      }
      d.pinch = dist;
      d.moved = true;
      return;
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    s.setCamera(pan(s.camera, dx, dy), false);
    d.x = e.clientX;
    d.y = e.clientY;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    d.pointers.delete(e.pointerId);
    if (d.pointers.size === 0) d.down = false;
    d.pinch = 0;
  };
  const onWheel = (e: React.WheelEvent) => {
    if (tourRef.current) endTour();
    const s = sceneRef.current;
    if (!s) return;
    const rect = hostRef.current!.getBoundingClientRect();
    s.setCamera(zoomAt(s.camera, s.viewport, Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top), false);
  };
  const clickNode = (id: string) => {
    if (drag.current.moved) return; // that was a drag, not a tap
    if (ask) return id === graph.rootId ? goHome() : goTo(id);
    if (id !== state.focusId) goTo(id);
  };

  // ---- view ---------------------------------------------------------------
  const path = pathTo(ix, state.focusId);
  const kids = childrenOf(ix, state.focusId);
  const related = (ix.links.get(state.focusId) ?? [])
    .map((e) => ix.byId.get(e.source === state.focusId ? e.target : e.source))
    .filter((n): n is GraphNode => !!n);
  const people = kids.filter((k) => k.type === "person").map((k) => k.id);
  const recTargets = (focus.recommendations ?? []).map((r) => r.targetId).filter((id): id is string => !!id && ix.byId.has(id));
  const showMeTargets = people.length ? people : recTargets;
  // SHOW ME: light up the people ONE means. If they live one level down, go
  // there first; nothing is hidden, everything else just fades.
  const showMe = () => {
    if (highlight) return setHighlight(null);
    if (people.length) return setHighlight(people);
    const parent = ix.byId.get(recTargets[0])?.parentId;
    if (parent && parent !== state.focusId) goTo(parent);
    setHighlight(recTargets);
  };
  const peek = peekId ? ix.byId.get(peekId) ?? null : null;
  const firstRec = focus.recommendations?.[0];
  const productHref = PRODUCT_HREF[focus.product];
  // Actions that live on the focused orb itself (and in the card as well).
  const orbActions: { label: string; run?: () => void; href?: string; primary?: boolean; pressed?: boolean }[] = [];
  if (ask) {
    // The answer panel carries the actions while ONE is answering.
  } else if (firstRec) orbActions.push({ label: "Why?", run: () => setOrbWhy((w) => !w), primary: true, pressed: orbWhy });
  if (!ask && showMeTargets.length) orbActions.push({ label: highlight ? "Show everything" : "Show me", run: showMe, pressed: !!highlight });
  if (!ask && focus.href && !focus.locked) orbActions.push({ label: `Open in ${productName(focus.product)} ↗`, href: focus.href });
  else if (!ask && productHref && focus.type !== "core" && !focus.locked) orbActions.push({ label: `Open ${productName(focus.product)} ↗`, href: productHref });
  if (!ask && focus.locked) orbActions.push({ label: "Add with Complete", href: UPGRADE_URL });

  // ONE MOVE's menu in the rail: one link per page, groups as drop-downs.
  const moveLink = (m: MovePage) => (
    <li key={m.path}>
      <a className="rail-btn rail-link" href={moveMenuHref(m.path)}>
        <span className="rail-icon" style={{ color: hex(PRODUCT_COLOR.move) }}>
          <Icon kind={m.path === "/dashboard" ? "move" : iconForText(m.label)} size={16} />
        </span>
        <span className="rail-text">
          <span>{m.label}</span>
        </span>
      </a>
    </li>
  );
  const toggleGroup = (key: string) =>
    setOpenGroups((gs) => {
      const next = gs.includes(key) ? gs.filter((k) => k !== key) : [...gs, key];
      try {
        localStorage.setItem("one.moveMenu.open", JSON.stringify(next));
      } catch {}
      return next;
    });

  // VIP-SUMMARY §3b: Accept or Dismiss a suggestion here, with the agent's own
  // sign-in. Then the Brain steps back up and reloads the summary.
  const decide = async (n: GraphNode, accept: boolean) => {
    if (!n.decide) return;
    setDeciding(true);
    setDecideErr(null);
    try {
      const r = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.decide.id, accept, gci: accept && n.decide.askGci && gci ? gci : null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Something went wrong.");
      const msg = j.status === "accepted" ? `Done: ${n.decide.acceptLabel.toLowerCase()}.` : j.status === "dismissed" ? "Dismissed." : "Already decided.";
      setDecided((d) => ({ ...d, [n.id]: msg }));
      setGci("");
      setTimeout(() => {
        const up = n.parentId ? ix.byId.get(n.parentId)?.parentId ?? n.parentId : n.product;
        goTo(up ?? n.product);
        router.refresh();
      }, 1200);
    } catch (e) {
      setDecideErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setDeciding(false);
    }
  };

  const orderedForTab = [...vs.nodes].sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.order - b.order);

  return (
    <div className={`brain ${tour ? "touring" : ""}`}>
      <header className="bar">
        <button className="brand" onClick={goHome} aria-label="ONE, home">
          VIP-50 <b>ONE</b>
        </button>
        <nav className="crumbs" aria-label="Where you are">
          {path.map((n, i) => (
            <span key={n.id}>
              {i > 0 && <span className="sep">/</span>}
              {i === path.length - 1 ? (
                <span aria-current="page">{n.label}</span>
              ) : (
                <button onClick={() => goTo(n.id)}>{n.label}</button>
              )}
            </span>
          ))}
        </nav>
        {live && (
          <nav className="dash-switch" aria-label="Dashboard version">
            <span aria-current="page">New dashboard</span>
            <a href={CLASSIC_DASHBOARD_URL}>Classic</a>
          </nav>
        )}
        {live ? (
          <form className="me-form" method="post" action="/auth/signout">
            <span className="me" aria-label={agent.label}>
              {agent.photo ? <img className="me-pic" src={agent.photo} alt="" /> : agent.initials}
            </span>
            <button className="signout" type="submit">Sign out</button>
          </form>
        ) : (
          <span className="me" aria-label={agent.label}>{agent.initials}</span>
        )}
      </header>

      <div className="stage">
        <section className="canvas-wrap" aria-label="ONE Brain map">
          <div
            ref={hostRef}
            className="canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            <svg className="leader" aria-hidden="true">
              <line ref={leaderRef} />
              {railNodes.map((k) => (
                <line
                  key={k.id}
                  className={`rail-line ${railHover === k.id ? "lit" : ""}`}
                  style={{ stroke: hex(PRODUCT_COLOR[k.product]) }}
                  ref={(el) => {
                    if (el) railLineRefs.current.set(k.id, el);
                    else railLineRefs.current.delete(k.id);
                  }}
                />
              ))}
            </svg>
            <div className="overlay">
              {orderedForTab.map((v) => (
                <button
                  key={v.node.id}
                  ref={(el) => {
                    if (el) btnRefs.current.set(v.node.id, el);
                    else btnRefs.current.delete(v.node.id);
                  }}
                  className={`node-btn ${v.role === "focus" ? "is-focus" : ""}`}
                  style={{ visibility: "hidden" }}
                  aria-label={nodeLabel(v.node, v.role, v.hasChildren)}
                  aria-current={v.role === "focus" ? "true" : undefined}
                  onClick={() => clickNode(v.node.id)}
                  onPointerEnter={(e) => {
                    sceneRef.current?.setHover(v.node.id);
                    if (e.pointerType === "mouse") setPeekId(v.node.id);
                  }}
                  onPointerLeave={() => {
                    sceneRef.current?.setHover(null);
                    setPeekId(null);
                  }}
                  onFocus={() => {
                    sceneRef.current?.setHover(v.node.id);
                    setPeekId(v.node.id);
                  }}
                  onBlur={() => {
                    sceneRef.current?.setHover(null);
                    setPeekId(null);
                  }}
                />
              ))}
            </div>
            {peek && (
              <div ref={peekRef} className="peek" style={{ visibility: "hidden" }} aria-hidden="true">
                <p className="peek-kicker" style={{ color: hex(PRODUCT_COLOR[peek.product]) }}>
                  {productName(peek.product)}
                  {peek.status && !peek.locked && (
                    <span style={{ color: hex(STATUS[peek.status].color) }}> · {STATUS[peek.status].label}</span>
                  )}
                </p>
                <p className="peek-title">{peek.label}</p>
                {peek.locked ? (
                  <p className="peek-sub">Included in ONE Complete</p>
                ) : peek.stats?.[0] ? (
                  <p className="peek-stat">
                    <b>{peek.stats[0].value}</b> {peek.stats[0].label}
                  </p>
                ) : (
                  peek.secondaryLabel && <p className="peek-sub">{peek.secondaryLabel}</p>
                )}
                {ask && ask.results.find((r) => r.id === peek.id) ? (
                  <p className="peek-sum">{clip(ask.results.find((r) => r.id === peek.id)!.reasons[0] ?? "", 110)}</p>
                ) : (
                  peek.summary && !peek.locked && <p className="peek-sum">{clip(peek.summary, 110)}</p>
                )}
                <p className="peek-hint">{childrenOf(ix, peek.id).length ? "Click to open" : "Click for details"}</p>
              </div>
            )}

            {ready && (orbActions.length > 0) && (
              <div ref={chipsRef} key={`chips-${state.focusId}`} className="chips pop" role="group" aria-label={`${focus.label} actions`} style={{ visibility: "hidden" }}>
                {orbActions.map((a) =>
                  a.href ? (
                    <a key={a.label} className="chip-btn" href={a.href} target="_blank" rel="noreferrer">
                      {a.label}
                    </a>
                  ) : (
                    <button key={a.label} className={`chip-btn ${a.primary ? "primary" : ""}`} aria-pressed={a.pressed} onClick={a.run}>
                      {a.label}
                    </button>
                  ),
                )}
              </div>
            )}

            {!ask && orbWhy && firstRec && (
              <div ref={whyRef} className="orb-why pop" role="dialog" aria-label="Why ONE surfaced this" style={{ visibility: "hidden" }}>
                <p className="orb-why-state">Why ONE surfaced this</p>
                <p className="orb-why-title">{firstRec.title}</p>
                <ul>
                  {firstRec.why.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {firstRec.targetId && ix.byId.get(firstRec.targetId) && firstRec.targetId !== state.focusId && (
                  <button className="link" onClick={() => goTo(firstRec.targetId!)}>
                    Go to {cleanName(ix.byId.get(firstRec.targetId)!.label)} →
                  </button>
                )}
              </div>
            )}

            {!ready && <div className="loading">Waking ONE…</div>}
          </div>
          {moveMenu && (
            <nav className="rail rail-menu pop" key="rail-move-menu" aria-label="ONE MOVE menu">
              <p className="rail-head">ONE MOVE</p>
              <p className="rail-sub">Main menu</p>
              <ul>
                {MOVE_TOP.map(moveLink)}
                {MOVE_GROUPS.map((g) => {
                  const gn = ix.byId.get(moveGroupId(g.key));
                  const open = openGroups.includes(g.key);
                  return (
                    <li key={g.key} className={`rail-group ${open ? "open" : ""}`}>
                      <button className="rail-btn rail-group-btn" aria-expanded={open} onClick={() => toggleGroup(g.key)}>
                        <span className="rail-text">
                          <span>{g.label}</span>
                          {gn?.status && gn.secondaryLabel && <small>{gn.secondaryLabel}</small>}
                        </span>
                        {gn?.status && <i className="rail-dot" style={{ background: hex(STATUS[gn.status].color) }} aria-label={STATUS[gn.status].label} />}
                        <span className="rail-caret" aria-hidden>{open ? "▾" : "▸"}</span>
                      </button>
                      {open && <ul className="rail-sublist">{g.pages.map(moveLink)}</ul>}
                    </li>
                  );
                })}
                {MOVE_BOTTOM.map(moveLink)}
              </ul>
            </nav>
          )}
          {railCount > 0 && (
            <nav className="rail pop" key={`rail-${ask ? `ask-${ask.question}` : state.focusId}`} aria-label={ask ? "ONE's answer" : `Inside ${focus.label}`}>
              <p className="rail-head">{tour ? "Your morning" : ask ? "ONE's answer" : focus.type === "core" ? "Your business" : focus.label}</p>
              {!ask && !tour && focus.type !== "core" && focus.secondaryLabel && <p className="rail-sub">{focus.secondaryLabel}</p>}
              <ul>
                {railNodes.map((k) => (
                  <li key={k.id}>
                    <button
                      ref={(el) => {
                        if (el) railRefs.current.set(k.id, el);
                        else railRefs.current.delete(k.id);
                      }}
                      className={`rail-btn ${railHover === k.id || highlight?.includes(k.id) || (tour && tour.ids[tour.step - 1] === k.id) ? "on" : ""} ${k.locked ? "locked" : ""}`}
                      onClick={() => goTo(k.id)}
                      onPointerEnter={() => {
                        setRailHover(k.id);
                        sceneRef.current?.setHover(k.id);
                      }}
                      onPointerLeave={() => {
                        setRailHover(null);
                        sceneRef.current?.setHover(null);
                      }}
                      onFocus={() => {
                        setRailHover(k.id);
                        sceneRef.current?.setHover(k.id);
                      }}
                      onBlur={() => {
                        setRailHover(null);
                        sceneRef.current?.setHover(null);
                      }}
                    >
                      <span className="rail-icon" style={{ color: hex(PRODUCT_COLOR[k.product]) }}>
                        {k.image && !k.locked ? <img className="rail-pic" src={k.image} alt="" /> : k.type === "person" ? <b>{initialsOf(k.label)}</b> : <Icon kind={iconFor(k)} size={18} />}
                      </span>
                      <span className="rail-text">
                        <span>{k.label}</span>
                        {k.locked ? <small>Included in Complete</small> : k.secondaryLabel && <small>{k.secondaryLabel}</small>}
                      </span>
                      {k.status && !k.locked && <i className="rail-dot" style={{ background: hex(STATUS[k.status].color) }} aria-label={STATUS[k.status].label} />}
                    </button>
                  </li>
                ))}
              </ul>
              {!ask && !tour && (vs.hiddenChildren > 0 || childrenOf(ix, state.focusId).length > railCount) ? (
                <p className="rail-more">+{childrenOf(ix, state.focusId).length - railCount} more in the panel</p>
              ) : null}
            </nav>
          )}

          <form
            className={`ask ${askOpen ? "open" : ""}`}
            role="search"
            aria-label="Ask ONE"
            onSubmit={(e) => {
              e.preventDefault();
              askOne(askText);
            }}
          >
            <div className="ask-field">
              <span className="ask-mark" aria-hidden="true">ONE</span>
              <input
                ref={askInputRef}
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                onFocus={() => setAskOpen(true)}
                onBlur={() => setTimeout(() => setAskOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setAskOpen(false);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Ask ONE anything about your business…"
                aria-label="Ask ONE a question about your business"
                maxLength={300}
                enterKeyHint="search"
              />
              {ask && !asking ? (
                <button type="button" className="ask-go ghost" onClick={clearAsk} aria-label="Clear the answer">
                  ✕
                </button>
              ) : (
                <button type="submit" className="ask-go" disabled={asking || !askText.trim()} aria-busy={asking}>
                  {asking ? "…" : "Ask"}
                </button>
              )}
            </div>
            {askOpen && (
              <ul className="ask-sugs pop" aria-label="Suggested questions">
                {SUGGESTED.map((q) => (
                  <li key={q}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => askOne(q)}>
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {asking && <p className="ask-status" role="status">ONE is thinking…</p>}
            {askErr && <p className="ask-status err" role="alert">{askErr}</p>}
          </form>

          {tour && (() => {
            const id = tour.step > 0 ? tour.ids[tour.step - 1] : null;
            const n = id ? ix.byId.get(id) : null;
            return (
              <div className="tour-card pop" key={`tour-${tour.step}`} role="status" aria-live="polite">
                <p className="tour-kicker">
                  Your morning{n ? ` · ${tour.step} of ${tour.ids.length}` : ""}
                </p>
                {n ? (
                  <>
                    <p className="tour-title" style={{ color: hex(PRODUCT_COLOR[n.product]) }}>{n.label}</p>
                    {n.secondaryLabel && <p className="tour-sub">{n.secondaryLabel}</p>}
                    {factsFor(ix, n.id)[0] && <p className="tour-why">{factsFor(ix, n.id)[0]}</p>}
                  </>
                ) : (
                  <p className="tour-title">{hello} Here are your three for today.</p>
                )}
                <button className="tour-skip" onClick={endTour}>
                  {tour.step >= tour.ids.length ? "Done" : "Skip"}
                </button>
              </div>
            );
          })()}

          {!tour && (
            <div className={`timeline${when ? " on" : ""}`}>
              <span className="tl-end">Past</span>
              <div className="tl-track">
                <input
                  type="range"
                  min={-RANGE}
                  max={RANGE}
                  step={1}
                  value={when}
                  aria-label="Timeline"
                  aria-valuetext={offsetLabel(when)}
                  onChange={(e) => {
                    setAsk(null);
                    setWhen(Number(e.target.value));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setWhen(0);
                  }}
                  style={{ ["--pos" as string]: `${((when + RANGE) / (2 * RANGE)) * 100}%` }}
                />
                <span className="tl-today" aria-hidden="true" />
              </div>
              <span className="tl-end">Future</span>
              <button className={`tl-now${when ? "" : " is-now"}`} onClick={() => setWhen(0)} aria-label="Back to today">
                {offsetLabel(when)}
              </button>
            </div>
          )}

          <div className="signal-live" role="status" aria-live="polite">
            {toast && !tour && (
              <div className="signal-card pop" key={toast.id}>
                <i style={{ background: hex(PRODUCT_COLOR[toast.product]) }} aria-hidden="true" />
                <div>
                  <p className="signal-kicker" style={{ color: hex(PRODUCT_COLOR[toast.product]) }}>
                    {productName(toast.product)} · just now
                  </p>
                  <p className="signal-what">{toast.what}</p>
                </div>
                <button
                  onClick={() => {
                    setToast(null);
                    goTo(toast.nodeId);
                  }}
                >
                  Go to
                </button>
                <button className="signal-x" onClick={() => setToast(null)} aria-label="Dismiss">
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="controls" role="toolbar" aria-label="Map controls">
            <button onClick={goBack} disabled={!state.history.length} aria-label="Back">
              ←
            </button>
            <button className="zoom-btn" onClick={() => zoom(1.25)} aria-label="Zoom in">
              +
            </button>
            <button className="zoom-btn" onClick={() => zoom(0.8)} aria-label="Zoom out">
              −
            </button>
            <button onClick={goHome} aria-label="Centre on ONE">
              ◎
            </button>
          </div>
        </section>

        {ask ? (
          <aside ref={drawerRef} key={`ask-${ask.question}`} className="drawer pop" aria-label="ONE's answer" aria-live="polite">
            <div className="d-head">
              <span className="chip" style={{ color: hex(PRODUCT_COLOR.one), borderColor: hex(PRODUCT_COLOR.one) }}>
                Ask ONE
              </span>
            </div>
            <p className="ask-q">{ask.question}</p>
            <p className="ask-a">{ask.answer}</p>
            {ask.source === "ai" && <p className="d-src">Answered from your business, just now</p>}
            {ask.results.length > 0 && (
              <div className="d-recs">
                <h2>ONE's answer</h2>
                <ul>
                  {ask.results.map((r) => {
                    const n = ix.byId.get(r.id);
                    if (!n) return null;
                    return (
                      <li key={r.id} className="rec">
                        <p className="rec-state" style={{ color: hex(PRODUCT_COLOR[n.product]) }}>
                          <i style={{ borderColor: hex(PRODUCT_COLOR[n.product]) }} />
                          {productName(n.product)}
                          {n.status && <span style={{ color: hex(STATUS[n.status].color) }}> · {STATUS[n.status].label}</span>}
                        </p>
                        <p className="rec-title">{n.label}</p>
                        {n.secondaryLabel && <p className="ask-sub">{n.secondaryLabel}</p>}
                        <div className="rec-actions">
                          <button className="why" aria-expanded={askWhy === r.id} onClick={() => setAskWhy(askWhy === r.id ? null : r.id)}>
                            Why?
                          </button>
                          <button className="link" onClick={() => goTo(n.id)}>
                            Go to {cleanName(n.label)} →
                          </button>
                        </div>
                        {askWhy === r.id && (
                          <div className="why-box pop">
                            <p>Why ONE surfaced this</p>
                            <ul>
                              {r.reasons.map((f) => (
                                <li key={f}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <button className="btn btn-wide ghost-btn" onClick={clearAsk}>
              ← Back to the map
            </button>
          </aside>
        ) : timeline ? (
          <aside ref={drawerRef} className="drawer" aria-label="Timeline" aria-live="polite">
            <div className="d-head">
              <span className="chip" style={{ color: hex(PRODUCT_COLOR.one), borderColor: hex(PRODUCT_COLOR.one) }}>
                {when < 0 ? "Looking back" : "Looking ahead"}
              </span>
            </div>
            <h1 className="d-title">{windowTitle(when)}</h1>
            <p className="d-sum">
              {dated.length
                ? when < 0
                  ? `${dated.length} ${dated.length === 1 ? "thing" : "things"} happened across your business.`
                  : `${dated.length} ${dated.length === 1 ? "thing is" : "things are"} coming up.`
                : when < 0
                  ? "Nothing recorded in this stretch."
                  : "Nothing on the calendar yet."}
            </p>
            {dated.length > 0 && (
              <ul className="tl-list">
                {dated.map((d) => {
                  const n = ix.byId.get(d.id)!;
                  return (
                    <li key={`${d.id}-${d.at}`}>
                      <button onClick={() => goTo(d.id)}>
                        <span className="tl-day">{dayLabel(d.day, d.at)}</span>
                        <span className="tl-body">
                          <small style={{ color: hex(PRODUCT_COLOR[d.product]) }}>{productName(d.product)}</small>
                          {d.what}
                        </span>
                        <em aria-label={`Go to ${n.label}`}>→</em>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button className="btn btn-wide ghost-btn" onClick={() => setWhen(0)}>
              ← Back to today
            </button>
          </aside>
        ) : (
        <aside ref={drawerRef} key={state.focusId} className="drawer pop" aria-label={`${focus.label} details`} aria-live="polite">
          <div className="d-head">
            <span className="chip" style={{ color: hex(PRODUCT_COLOR[focus.product]), borderColor: hex(PRODUCT_COLOR[focus.product]) }}>
              {productName(focus.product)}
            </span>
            {focus.status && !focus.locked && (
              <span className="state" style={{ color: hex(STATUS[focus.status].color) }}>
                <i style={{ background: hex(STATUS[focus.status].color) }} />
                {STATUS[focus.status].label}
              </span>
            )}
          </div>
          <h1 className="d-title">{focus.type === "core" ? hello : focus.label}</h1>
          {focus.secondaryLabel && focus.type !== "core" && <p className="d-sub">{focus.secondaryLabel}</p>}
          {focus.type === "core" && note ? (
            <>
              <p className="d-sum">{note.note}</p>
              {note.source === "ai" && <p className="d-src">Written for you this morning</p>}
            </>
          ) : (
            focus.summary && <p className="d-sum">{focus.summary}</p>
          )}

          {focus.decide && !focus.locked && !ask && (
            <div className="decide">
              {decided[focus.id] ? (
                <p className="decide-done" role="status">{decided[focus.id]}</p>
              ) : (
                <>
                  {focus.decide.askGci && (
                    <label className="decide-gci">
                      <span>GCI for this closing (optional)</span>
                      <input inputMode="decimal" placeholder="$" value={gci} onChange={(e) => setGci(e.target.value.replace(/[^0-9.]/g, ""))} />
                    </label>
                  )}
                  <div className="decide-btns">
                    <button className="btn" disabled={deciding} onClick={() => decide(focus, true)}>{focus.decide.acceptLabel}</button>
                    <button className="btn ghost-btn" disabled={deciding} onClick={() => decide(focus, false)}>Dismiss</button>
                  </div>
                  {decideErr && <p className="decide-err" role="alert">{decideErr}</p>}
                </>
              )}
            </div>
          )}

          {focus.type === "core" && slots.length > 0 && (
            <div className="day">
              <h2>Your day</h2>
              {evening || day.done === day.total ? (
                <div className="day-recap pop">
                  <p className="day-recap-k">Your day, compiled</p>
                  <p className="day-recap-t">
                    {day.done} of {day.total} done. {day.vipTouches} VIP {day.vipTouches === 1 ? "touch" : "touches"}.{" "}
                    {day.carry.length ? `${day.carry.length} ${day.carry.length === 1 ? "moves" : "move"} to tomorrow.` : "Nothing missed."}
                  </p>
                </div>
              ) : (
                <p className="day-when">
                  {day.done} of {day.total} done · about {duration(day.minutesLeft)} left
                </p>
              )}
              <ol>
                {slots.map((x) => (
                  <li key={x.id} className={x.done ? "is-done" : undefined}>
                    <button
                      className="day-tick"
                      aria-pressed={x.done}
                      aria-label={x.done ? `Done: ${x.what} Tap to undo.` : `Mark done: ${x.what}`}
                      onClick={() => setDone([x.id], !x.done)}
                    >
                      {x.done ? "✓" : ""}
                    </button>
                    <button className="day-item" onClick={() => goTo(x.nodeId)}>
                      <span className="day-time">{clock(x.start)}</span>
                      <span className="day-body">
                        <small style={{ color: hex(PRODUCT_COLOR[x.product]) }}>
                          {productName(x.product)} · {duration(x.minutes)}
                        </small>
                        {x.what}
                      </span>
                      <em aria-hidden="true">→</em>
                    </button>
                  </li>
                ))}
              </ol>
              <button className="link" onClick={() => setDayMap((v) => !v)}>
                {dayView ? "← Back to the map" : "▶ Show my day on the map"}
              </button>
            </div>
          )}

          {focus.type === "core" && since && (
            <div className="since">
              <h2>Since you were last here</h2>
              <p className="since-when">{since.label}</p>
              {since.changes.length ? (
                <ul>
                  {since.changes.map((c) => {
                    const n = ix.byId.get(c.id)!;
                    return (
                      <li key={`${c.id}-${c.at}`}>
                        <button onClick={() => goTo(c.id)}>
                          <i style={{ background: hex(PRODUCT_COLOR[c.product]) }} aria-hidden="true" />
                          <span>
                            <small style={{ color: hex(PRODUCT_COLOR[c.product]) }}>{productName(c.product)}</small>
                            {c.what}
                          </span>
                          <em aria-label={`Go to ${n.label}`}>→</em>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="since-none">Nothing new. You're up to date.</p>
              )}
              {topIds.length > 0 && (
                <button className="link" onClick={startTour}>
                  ▶ Replay my morning
                </button>
              )}
              <a className="link" href="/watch">
                ▶ Watch ONE Work
              </a>
            </div>
          )}

          {focus.locked && (
            <a className="btn" href={UPGRADE_URL}>
              Add with Complete
            </a>
          )}

          {focus.stats && <Stats stats={focus.stats} color={hex(PRODUCT_COLOR[focus.product])} ticked={(l) => ticked.has(`${focus.id}|${l}`)} />}

          {focus.pace && !focus.locked && (
            <div className="pace">
              <p className="pace-head">{focus.pace.headline}</p>
              {focus.pace.detail && (
                <p className="pace-detail">
                  <span className="pace-mark" aria-hidden="true" />
                  {focus.pace.detail}
                </p>
              )}
            </div>
          )}

          {showMeTargets.length > 0 && (
            <button className="btn btn-wide" aria-pressed={!!highlight} onClick={showMe}>
              {highlight ? "Show everything" : "Show me →"}
            </button>
          )}

          {focus.recommendations && (
            <div className="d-recs">
              <h2>ONE recommends</h2>
              <ul>
                {focus.recommendations.map((r, i) => {
                  const target = r.targetId ? ix.byId.get(r.targetId) : undefined;
                  const st = target?.status ?? focus.status;
                  return (
                    <li key={r.title} className="rec">
                      {st && (
                        <p className="rec-state" style={{ color: hex(STATUS[st].color) }}>
                          <i style={{ borderColor: hex(STATUS[st].color) }} />
                          {STATUS[st].label}
                        </p>
                      )}
                      <p className="rec-kicker">Recommended action</p>
                      <p className="rec-title">{r.title}</p>
                      <div className="rec-actions">
                        <button className="why" aria-expanded={openWhy === i} onClick={() => setOpenWhy(openWhy === i ? null : i)}>
                          Why?
                        </button>
                        {target && (
                          <button className="link" onClick={() => goTo(target.id)}>
                            Go to {target.label.replace(/^(Call|Text|Face-to-face:|Send note to)\s*/i, "")} →
                          </button>
                        )}
                      </div>
                      {openWhy === i && (
                        <div className="why-box pop">
                          <p>Why ONE surfaced this</p>
                          <ul>
                            {r.why.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {kids.length > 0 && (
            <div className={`d-list inside ${railCount > childrenOf(ix, state.focusId).length - 1 ? "" : "keep"}`}>
              <h2>{focus.type === "core" ? "Your products" : "Inside"}</h2>
              <ul>
                {kids.map((k) => (
                  <li key={k.id}>
                    <button onClick={() => goTo(k.id)}>
                      <i style={{ background: hex(PRODUCT_COLOR[k.product]) }} />
                      <span>
                        <b>{k.label}</b>
                        {k.locked ? <small>Included in Complete</small> : k.secondaryLabel && <small>{k.secondaryLabel}</small>}
                      </span>
                      {k.status && !k.locked && <em style={{ color: hex(STATUS[k.status].color) }}>{STATUS[k.status].label}</em>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {related.length > 0 && (
            <div className="d-list">
              <h2>Connected</h2>
              <ul>
                {related.map((k) => (
                  <li key={k.id}>
                    <button onClick={() => goTo(k.id)}>
                      <i style={{ background: hex(PRODUCT_COLOR[k.product]) }} />
                      <span>
                        <b>{k.label}</b>
                        <small>{productName(k.product)}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
        )}
      </div>
    </div>
  );
}

function roleRank(r: string) {
  return { focus: 0, child: 1, related: 2, ancestor: 3, sibling: 4 }[r] ?? 5;
}

function productName(p: GraphNode["product"]) {
  return { one: "ONE", go: "ONE GO", move: "ONE MOVE", marquee: "Marquee", showly: "Showly", open: "ONE Open" }[p];
}

function nodeLabel(n: GraphNode, role: string, hasChildren: boolean) {
  const parts = [n.label];
  if (n.secondaryLabel) parts.push(n.secondaryLabel);
  if (n.status && !n.locked) parts.push(STATUS[n.status].label);
  if (n.locked) parts.push("not in your package");
  if (role === "focus") parts.push("selected");
  else if (role === "ancestor") parts.push("go back up");
  else if (hasChildren) parts.push("open");
  return parts.join(", ");
}

function Stats({ stats, color, ticked = () => false }: { stats: { label: string; value: string }[]; color: string; ticked?: (label: string) => boolean }) {
  const [hero, ...rest] = stats;
  const m = /^\s*(\d+)\s*\/\s*(\d+)/.exec(hero.value);
  return (
    <div className="stats">
      {m ? (
        <div className="hero">
          <Ring value={Number(m[1])} max={Number(m[2])} color={color} />
          <div>
            <p className="hero-label">{hero.label}</p>
            <p className={`hero-value${ticked(hero.label) ? " tick" : ""}`}>{hero.value}</p>
          </div>
        </div>
      ) : (
        <div className="row">
          <span>{hero.label}</span>
          <b className={ticked(hero.label) ? "tick" : undefined}>{hero.value}</b>
        </div>
      )}
      {rest.map((s) => (
        <div className="row" key={s.label}>
          <span className="row-label">
            <Icon kind={iconForText(s.label)} size={16} color="var(--text-2)" />
            {s.label}
          </span>
          <b className={ticked(s.label) ? "tick" : undefined}>{s.value}</b>
        </div>
      ))}
    </div>
  );
}

function Ring({ value, max, color }: { value: number; max: number; color: string }) {
  const r = 30, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, value / max));
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
      <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(79,127,224,0.45)" strokeWidth="7" />
      <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 38 38)" />
    </svg>
  );
}

const PRODUCT_HREF: Partial<Record<GraphNode["product"], string>> = {
  move: "https://move.vip50one.com",
  marquee: "https://marquee.vip-50.com",
  open: "https://open.vip-50.com",
  showly: "https://showly.net",
};

function clip(t: string, n: number) {
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

function cleanName(label: string) {
  return label.replace(/^(Call|Text|Face-to-face:|Send note to|Social touch:)\s*/i, "");
}

function initialsOf(label: string) {
  return cleanName(label).replace(/^the\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// Good morning / afternoon / evening, by the agent's day (Mountain time for now).
function greeting(now = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "numeric", hourCycle: "h23" }).format(now));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
