"use client";

import { CLASSIC_DASHBOARD_URL } from "@/lib/host.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PersonPanel from "./PersonPanel.tsx";
import VipRings from "./VipRings.tsx";
import DailyTracker from "./DailyTracker.tsx";
import WeeklyTracker from "./WeeklyTracker.tsx";
import Rolodex from "./Rolodex.tsx";
import MyProfile from "./MyProfile.tsx";
import Contacts from "./Contacts.tsx";
import HotWarmCold from "./HotWarmCold.tsx";
import TouchAudit from "./TouchAudit.tsx";
import GroupPanel from "./GroupPanel.tsx";
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
import { clock, completedBy, duration, isEvening, planDay, recap, type DayItem, type Slot } from "@/lib/day.ts";
import { localDay } from "@/lib/morning.ts";
import PulseMark from "./PulseMark.tsx";
import PulseIntro from "./PulseIntro.tsx";
import SignalsFilm, { ONE_FILM } from "./SignalsFilm.tsx";
import PlanMyDay from "./PlanMyDay.tsx";
import DayClock from "./DayClock.tsx";
import { useDay } from "./useDay.ts";
import { chimeOn, dueChimes, notify, playChime, unlockChime } from "@/lib/chime.ts";
import { nextLine, toMin, toTime } from "@/lib/schedule.ts";
import { soundsLikeDay } from "@/lib/overview.ts";
import CommitmentsView from "./CommitmentsView.tsx";
import ReviewView from "./ReviewView.tsx";
import IncomeMapView from "./IncomeMapView.tsx";
import PulseCoachView from "./PulseCoachView.tsx";
import ReferralsView from "./ReferralsView.tsx";
import WinsView from "./WinsView.tsx";
import TeamView from "./TeamView.tsx";
import ReviewCallsView from "./ReviewCallsView.tsx";
import HabitsView from "./HabitsView.tsx";
import PartnersView from "./PartnersView.tsx";
import PowerHourView from "./PowerHourView.tsx";
import CoachView from "./CoachView.tsx";
import { commitmentWork } from "@/lib/assist.ts";
import { PULSE_COACH_NODE, demoHistory, historyUrl, pulseRead, readHistory, withPulseCoachNode, type History, type Read as PulseRead } from "@/lib/pulseCoach.ts";
import { POWER_NODE, lineUp, newSession, powerKey, readSession, withPowerNode, type Call, type Session as PowerSession } from "@/lib/powerHour.ts";
import { ASSUME_DEFAULT, INCOME_NODE, goalFacts, incomeKey, incomeMap, readAssume, withIncomeNode, type Assume, type IncomeMap } from "@/lib/goals.ts";
import { REVIEW_NODE, demoRoster, goalsFromGraph, review as buildReview, withReviewNode, type Review } from "@/lib/review.ts";
import { dailyUrl, readDaily, withTick, type DailyDay } from "@/lib/daily.ts";
import { REVIEW_CALLS_NODE, agentsUrl, demoAgents, readAgents, withReviewCallsNode, type ReviewAgent } from "@/lib/reviewCalls.ts";
import { TEAM_NODE, demoTeam, readTeam, teamUrl, withTeamNode, type Scope as TeamScope, type Team } from "@/lib/team.ts";
import { WINS_NODE, demoWins, newSince, readWins, winsUrl, withWinsNode, type Wins } from "@/lib/wins.ts";
import { PARTNERS_NODE, demoPartners, partnersActionUrl, partnersUrl, readPartners, withPartnersNode, type PartnersState } from "@/lib/partners.ts";
import { HABITS_NODE, demoHabitsDay, habitsToday, withHabitsNode, mondayOf, type HabitToday } from "@/lib/habits.ts";
import { readRoster, vipsUrl, type VipRoster } from "@/lib/vips.ts";
import { REFERRALS_NODE, askUrl, demoReferrals, readReferrals, referralsUrl, withReferralsNode, type Referrals } from "@/lib/referrals.ts";
import { COACH_NODE, coachedUrl, demoCoached, readCoached, withCoachNode, type Coached } from "@/lib/coach.ts";
import { WEEK_NODE, commitmentsUrl, demoCommitments, readCommitments, withWeekNode, type Commitments } from "@/lib/commitments.ts";
import { PLAN_NODE, planKey, planUrl, readPlan, timed, withPlanNode, type Plan } from "@/lib/plan.ts";
import { todayIn } from "@/lib/hwc.ts";
import { needWords, needsOf, type Need } from "@/lib/needs.ts";
import { SEEN_KEY } from "@/lib/pulseIntro.ts";
import type { SceneNeed } from "./scene.ts";
import { returnNote, withoutNotes } from "@/lib/googleReturn.ts";
import { IN_BRAIN, MOVE_PAGE_WIDTH, MOVE_BOTTOM, isMoveGroup, isMovePage, MOVE_GROUPS, MOVE_TOP, inBrainPage, moveEmbedHref, moveGroupId, moveMenuHref, movePageId, type MovePage, pageAddress, pageFromAddress } from "@/lib/moveMenu.ts";

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

// The hour in the agent's time zone (Mountain), for the commitment pulses (§3n.1).
function denverHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "numeric", hourCycle: "h23" }).format(now));
}

export default function Brain({ graph: initialGraph, pkg = "complete", agent = DEMO_AGENT, live = false }: { graph: BusinessGraph; pkg?: string; agent?: BrainAgent; live?: boolean }) {
  const hello = `${greeting()}, ${agent.firstName}.`;
  // The graph changes while the page is open (live signals tick its numbers).
  // ONE GO's Today's plan orb follows the plan (Parry, 6 Oct: "shouldnt there be a plan my day orb off of go").
  const plannedRef = useRef<Plan | null>(null);
  // ONE YOU's "This week" orb follows the agent's commitments (Parry, 6 Oct; VIP-SUMMARY §3n).
  const commitRef = useRef<Commitments | null>(null);
  // ONE YOU's Coaching orb, for coaches only (§3n.4).
  const coachRef = useRef<Coached[] | null>(null);
  // ONE YOU's Weekly Review orb (PULSE-ROADMAP "ONE YOU"): pulses when part of the week needs the agent.
  const reviewRef = useRef<Review | null>(null);
  // ONE YOU's Income Map orb: the income goal worked back to the week.
  const incomeRef = useRef<IncomeMap | null>(null);
  const refsRef = useRef<Referrals | null>(null);
  const habitsRef = useRef<HabitToday[] | null>(null);
  const partnersRef = useRef<PartnersState | null>(null);
  const winsRef = useRef<{ w: Wins; fresh: number } | null>(null);
  const teamRef = useRef<Team | null>(null);
  const rcRef = useRef(false);
  // ONE YOU's Pulse Coach orb (§3q): the weekly read on the agent's own numbers.
  const pcRef = useRef<PulseRead | null>(null);
  // ONE YOU's Power Hour orb: today's calls lined up.
  const powerRef = useRef<{ calls: Call[]; session: PowerSession | null } | null>(null);
  const [graph, setGraph] = useState(() => withPlanNode(initialGraph, null));
  const lastPath = useRef<string[]>([]); // the focused node's ancestors, nearest last
  // Fresh numbers from the server replace the graph. Without
  // this, a refresh after logging a call changed nothing on screen.
  // Swap the graph and, in the same render, move off an item that is gone
  // (a follow-up just done). Rendering the new graph with the old focus
  // crashed the page (Parry, 4 Oct, after "Yes, log it" on Sarah Bennett).
  const swapGraph = useCallback((fresh: BusinessGraph) => {
    const next = withReviewCallsNode(withTeamNode(withWinsNode(withPartnersNode(withHabitsNode(withReferralsNode(withPulseCoachNode(withPowerNode(withIncomeNode(withReviewNode(withCoachNode(withWeekNode(withPlanNode(fresh, plannedRef.current), commitRef.current, denverHour()), coachRef.current, denverHour()), reviewRef.current), incomeRef.current), powerRef.current?.calls ?? null, powerRef.current?.session ?? null), pcRef.current), refsRef.current), habitsRef.current), partnersRef.current, todayIn()), winsRef.current?.w ?? null, winsRef.current?.fresh ?? 0), teamRef.current), rcRef.current);
    const nix = indexGraph(next);
    setGraph(next);
    setState((s) => {
      if (nix.byId.has(s.focusId)) return s;
      const keep = [...lastPath.current].reverse().find((id) => nix.byId.has(id)) ?? next.rootId;
      return nav.go(s, keep);
    });
  }, []);
  useEffect(() => {
    if (live) swapGraph(initialGraph);
  }, [initialGraph, live, swapGraph]);
  // Fresh numbers without re-rendering the route (Parry, 5 Oct: the screen blinked and went
  // back to the dashboard every minute). Only the graph changes; the open page stays put.
  const refreshLive = useCallback(async () => {
    if (!live) return;
    try {
      const r = await fetch("/api/live", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json().catch(() => null)) as { graph?: BusinessGraph } | null;
      if (j?.graph && Array.isArray(j.graph.nodes) && j.graph.rootId) swapGraph(j.graph);
      // ticks made on the phone (or done by the real call, text or task) come back with the plan
      fetch(planUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((pj) => {
          const p = readPlan(pj, plannedRef.current?.items ?? []);
          if (p && p.sentAt && p.date === todayIn()) setPlanned(p);
        })
        .catch(() => {});
      fetch(commitmentsUrl, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((cj) => {
          const cm = readCommitments(cj);
          if (cm) setCommitments(cm);
        })
        .catch(() => {});
    } catch {
      // offline or signed out: keep what is on screen
    }
  }, [live, swapGraph]);
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
  // Follow the pulse (Parry, 5 Oct): what needs the agent, added up every orb above it.
  const needs = useMemo(() => needsOf(graph.nodes), [graph]);
  const sceneNeeds = useMemo(() => {
    const parents = new Set(graph.nodes.map((n) => n.parentId).filter((p): p is string => !!p));
    const m = new Map<string, SceneNeed>();
    for (const [id, need] of needs) m.set(id, { ...need, leaf: !parents.has(id) });
    return m;
  }, [graph, needs]);
  // The centre ONE orb plays the voiced film, What everything means (Parry, 5 Oct); Meet Pulse opens
  // from the film, and a signed-in agent sees Meet Pulse once on a first visit.
  const [intro, setIntro] = useState(false);
  const [guide, setGuide] = useState(false); // What everything means
  const [oneFilm, setOneFilm] = useState(false); // Watch ONE Work, voiced
  useEffect(() => {
    if (!live) return;
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return;
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      return; // storage blocked: only the orb opens it
    }
    setIntro(true);
  }, [live]);
  const [state, setState] = useState(() => nav.start(graph.rootId));
  const [phone, setPhone] = useState(false);
  const [ready, setReady] = useState(false);
  const [highlight, setHighlight] = useState<string[] | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const btnRefs = useRef(new Map<string, HTMLButtonElement>());
  const drawerRef = useRef<HTMLElement>(null);
  const leaderRef = useRef<SVGLineElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state.focusId);
  stateRef.current = state.focusId;
  const drag = useRef({ down: false, moved: false, x: 0, y: 0, pointers: new Map<number, { x: number; y: number }>(), pinch: 0 });

  // Ask ONE: while an answer is showing, the map is laid out around it.
  const [ask, setAsk] = useState<AskAnswer | null>(null);
  const [askText, setAskText] = useState("");
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const askInputRef = useRef<HTMLInputElement>(null);
  const askIds = useMemo(() => ask?.results.map((r) => r.id) ?? [], [ask]);
  // Morning fly-through: step 0 is ONE, then each of today's top three.
  const [decided, setDecided] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState(false);
  const [decideErr, setDecideErr] = useState<string | null>(null);
  const [gci, setGci] = useState("");
  // A ONE MOVE page inside the Brain fills the window. When the window is
  // narrower than ONE MOVE's full desktop layout (VIP-50, Swap and VIP-100
  // side by side), the page is drawn at that width and shrunk to fit, so it
  // looks the same as Classic (Parry, 3 Oct).
  const frameBoxRef = useRef<HTMLDivElement>(null);
  const [frameReady, setFrameReady] = useState<string | null>(null);
  const [frameScale, setFrameScale] = useState(1);
  const focusIsPage = !!inBrainPage(state.focusId);
  useEffect(() => {
    const el = frameBoxRef.current;
    if (!el) return;
    const fit = () => setFrameScale(Math.min(1, el.clientWidth / MOVE_PAGE_WIDTH));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [focusIsPage]);
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
  // Plan My Day (§3l): once the agent has planned today, Your day is that plan, in their order.
  const [planOpen, setPlanOpen] = useState(false);
  const [planned, setPlanned] = useState<Plan | null>(null);
  useEffect(() => {
    plannedRef.current = planned;
    setGraph((g) => withPlanNode(g, planned));
  }, [planned]);
  const [commitments, setCommitments] = useState<Commitments | null>(null);
  const [cmOpen, setCmOpen] = useState(false);
  useEffect(() => {
    if (!live) return setCommitments(demoCommitments(todayIn()));
    fetch(commitmentsUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setCommitments(readCommitments(j)))
      .catch(() => {}); // not live yet: no "This week" orb
  }, [live]);
  useEffect(() => {
    commitRef.current = commitments;
    setGraph((g) => withWeekNode(g, commitments, denverHour()));
  }, [commitments]);
  const [coached, setCoached] = useState<Coached[] | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  useEffect(() => {
    if (!live) return setCoached(demoCoached(todayIn()));
    fetch(coachedUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)) // 403 for anyone who coaches nobody: no Coaching orb
      .then((j) => setCoached(j ? readCoached(j, todayIn()) : null))
      .catch(() => {});
  }, [live]);
  useEffect(() => {
    coachRef.current = coached;
    setGraph((g) => withCoachNode(g, coached, denverHour()));
  }, [coached]);
  // Weekly Review: the week's score (ONE MOVE's daily feed), the VIP-50 roster, commitments and goals.
  const [weekScore, setWeekScore] = useState<{ score: number; minimum: number } | null>(null);
  // The Habits ring: the Daily Tracker's "habits" boxes (same feed), ticked from the Brain like any box.
  const [habitsDay, setHabitsDay] = useState<DailyDay | null>(null);
  const [habitsOpen, setHabitsOpen] = useState(false);
  const [roster, setRoster] = useState<VipRoster | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  useEffect(() => {
    if (!live) {
      setWeekScore({ score: 82, minimum: 100 });
      setRoster(demoRoster());
      setHabitsDay(demoHabitsDay(todayIn()));
      return;
    }
    const get = (u: string) => fetch(u, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    get(dailyUrl).then((j) => {
      const d = readDaily(j);
      setWeekScore(d?.week ?? null);
      setHabitsDay(d);
    });
    get(vipsUrl).then((j) => setRoster(j ? readRoster(j) : null));
  }, [live]);
  // Keyed by content: adding the review orb changes graph.nodes, and must not rebuild the review again.
  const goalKey = JSON.stringify(goalsFromGraph(graph.nodes));
  const goalNodes = useMemo(() => JSON.parse(goalKey) as ReturnType<typeof goalsFromGraph>, [goalKey]);
  const theReview = useMemo(
    () => (weekScore || roster || commitments || goalNodes.length ? buildReview({ today: todayIn(), week: weekScore, roster, commitments, goals: goalNodes }) : null),
    [weekScore, roster, commitments, goalNodes],
  );
  useEffect(() => {
    reviewRef.current = theReview;
    setGraph((g) => withReviewNode(g, theReview));
  }, [theReview]);
  // The Income Map: the goal orbs' facts and the agent's own numbers (kept in this browser).
  const [assume, setAssume] = useState<Assume>(ASSUME_DEFAULT);
  const [incomeOpen, setIncomeOpen] = useState(false);
  useEffect(() => {
    try {
      setAssume(readAssume(JSON.parse(localStorage.getItem(incomeKey) ?? "null")));
    } catch {}
  }, []);
  const saveAssume = (a: Assume) => {
    setAssume(a);
    try {
      localStorage.setItem(incomeKey, JSON.stringify(a));
    } catch {}
  };
  const factsKey = JSON.stringify(goalFacts(graph.nodes));
  const theIncome = useMemo(() => incomeMap(JSON.parse(factsKey), assume, todayIn()), [factsKey, assume]);
  useEffect(() => {
    incomeRef.current = theIncome;
    setGraph((g) => withIncomeNode(g, theIncome));
  }, [theIncome]);
  // Pulse Coach (§3q): eight weeks of the agent's own numbers from ONE MOVE; the example agent's until it answers.
  const [history, setHistory] = useState<History | null>(null);
  const [pcOpen, setPcOpen] = useState(false);
  useEffect(() => {
    if (!live) return setHistory(demoHistory(todayIn()));
    fetch(historyUrl(8), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setHistory(j ? readHistory(j) : null))
      .catch(() => {});
  }, [live]);
  const thePulseRead = useMemo(() => (history ? pulseRead(history, commitments, todayIn()) : null), [history, commitments]);
  // Referral Scoreboard (§3r): who sent business and who is likely next, from ONE MOVE; the example agent's until it answers.
  const [refs, setRefs] = useState<Referrals | null>(null);
  const [refsOpen, setRefsOpen] = useState(false);
  useEffect(() => {
    if (!live) return setRefs(demoReferrals(todayIn()));
    fetch(referralsUrl(), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setRefs(j ? readReferrals(j) : null))
      .catch(() => {});
  }, [live]);
  useEffect(() => {
    refsRef.current = refs;
    setGraph((g) => withReferralsNode(g, refs));
  }, [refs]);
  const askReferral = useCallback(async (contactId: string): Promise<string> => {
    try {
      const r = await fetch(askUrl, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact_id: contactId }) });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      if (r.ok && j?.ok) return "Added to today's tasks. Ask in your own words; nothing is sent.";
      if (j?.reason === "already_asked") return "There is already an open ask for them in your tasks.";
      if (j?.reason === "opted_out" || j?.reason === "has_agent") return "Not for this one: they opted out or have an agent.";
      return "Could not add the task just now. Please try again.";
    } catch {
      return "Could not add the task just now. Please try again.";
    }
  }, []);
  const theHabits = useMemo(() => habitsToday(habitsDay, history, todayIn()), [habitsDay, history]);
  useEffect(() => {
    habitsRef.current = theHabits.length ? theHabits : null;
    setGraph((g) => withHabitsNode(g, theHabits.length ? theHabits : null));
  }, [theHabits]);
  const tickHabit = useCallback(
    async (key: string, done: boolean): Promise<string | null> => {
      if (!habitsDay) return "Your Daily Tracker isn't loaded yet.";
      const before = habitsDay;
      setHabitsDay(withTick(habitsDay, key, done)); // lights at once; ONE MOVE's answer settles it
      if (!live) return null;
      try {
        const r = await fetch(dailyUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, done }) });
        const body = await r.json().catch(() => null);
        const next = r.ok ? readDaily(body) : null;
        if (!next) throw new Error((body as { error?: string } | null)?.error || "That didn't save. Nothing was changed.");
        setHabitsDay(next);
        setWeekScore(next.week);
        return null;
      } catch (e) {
        setHabitsDay(before);
        return e instanceof Error ? e.message : "That didn't save. Nothing was changed.";
      }
    },
    [habitsDay, live],
  );
  const openHabits = useCallback(() => {
    setHabitsOpen(true);
    if (!live) return;
    // fresh from ONE MOVE, in case a box was ticked on the phone since the Brain loaded
    fetch(dailyUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const d = readDaily(j);
        if (d) setHabitsDay(d);
      })
      .catch(() => {});
  }, [live]);
  // Review calls (§3v): admins only. The orb shows once ONE MOVE answers the agents list (a 403 for everyone else).
  const [rcAgents, setRcAgents] = useState<ReviewAgent[] | null>(null);
  const [rcOpen, setRcOpen] = useState(false);
  const loadRcAgents = useCallback(
    (q = "") => {
      if (!live) return setRcAgents(demoAgents().filter((a) => a.name.toLowerCase().includes(q.toLowerCase())));
      fetch(agentsUrl(q), { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const a = j ? readAgents(j) : null;
          if (a) setRcAgents(a);
        })
        .catch(() => {});
    },
    [live],
  );
  useEffect(() => loadRcAgents(), [loadRcAgents]);
  useEffect(() => {
    rcRef.current = rcAgents != null;
    setGraph((g) => withReviewCallsNode(g, rcAgents != null));
  }, [rcAgents]);
  // Team (§3u): the week's leaderboard among members, full screen for the office TV; the example team in the demo.
  const [team, setTeam] = useState<Team | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamScope, setTeamScope] = useState<TeamScope>("all");
  useEffect(() => {
    if (!live) return setTeam(demoTeam(mondayOf(todayIn())));
    fetch(teamUrl(teamScope), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setTeam(j ? readTeam(j) : null))
      .catch(() => {});
  }, [live, teamScope]);
  useEffect(() => {
    teamRef.current = team;
    setGraph((g) => withTeamNode(g, team));
  }, [team]);
  // Wins (§3t): every good thing in one place, from ONE MOVE; the example agent's in the demo. A win newer than the
  // agent's last look glows gold; the last look is kept in this browser only.
  const WINS_SEEN = "one.wins.seen";
  const [wins, setWins] = useState<Wins | null>(null);
  const [winsOpen, setWinsOpen] = useState(false);
  const [winsSeen, setWinsSeen] = useState<string | null>(null);
  useEffect(() => {
    try {
      setWinsSeen(localStorage.getItem(WINS_SEEN) ?? (live ? null : new Date(Date.parse(`${todayIn()}T12:00:00Z`) - 3 * 86_400_000).toISOString().slice(0, 10)));
    } catch {}
    if (!live) return setWins(demoWins(todayIn()));
    fetch(winsUrl(), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setWins(j ? readWins(j) : null))
      .catch(() => {});
  }, [live]);
  const freshWins = useMemo(() => (wins ? newSince(wins, winsSeen) : []), [wins, winsSeen]);
  useEffect(() => {
    winsRef.current = wins ? { w: wins, fresh: freshWins.length } : null;
    setGraph((g) => withWinsNode(g, wins, freshWins.length));
  }, [wins, freshWins]);
  const closeWins = useCallback(() => {
    setWinsOpen(false);
    const t = todayIn();
    setWinsSeen(t);
    try {
      localStorage.setItem(WINS_SEEN, t);
    } catch {}
  }, []);
  // Accountability partners (§3s): from ONE MOVE once it answers; example partners in the demo.
  const [partners, setPartners] = useState<PartnersState | null>(null);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const loadPartners = useCallback(() => {
    if (!live) return setPartners((p) => p ?? demoPartners(todayIn()));
    fetch(partnersUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setPartners(j ? readPartners(j) : null))
      .catch(() => {});
  }, [live]);
  useEffect(() => loadPartners(), [loadPartners]);
  useEffect(() => {
    partnersRef.current = partners;
    setGraph((g) => withPartnersNode(g, partners, todayIn()));
  }, [partners]);
  const partnerAct = useCallback(
    async (a: { action: "respond" | "end" | "nudge"; pairId: string; accept?: boolean; kind?: string }): Promise<string | null> => {
      if (!live) {
        // the example agent: show the result without ONE MOVE
        setPartners((s) => {
          if (!s) return s;
          if (a.action === "nudge") return { ...s, partners: s.partners.map((p) => (p.pairId === a.pairId ? { ...p, lastNudgeFromMe: `${todayIn()}T12:00:00Z` } : p)) };
          if (a.action === "end") return { ...s, partners: s.partners.filter((p) => p.pairId !== a.pairId) };
          const inv = s.invitesIn.find((i) => i.pairId === a.pairId);
          const rest = s.invitesIn.filter((i) => i.pairId !== a.pairId);
          if (!a.accept || !inv) return { ...s, invitesIn: rest };
          return { ...s, invitesIn: rest, partners: [...s.partners, { pairId: inv.pairId, userId: inv.pairId, name: inv.name, photo: null, score: 71, minimum: 100, last4: [88, 95, 102, 90], streak: 0, tickedToday: true, lastNudgeFromMe: null }] };
        });
        return null;
      }
      const body = a.action === "respond" ? { pair_id: a.pairId, accept: a.accept } : a.action === "nudge" ? { pair_id: a.pairId, kind: a.kind } : { pair_id: a.pairId };
      try {
        const r = await fetch(partnersActionUrl(a.action), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const j = (await r.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
        if (r.ok && j?.ok) {
          loadPartners();
          return null;
        }
        if (j?.reason === "too_soon") return "You've already nudged them today. One a day.";
        if (j?.reason === "limit") return "You already have 3 partners.";
        return "That didn't go through. Nothing was changed.";
      } catch {
        return "That didn't go through. Nothing was changed.";
      }
    },
    [live, loadPartners],
  );
  // A coach's Pulse read of one agent they coach (§3n.4, §3q): their eight weeks, in the third person. MASTER answers
  // only for an agent linked to this coach (coach_links); the example agents use example weeks.
  const [agentRead, setAgentRead] = useState<{ who: string; read: PulseRead } | null>(null);
  const readAgent = useCallback(
    async (a: Coached): Promise<string | null> => {
      const first = a.name.split(/\s+/)[0];
      const today = todayIn();
      let h: History | null = null;
      if (!live) h = demoHistory(today, (coached ?? []).findIndex((x) => x.id === a.id) + 1);
      else {
        try {
          const r = await fetch(historyUrl(8, a.id), { credentials: "include", cache: "no-store" });
          h = r.ok ? readHistory(await r.json()) : null;
        } catch {
          h = null;
        }
      }
      const read = h ? pulseRead(h, a.c, today, first) : null;
      if (!read) return `No finished week for ${first} yet, so Pulse has nothing to read.`;
      setAgentRead({ who: first, read });
      return null;
    },
    [live, coached],
  );
  useEffect(() => {
    pcRef.current = thePulseRead;
    setGraph((g) => withPulseCoachNode(g, thePulseRead));
  }, [thePulseRead]);
  // Power Hour: today's calls, most urgent first, then the VIP-50 with no call this month.
  const [powerOpen, setPowerOpen] = useState(false);
  const callsKey = JSON.stringify(lineUp(graph.today ?? [], roster));
  const calls = useMemo(() => JSON.parse(callsKey) as Call[], [callsKey]);
  const [power, setPower] = useState<PowerSession | null>(null);
  useEffect(() => {
    try {
      setPower(readSession(JSON.parse(localStorage.getItem(powerKey(todayIn())) ?? "null"), todayIn()));
    } catch {}
  }, []);
  const session = power ?? newSession(todayIn(), calls);
  const savePower = (s: PowerSession) => {
    setPower(s);
    try {
      localStorage.setItem(powerKey(s.date), JSON.stringify(s));
    } catch {}
  };
  useEffect(() => {
    powerRef.current = { calls, session: power };
    setGraph((g) => withPowerNode(g, calls, power));
  }, [calls, power]);
  // The Day Clock (§3o.9): the day planned round the calendar; Your day lists its blocks in time order.
  const [clockOpen, setClockOpen] = useState(false);
  const [tellText, setTellText] = useState<string | undefined>(undefined);
  const doneRefs = useMemo(() => new Set([...dayDone].map((id) => id.replace(/^day:/, ""))), [dayDone]);
  // the week's commitments become today's work (§3o.7)
  const commitWork = useMemo(() => commitmentWork(commitments, todayIn()), [commitments]);
  const theDay = useDay({ today: graph.today ?? [], planned, live, doneRefs, onPlan: setPlanned, extra: commitWork });
  const slots = useMemo(() => {
    if (theDay.plan.blocks.length) {
      const byRef = new Map<string, DayItem>((graph.today ?? []).map((d) => [d.ref ?? d.id.replace(/^day:/, ""), d]));
      const plannedBy = new Map((planned?.items ?? []).map((p) => [p.ref, p]));
      const out: Slot[] = [];
      for (const b of theDay.plan.blocks) {
        let t = toMin(b.start);
        for (const r of b.refs) {
          const d = byRef.get(r);
          const p = plannedBy.get(r);
          const minutes = d?.minutes ?? p?.minutes ?? Math.max(5, toMin(b.end) - toMin(b.start));
          out.push({
            id: `day:${r}`,
            nodeId: d?.nodeId && ix.byId.has(d.nodeId) ? d.nodeId : p?.nodeId && ix.byId.has(p.nodeId) ? p.nodeId : (d?.product ?? p?.product) === "go" || r.startsWith("blk:") ? "go" : "move",
            product: d?.product ?? p?.product ?? "go",
            kind: d?.kind ?? p?.kind ?? "other",
            what: d?.what ?? p?.title ?? b.title,
            minutes,
            start: toTime(t),
            end: toTime(t + minutes),
            done: dayDone.has(`day:${r}`) || !!p?.done,
          });
          t += minutes;
        }
      }
      return out;
    }
    if (!planned?.items.length) return planDay((graph.today ?? []).slice(0, 8), dayDone);
    return timed(planned.items, planned.start).map((p) => ({
      id: `day:${p.ref}`,
      nodeId: p.nodeId && ix.byId.has(p.nodeId) ? p.nodeId : p.product === "go" ? "go" : "move",
      product: p.product,
      kind: p.kind,
      what: p.title,
      minutes: p.minutes,
      start: p.start,
      end: p.end,
      done: p.done || dayDone.has(`day:${p.ref}`),
    }));
  }, [graph.today, dayDone, planned, ix, theDay.plan.blocks]);
  const day = useMemo(() => recap(slots), [slots]);
  const dayIds = useMemo(() => [...new Set(slots.map((x) => x.nodeId))], [slots]);
  const dayView = dayMap && !tour && !ask && !timeline;
  const sceneFocus = ask || tour || timeline || dayView || !ix.byId.has(state.focusId) ? graph.rootId : state.focusId;
  // Live signals: the latest arrival (a small card) and the numbers that just ticked.
  const [toast, setToast] = useState<Signal | null>(null);
  // Back from Google, Lofty or billing (ONE MOVE sends the agent here,
  // vip50-web-crm#49): open My Profile and say what happened, once.
  const [googleNote, setGoogleNote] = useState<{ ok: boolean; kicker: string; what: string } | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(() => new Set());
  const askRef = useRef(ask);
  askRef.current = ask;

  // After a refresh the focused item may be gone (a follow-up just done): show
  // the nearest thing still there; the effect below moves the map to it.
  const focus =
    ix.byId.get(state.focusId) ??
    [...lastPath.current].reverse().map((id) => ix.byId.get(id)).find((n) => !!n) ??
    ix.byId.get(graph.rootId)!;
  if (focus.id === state.focusId) lastPath.current = pathTo(ix, focus.id).slice(0, -1).map((n) => n.id);
  const focusIdRef = useRef(focus.id);
  focusIdRef.current = focus.id;
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
              : visibleSet(ix, focus.id, phone ? PHONE_BUDGET : DESKTOP_BUDGET),
    [ix, focus.id, phone, ask, askIds, tour, timeline, datedIds, dayView, dayIds],
  );
  const placed = useMemo(() => layout(vs), [vs]);
  // ONE MOVE focused: the rail is ONE MOVE's main menu, as in Classic (Parry, 3 Oct).
  // Its live items stay in the panel on the right.
  const moveMenu = focus.id === "move" && !focus.locked && !ask && !tour && !timeline && !dayView;
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
              : childrenOf(ix, focus.id).slice(0, 9),
    [ix, focus.id, ask, askIds, tour, timeline, datedIds, dayView, dayIds, moveMenu],
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
    s.setNeeds(sceneNeeds);
    const key = `${sceneFocus}|${phone}|${placed.map((p) => `${p.id}:${p.role}`).join(",")}`;
    if (key === framedKey.current) return;
    framedKey.current = key;
    if (!tourRef.current) fitNow(true);
  }, [ready, placed, vs, ix, sceneFocus, fitNow, phone, sceneNeeds]);

  useEffect(() => {
    drawerRef.current?.scrollTo({ top: 0 });
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

  // Today's plan: this browser's copy, then ONE GO's (MASTER) when it answers.
  useEffect(() => {
    const date = todayIn();
    const known = (graph.today ?? []).map((d) => ({ ref: d.ref ?? d.id.replace(/^day:/, ""), nodeId: d.nodeId, urgency: d.urgency, special: d.special }));
    try {
      const p = readPlan(JSON.parse(localStorage.getItem(planKey(date)) ?? "null"), known);
      if (p && p.date === date) setPlanned(p);
    } catch {}
    if (!live) return;
    fetch(planUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const p = readPlan(j, known);
        if (p && p.date === date && p.sentAt) setPlanned(p);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

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

  // A tick on Your day: this browser, and the plan in MASTER when there is one (§3l.3: a check
  // mark only, no touch and no tracker box).
  const tickDay = (id: string, on: boolean) => {
    setDone([id], on);
    if (!planned) return;
    const ref = id.replace(/^day:/, "");
    setPlanned((p) => p && { ...p, items: p.items.map((i) => (i.ref === ref ? { ...i, done: on } : i)) });
    if (live)
      fetch(`${planUrl}/done`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref, done: on }) }).catch(() => {});
  };

  // The Day Clock (§3o.9): the day planned round the calendar. The Next line and the chimes follow it
  // while the dashboard is open (§3o.11).
  const next = theDay.now ? nextLine(theDay.plan.blocks, theDay.now) : null;
  const [ringing, setRinging] = useState(false);
  const rung = useRef<Set<string>>(new Set());
  useEffect(() => {
    try {
      rung.current = new Set(JSON.parse(sessionStorage.getItem("one.rung") ?? "[]"));
    } catch {}
    const unlock = () => unlockChime();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  useEffect(() => {
    if (!theDay.now) return;
    const due = dueChimes(theDay.plan.blocks, toMin(theDay.now), rung.current);
    if (!due.length) return;
    for (const d of due) rung.current.add(d.key);
    try {
      sessionStorage.setItem("one.rung", JSON.stringify([...rung.current]));
    } catch {}
    if (chimeOn()) playChime(false);
    const b = theDay.plan.blocks.find((x) => due[0].key.startsWith(`${x.id}:`));
    if (b) notify(due[0].kind === "soon" ? `${b.title} in 5 minutes.` : `Time for ${b.title}.`);
    setRinging(true);
    const t = setTimeout(() => setRinging(false), 8000);
    return () => clearTimeout(t);
  }, [theDay.now, theDay.plan.blocks]);

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
    // Things anchored to orbs (no hover card: Parry, 8 Oct, removed them): the focused orb's action
    // chips, and its WHY box. Placed in screen space every frame.
    const vp = s.viewport;
    // The side panel sits over the right of the map: cards stop at its left edge.
    const cardHost = chipsRef.current?.offsetParent as HTMLElement | null;
    const dr = drawerRef.current?.getBoundingClientRect();
    const hr = cardHost?.getBoundingClientRect();
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
    place(chipsRef.current, stateRef.current, (p, w) => [p.x - w / 2, p.y + p.r + 14]);
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
    setAsk(null);
    setTour(null);
    setWhen(0);
    setDayMap(false);
    setState((s) => nav.go(s, id));
  }, []);
  useEffect(() => {
    if (focus.id !== state.focusId) goTo(focus.id);
  }, [focus.id, state.focusId, goTo]);
  // "Go to" a person opens that person in Contacts (Parry, 6 Oct: "the go to that contact doesnt work
  // to take you to that contact"); anything else moves the map there.
  const [contactOpen, setContactOpen] = useState<{ id: string; k: number } | null>(null);
  const goToNode = (id: string) => {
    const n = ix.byId.get(id);
    const page = movePageId("/contacts");
    if (n?.contactId && ix.byId.has(page)) {
      setContactOpen({ id: n.contactId, k: Date.now() });
      return goTo(page);
    }
    goTo(id);
  };

  // Live numbers (Parry, 4 Oct): re-read the agent's data every minute while
  // the Brain is open and visible, and on coming back to the tab, so a box
  // ticked in ONE GO or ONE MOVE shows here within a minute.
  useEffect(() => {
    if (!live) return;
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 15_000) return;
      last = Date.now();
      refreshLive();
    };
    const t = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [live, refreshLive]);

  const clearAsk = useCallback(() => {
    setAsk(null);
    setAskErr(null);
  }, []);
  const goBack = useCallback(() => {
    setHighlight(null);
    if (ask) return clearAsk(); // back from an answer is the map you were on
    // One step up the path at the top (Parry, 4 Oct), from what is on screen.
    setState((s) => nav.up(s, pathTo(ix, focusIdRef.current)));
  }, [ask, clearAsk, ix]);
  const goHome = useCallback(() => {
    setHighlight(null);
    setAsk(null);
    setWhen(0);
    setDayMap(false);
    setState((s) => (s.focusId === graph.rootId ? s : nav.reset(s, graph.rootId)));
    fitNow(true);
  }, [graph.rootId, fitNow]);

  // A page's own address (/dashboard/profile) or PROFILE.md §4's
  // ?open=profile opens that page on arrival.
  useEffect(() => {
    const u = new URL(window.location.href);
    const fromPath = pageFromAddress(u.pathname);
    const wantsProfile = u.searchParams.get("open") === "profile";
    if (!fromPath && !wantsProfile) return;
    if (wantsProfile) {
      u.searchParams.delete("open");
      window.history.replaceState(null, "", u.toString());
    }
    goTo(movePageId(fromPath ?? "/profile"));
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = returnNote(window.location.search);
    if (!g) return;
    window.history.replaceState(null, "", pageAddress("/profile") + withoutNotes(window.location.href).replace(/^[^?#]*/, ""));
    setGoogleNote(g);
    goTo(movePageId("/profile"));
    const t = setTimeout(() => setGoogleNote(null), 12000);
    return () => clearTimeout(t);
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askOne = useCallback(
    async (q: string) => {
      const question = q.trim();
      if (!question || asking) return;
      // "Hey Pulse, I have a doctor's appointment 8 to 9... plan around that": the Day Clock takes it
      if (soundsLikeDay(question)) {
        setAskOpen(false);
        setTellText(question);
        setClockOpen(true);
        return;
      }
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
    if (id === PLAN_NODE) return setClockOpen(true);
    if (id === WEEK_NODE) return setCmOpen(true);
    if (id === COACH_NODE) return setCoachOpen(true);
    if (id === REVIEW_NODE) return setReviewOpen(true);
    if (id === INCOME_NODE) return setIncomeOpen(true);
    if (id === POWER_NODE) return setPowerOpen(true);
    if (id === PULSE_COACH_NODE) return setPcOpen(true);
    if (id === REFERRALS_NODE) return setRefsOpen(true);
    if (id === HABITS_NODE) return openHabits();
    if (id === PARTNERS_NODE) return setPartnersOpen(true);
    if (id === WINS_NODE) return setWinsOpen(true);
    if (id === TEAM_NODE) return setTeamOpen(true);
    if (id === REVIEW_CALLS_NODE) return setRcOpen(true);
    if (id === graph.rootId && state.focusId === graph.rootId && !tour) return setGuide(true);
    if (id !== state.focusId) goTo(id);
  };

  // ---- view ---------------------------------------------------------------
  const path = pathTo(ix, focus.id);
  const kids = childrenOf(ix, focus.id);
  const related = (ix.links.get(focus.id) ?? [])
    .map((e) => ix.byId.get(e.source === focus.id ? e.target : e.source))
    .filter((n): n is GraphNode => !!n);
  const productHref = PRODUCT_HREF[focus.product];
  // Actions that live on the focused orb itself (and in the card as well).
  const orbActions: { label: string; run?: () => void; href?: string; primary?: boolean; pressed?: boolean }[] = [];
  // Inside ONE MOVE (Parry, 3 Oct): no buttons on the orb; everything about it,
  // and what to do, sits in the panel on the right.
  // No "Open ONE MOVE" anywhere, the ONE MOVE orb included (Parry, 3 Oct: "get
  // rid of them everywhere"); its pages open inside the Brain.
  const moveQuiet = focus.product === "move";
  if (ask || moveQuiet) {
    // The answer panel carries the actions while ONE is answering.
  }
  // No "Why?" or "Show me" (Parry, 6 Oct: "they really dont show you anything... the why button just
  // repeats what it says above").
  if (!ask && !moveQuiet && focus.href && !focus.locked) orbActions.push({ label: `Open in ${productName(focus.product)} ↗`, href: focus.href });
  else if (!ask && !moveQuiet && productHref && focus.type !== "core" && !focus.locked && !isMoveGroup(focus.id)) orbActions.push({ label: `Open ${productName(focus.product)} ↗`, href: productHref });
  if (!ask && focus.locked) orbActions.push({ label: "Add with Complete", href: UPGRADE_URL });

  // ONE MOVE's menu in the rail: one link per page, groups as drop-downs.
  const moveLink = (m: MovePage) => {
    const inner = (
      <>
        <span className="rail-icon" style={{ color: hex(PRODUCT_COLOR.move) }}>
          <Icon kind={m.path === "/dashboard" ? "move" : iconForText(m.label)} size={16} />
        </span>
        <span className="rail-text">
          <span>{m.label}</span>
        </span>
      </>
    );
    return (
      <li key={m.path}>
        {IN_BRAIN.has(m.path) ? (
          <button className="rail-btn rail-link" onClick={() => goTo(movePageId(m.path))}>{inner}</button>
        ) : (
          <a className="rail-btn rail-link" href={moveMenuHref(m.path)}>{inner}</a>
        )}
      </li>
    );
  };
  // A ONE MOVE page that opens inside the Brain (lib/moveMenu.ts IN_BRAIN).
  const pagePanel = !ask && !tour ? inBrainPage(state.focusId) : null;
  // Each opening starts behind the veil again, even for the same page.
  const panelPath = pagePanel?.path ?? null;
  useEffect(() => {
    setFrameReady(null);
    setVipClassic(false);
  }, [panelPath]);
  // The address follows the open page: /dashboard/profile, /dashboard/weekly...
  const arrived = useRef(false);
  useEffect(() => {
    if (!arrived.current) {
      // let the arrival effects open the page the address names first
      arrived.current = true;
      if (!panelPath && pageFromAddress(window.location.pathname)) return;
    }
    const want = pageAddress(panelPath);
    if (window.location.pathname !== want) window.history.replaceState(null, "", want + window.location.search + window.location.hash);
  }, [panelPath]);
  // ONE MOVE pages drawn natively: VIP Management (the VIP rings, §3d) and the
  // Daily Tracker (§3e). The Classic page stays one click away, and is the
  // fallback until ONE MOVE's route answers.
  const NATIVE: Record<string, "vip" | "daily" | "weekly" | "audit" | "rolodex" | "profile" | "hwc" | "contacts"> = { "/contacts": "contacts", "/contacts/vip": "vip", "/daily": "daily", "/weekly": "weekly", "/contacts/audit": "audit", "/rolodex": "rolodex", "/profile": "profile", "/hot-warm-cold": "hwc" };
  const [vipClassic, setVipClassic] = useState(false);
  const nativeKind = panelPath ? NATIVE[panelPath] : undefined;
  const vipNative = !!nativeKind && !vipClassic;
  const vipUnavailable = useCallback(() => setVipClassic(true), []);
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
        refreshLive();
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
        <button className="brand brand-logo" onClick={goHome} aria-label="VIP-50 ONE, home">
          <img src="/brand/vip50-one.webp" alt="VIP-50 ONE" width={70} height={48} />
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
        {next && (
          <button className={`next-pill${ringing ? " ringing" : ""}`} onClick={() => setClockOpen(true)} title="Your day" aria-live="polite">
            {next}
          </button>
        )}
        {live && (
          <nav className="dash-switch" aria-label="Dashboard version">
            <span aria-current="page">ONE Brain</span>
            <a href={CLASSIC_DASHBOARD_URL}>Classic</a>
          </nav>
        )}
        {live ? (
          <form className="me-form" method="post" action="/auth/signout">
            <button type="button" className="me me-btn" onClick={() => goTo(movePageId("/profile"))} title="My Profile" aria-label={`My Profile, ${agent.label}`}>
              {agent.photo ? <img className="me-pic" src={agent.photo} alt="" /> : agent.initials}
            </button>
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
                  aria-label={nodeLabel(v.node, v.role, v.hasChildren, needs.get(v.node.id))}
                  aria-current={v.role === "focus" ? "true" : undefined}
                  onClick={() => clickNode(v.node.id)}
                  onPointerEnter={() => sceneRef.current?.setHover(v.node.id)}
                  onPointerLeave={() => sceneRef.current?.setHover(null)}
                  onFocus={() => sceneRef.current?.setHover(v.node.id)}
                  onBlur={() => sceneRef.current?.setHover(null)}
                />
              ))}
            </div>

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
            <nav className="rail pop" key={`rail-${ask ? `ask-${ask.question}` : state.focusId}`} aria-label={ask ? "Pulse's answer" : `Inside ${focus.label}`}>
              <p className="rail-head">{tour ? "Morning Pulse" : ask ? "Pulse" : focus.type === "core" ? "Your business" : focus.label}</p>
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
              {!ask && !tour && (vs.hiddenChildren > 0 || childrenOf(ix, focus.id).length > railCount) ? (
                <p className="rail-more">+{childrenOf(ix, focus.id).length - railCount} more in the panel</p>
              ) : null}
            </nav>
          )}

          <form
            className={`ask ${askOpen ? "open" : ""}`}
            role="search"
            aria-label="Ask Pulse"
            onSubmit={(e) => {
              e.preventDefault();
              askOne(askText);
            }}
          >
            <div className="ask-field">
              <PulseMark beating={asking} />
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
                placeholder="Ask Pulse about your business…"
                aria-label="Ask Pulse a question about your business"
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
            {asking && <p className="ask-status" role="status">Pulse is thinking…</p>}
            {askErr && <p className="ask-status err" role="alert">{askErr}</p>}
          </form>

          {tour && (() => {
            const id = tour.step > 0 ? tour.ids[tour.step - 1] : null;
            const n = id ? ix.byId.get(id) : null;
            return (
              <div className="tour-card pop" key={`tour-${tour.step}`} role="status" aria-live="polite">
                <p className="tour-kicker">
                  Morning Pulse{n ? ` · ${tour.step} of ${tour.ids.length}` : ""}
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
            {googleNote && (
              <div className="signal-card pop" key="google-note">
                <i style={{ background: googleNote.ok ? "#3fbf7f" : "#e4574a" }} aria-hidden="true" />
                <div>
                  <p className="signal-kicker" style={{ color: hex(PRODUCT_COLOR.move) }}>{googleNote.kicker}</p>
                  <p className="signal-what">{googleNote.what}</p>
                </div>
                <button className="signal-x" onClick={() => setGoogleNote(null)} aria-label="Dismiss">
                  ×
                </button>
              </div>
            )}
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
            <button onClick={goBack} disabled={!ask && focus.id === graph.rootId} aria-label="Back">
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
            <button onClick={() => setGuide(true)} aria-label="What everything means" title="What everything means">
              ?
            </button>
          </div>
        </section>

        {ask ? (
          <aside ref={drawerRef} key={`ask-${ask.question}`} className="drawer pop" aria-label="Pulse's answer" aria-live="polite">
            <div className="d-head">
              <span className="chip" style={{ color: hex(PRODUCT_COLOR.one), borderColor: hex(PRODUCT_COLOR.one) }}>
                <PulseMark label={false} /> Ask Pulse
              </span>
            </div>
            <p className="ask-q">{ask.question}</p>
            <p className="ask-a">{ask.answer}</p>
            {ask.source === "ai" && <p className="d-src">Answered from your business, just now</p>}
            {ask.results.length > 0 && (
              <div className="d-recs">
                <h2>Pulse found</h2>
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
                          <button className="link" onClick={() => goToNode(n.id)}>
                            {n.contactId ? `Open ${cleanName(n.label)}` : `Go to ${cleanName(n.label)}`} →
                          </button>
                        </div>
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
              {/* ONE YOU is the desktop orb and its groups; a single task or person still says where it came from */}
              {focus.product === "go" && ["product", "feature", "category", "goal"].includes(focus.type) ? "ONE YOU" : productName(focus.product)}
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
              {note.source === "ai" && <p className="d-src">Pulse wrote this for you this morning</p>}
            </>
          ) : (
            focus.summary && !isMoveGroup(focus.id) && <p className="d-sum">{focus.summary}</p>
          )}

          {isMoveGroup(focus.id) && !ask && <GroupPanel node={focus} ix={ix} today={localDay(new Date())} goTo={goTo} />}

          {(focus.contactId || focus.taskId) && focus.product === "move" && !focus.locked && !ask && (
            <PersonPanel
              key={focus.id}
              contactId={focus.contactId}
              taskId={focus.taskId}
              title={focus.label}
              onChanged={refreshLive}
              openContacts={() => goTo(movePageId("/contacts"))}
            />
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

          {focus.id === REVIEW_NODE && theReview && !tour && (
            <button className="pi-film pm-open" onClick={() => setReviewOpen(true)}>
              <span className="pi-play" aria-hidden="true">☰</span>
              <span>
                <b>Open Weekly Review</b>
                <span>Your score, VIP touches, who you haven&apos;t reached, commitments, goals, and three things for next week.</span>
              </span>
            </button>
          )}

          {focus.id === PULSE_COACH_NODE && thePulseRead && !tour && (
            <button className="pi-film pm-open" onClick={() => setPcOpen(true)}>
              <span className="pi-play" aria-hidden="true">♥</span>
              <span>
                <b>Open Pulse Coach</b>
                <span>Your week read by Pulse: what&apos;s rising, what&apos;s slipping, your best day, your habits, and one focus.</span>
              </span>
            </button>
          )}

          {focus.id === POWER_NODE && !tour && (
            <button className="pi-film pm-open" onClick={() => setPowerOpen(true)}>
              <span className="pi-play" aria-hidden="true">☎</span>
              <span>
                <b>Start a Power Hour</b>
                <span>Your top calls lined up with Call Prep, a countdown, then what got done.</span>
              </span>
            </button>
          )}

          {focus.id === REVIEW_CALLS_NODE && rcAgents && !tour && (
            <button className="pi-film pm-open" onClick={() => setRcOpen(true)}>
              <span className="pi-play" aria-hidden="true">✓</span>
              <span>
                <b>Open Review calls</b>
                <span>The call guide for the done-for-you site and SOI setup. Saved on the agent's record.</span>
              </span>
            </button>
          )}
          {focus.id === TEAM_NODE && team && !tour && (
            <button className="pi-film pm-open" onClick={() => setTeamOpen(true)}>
              <span className="pi-play" aria-hidden="true">#</span>
              <span>
                <b>Open the Team screen</b>
                <span>The week's leaderboard. Show it full screen on the office TV.</span>
              </span>
            </button>
          )}
          {focus.id === WINS_NODE && wins && !tour && (
            <button className="pi-film pm-open" onClick={() => setWinsOpen(true)}>
              <span className="pi-play" aria-hidden="true">★</span>
              <span>
                <b>Open your Wins</b>
                <span>Every closing, referral, five-star review, week at 100, badge and goal reached, in one place.</span>
              </span>
            </button>
          )}
          {focus.id === PARTNERS_NODE && partners && !tour && (
            <button className="pi-film pm-open" onClick={() => setPartnersOpen(true)}>
              <span className="pi-play" aria-hidden="true">⇄</span>
              <span>
                <b>Open your Partners</b>
                <span>The agents you chose to keep each other honest: their weekly score, and a one-tap nudge.</span>
              </span>
            </button>
          )}
          {focus.id === HABITS_NODE && theHabits.length > 0 && !tour && (
            <button className="pi-film pm-open" onClick={openHabits}>
              <span className="pi-play" aria-hidden="true">♥</span>
              <span>
                <b>Open your Habits</b>
                <span>Your morning habits as one ring. Tick them here and they tick on your Daily Tracker.</span>
              </span>
            </button>
          )}
          {focus.id === REFERRALS_NODE && refs && !tour && (
            <button className="pi-film pm-open" onClick={() => setRefsOpen(true)}>
              <span className="pi-play" aria-hidden="true">★</span>
              <span>
                <b>Open the Referral Scoreboard</b>
                <span>Who sent you business, who is likely next, and how many of your VIPs refer.</span>
              </span>
            </button>
          )}
          {focus.id === INCOME_NODE && theIncome && !tour && (
            <button className="pi-film pm-open" onClick={() => setIncomeOpen(true)}>
              <span className="pi-play" aria-hidden="true">$</span>
              <span>
                <b>Open the Income Map</b>
                <span>Your income goal worked back to closings, referrals, conversations and touches a week.</span>
              </span>
            </button>
          )}

          {focus.id === COACH_NODE && !tour && (
            <button className="pi-film pm-open" onClick={() => setCoachOpen(true)}>
              <span className="pi-play" aria-hidden="true">☰</span>
              <span>
                <b>Open coaching</b>
                <span>Each agent you coach: their week, their check-ins and how many they keep.</span>
              </span>
            </button>
          )}

          {(focus.type === "core" || focus.id === "go") && !tour && (
            <button className="pi-film pm-open" onClick={() => setClockOpen(true)}>
              <span className="pi-play" aria-hidden="true">☰</span>
              <span>
                <b>{theDay.approvedAt ? "Your day" : "Plan my day"}</b>
                <span>{theDay.approvedAt ? next ?? "Your day is planned." : "Pulse planned today round your calendar. Look it over and tap Looks good."}</span>
              </span>
            </button>
          )}

          {focus.type === "core" && slots.length > 0 && (
            <div className="day">
              <h2>{planned?.items.length ? "Your plan" : "Your day"}</h2>
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
                      onClick={() => tickDay(x.id, !x.done)}
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
              <button className="link" onClick={() => setOneFilm(true)}>
                ▶ Watch ONE Work
              </button>
            </div>
          )}

          {focus.locked && (
            <a className="btn" href={UPGRADE_URL}>
              Add with Complete
            </a>
          )}

          {focus.stats?.length ? <Stats stats={focus.stats} color={hex(PRODUCT_COLOR[focus.product])} ticked={(l) => ticked.has(`${focus.id}|${l}`)} /> : null}

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

          {moveQuiet && focus.recommendations?.length ? (
            <div className="d-why">
              <h2>Why it's here</h2>
              <ul>
                {[...new Set(focus.recommendations.flatMap((r) => r.why))].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}


          {focus.recommendations && !moveQuiet && (
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
                        {target && (
                          <button className="link" onClick={() => goToNode(target.id)}>
                            {target.contactId ? "Open" : "Go to"} {target.label.replace(/^(Call|Text|Face-to-face:|Send note to)\s*/i, "")} →
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {kids.length > 0 && !isMoveGroup(focus.id) && (
            <div className={`d-list inside ${railCount > childrenOf(ix, focus.id).length - 1 && !moveQuiet ? "" : "keep"}`}>
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
        {pagePanel && (
          <section className={`page-panel pop${vipNative ? " page-panel-native" : ""}`} key={pagePanel.path} aria-label={`${pagePanel.label} in ONE MOVE`}>
            {!vipNative && (
            <header className="page-panel-bar">
              <p className="page-panel-title">
                <span style={{ color: hex(PRODUCT_COLOR.move) }}>ONE MOVE</span> · {pagePanel.label}
              </p>
              {nativeKind && (
                <button className="page-panel-classic" onClick={() => setVipClassic((v) => !v)}>
                  {vipClassic ? "ONE Brain view" : "Classic page"}
                </button>
              )}
              <button className="page-panel-close" onClick={() => goTo(focus.parentId ?? "move")} aria-label={`Close ${pagePanel.label}`}>×</button>
            </header>
            )}
            <div ref={frameBoxRef} className="page-panel-body">
              {vipNative && nativeKind === "audit" ? (
                <TouchAudit
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                  celebrate={graph.celebrate}
                  due={ix.byId.get("move-audit")?.dueContacts}
                />
              ) : vipNative && nativeKind === "contacts" ? (
                <Contacts
                  openId={contactOpen}
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                  celebrate={graph.celebrate}
                />
              ) : vipNative && nativeKind === "hwc" ? (
                <HotWarmCold
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                  celebrate={graph.celebrate}
                />
              ) : vipNative && nativeKind === "profile" ? (
                <MyProfile
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                />
              ) : vipNative && nativeKind === "rolodex" ? (
                <Rolodex
                  onUnavailable={vipUnavailable}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                />
              ) : vipNative && nativeKind === "weekly" ? (
                <WeeklyTracker
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                />
              ) : vipNative && nativeKind === "daily" ? (
                <DailyTracker
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                />
              ) : vipNative ? (
                <VipRings
                  today={localDay(new Date())}
                  onUnavailable={vipUnavailable}
                  onChanged={refreshLive}
                  onBack={() => goTo(focus.parentId ?? "move")}
                  onClassic={() => setVipClassic(true)}
                  celebrate={graph.celebrate}
                />
              ) : (
              <>
              {frameReady !== pagePanel.path && (
                <div className="page-panel-veil" role="status">
                  <span className="page-panel-spin" aria-hidden="true" />
                  Opening {pagePanel.label}…
                </div>
              )}
              <iframe
                className={`page-panel-frame ${frameReady === pagePanel.path ? "ready" : ""}`}
                src={moveEmbedHref(pagePanel.path)}
                title={`${pagePanel.label} in ONE MOVE`}
                onLoad={() => {
                  // ONE MOVE switches to the Brain look as it starts; give it a
                  // beat so the old colours never show (Parry, 3 Oct).
                  const path = pagePanel.path;
                  setTimeout(() => setFrameReady(path), 120);
                }}
                style={
                  frameScale < 1
                    ? { width: `${100 / frameScale}%`, height: `${100 / frameScale}%`, transform: `scale(${frameScale})`, transformOrigin: "0 0" }
                    : undefined
                }
              />
              </>
              )}
            </div>
          </section>
        )}
      </div>
      {intro && (
        <PulseIntro
          pkg={pkg}
          total={needs.get(graph.rootId)}
          onClose={() => setIntro(false)}
          onAsk={() => {
            setIntro(false);
            askInputRef.current?.focus();
          }}
          onMorning={() => {
            setIntro(false);
            startTour();
          }}
          onGuide={() => {
            setIntro(false);
            setGuide(true);
          }}
        />
      )}
      {oneFilm && <SignalsFilm film={ONE_FILM} onClose={() => setOneFilm(false)} />}
      {reviewOpen && theReview ? <ReviewView review={theReview} week={weekScore} demo={!live} onClose={() => setReviewOpen(false)} /> : null}
      {pcOpen && thePulseRead ? <PulseCoachView read={thePulseRead} demo={!live} onClose={() => setPcOpen(false)} /> : null}
      {powerOpen ? (
        <PowerHourView calls={calls} session={session} live={live} onSession={savePower} onTick={(ref, on) => tickDay(`day:${ref}`, on)} onClose={() => setPowerOpen(false)} />
      ) : null}
      {incomeOpen && theIncome ? <IncomeMapView map={theIncome} assume={assume} demo={!live} onAssume={saveAssume} onClose={() => setIncomeOpen(false)} /> : null}
      {coachOpen && coached?.length && !agentRead ? <CoachView agents={coached} hour={denverHour()} demo={!live} onClose={() => setCoachOpen(false)} onPulse={readAgent} /> : null}
      {rcOpen && rcAgents ? <ReviewCallsView agents={rcAgents} demo={!live} onClose={() => setRcOpen(false)} onSearch={loadRcAgents} /> : null}
      {teamOpen && team ? <TeamView team={team} demo={!live} scope={teamScope} onScope={live ? setTeamScope : undefined} onClose={() => setTeamOpen(false)} /> : null}
      {winsOpen && wins ? (
        <WinsView
          data={wins}
          fresh={freshWins}
          today={todayIn()}
          demo={!live}
          onClose={closeWins}
          onContact={(id) => {
            const page = movePageId("/contacts");
            if (!ix.byId.has(page)) return;
            closeWins();
            setContactOpen({ id, k: Date.now() });
            goTo(page);
          }}
        />
      ) : null}
      {partnersOpen && partners ? <PartnersView state={partners} me={weekScore} today={todayIn()} demo={!live} onClose={() => setPartnersOpen(false)} onAct={partnerAct} /> : null}
      {habitsOpen && theHabits.length ? <HabitsView habits={theHabits} demo={!live} onClose={() => setHabitsOpen(false)} onTick={tickHabit} /> : null}
      {refsOpen && refs ? <ReferralsView data={refs} today={todayIn()} demo={!live} onClose={() => setRefsOpen(false)} onAsk={askReferral} /> : null}
      {agentRead ? <PulseCoachView read={agentRead.read} who={agentRead.who} demo={!live} onClose={() => setAgentRead(null)} /> : null}
      {cmOpen && commitments && (
        <CommitmentsView initial={commitments} live={live} hour={denverHour()} onClose={() => setCmOpen(false)} onChanged={setCommitments} />
      )}
      {clockOpen && (
        <DayClock
          day={theDay}
          live={live}
          tellText={tellText}
          dated={graph.dated}
          vipsNoVideo={roster ? roster.vip50.filter((p) => !p.month?.video_text).length : undefined}
          commitments={commitments}
          onClose={() => {
            setClockOpen(false);
            setTellText(undefined);
          }}
          onTick={(refs, on) => refs.forEach((r) => tickDay(`day:${r}`, on))}
          onClassic={() => {
            setClockOpen(false);
            setPlanOpen(true);
          }}
        />
      )}
      {planOpen && (
        <PlanMyDay
          today={graph.today ?? []}
          week={graph.week}
          live={live}
          onClose={() => setPlanOpen(false)}
          onGo={(id) => {
            setPlanOpen(false);
            goTo(id);
          }}
          onSaved={setPlanned}
          onTick={(ref, on) => tickDay(`day:${ref}`, on)}
        />
      )}
      {guide && (
        <SignalsFilm
          onClose={() => setGuide(false)}
          onMeet={() => {
            setGuide(false);
            setIntro(true);
          }}
        />
      )}
    </div>
  );
}

function roleRank(r: string) {
  return { focus: 0, child: 1, related: 2, ancestor: 3, sibling: 4 }[r] ?? 5;
}

function productName(p: GraphNode["product"]) {
  return { one: "ONE", go: "ONE GO", move: "ONE MOVE", marquee: "Marquee", showly: "Showly", open: "ONE Open" }[p];
}

function nodeLabel(n: GraphNode, role: string, hasChildren: boolean, need?: Need) {
  const parts = [n.label];
  if (n.secondaryLabel) parts.push(n.secondaryLabel);
  if (n.type === "core") {
    if (role === "focus") parts.push("about Pulse");
  } else if (need && !n.locked) parts.push(needWords(need, !hasChildren));
  else if (n.status && !n.locked) parts.push(STATUS[n.status].label);
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
