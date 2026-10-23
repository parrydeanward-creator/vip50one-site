"use client";

import "@/app/referral-network.css";
import { useEffect, useMemo, useRef, useState } from "react";
import LogReferral from "./LogReferral.tsx";
import { listUrl, readPage, type PersonItem } from "@/lib/people.ts";
import { THANK_KINDS, THANK_TITLE, yearCount, type ReadyAsk, type Referrals, type ThankKind, type Warming } from "@/lib/referrals.ts";
import { faceUrl, readRoster, vipsUrl, type VipRoster } from "@/lib/vips.ts";
import {
  STAGES, STAGE_LABEL, askDraft, closestLine, demoAgents, demoNetworkItems, firstOf, gaugeOf, initials, joinNames, movesFor, netTitle,
  networkActUrl, networkAgentsUrl, networkListUrl, networkListedUrl, owedRows, readNetworkItems, shortDay, thankAsk, thankDraft, tiles,
  tradePartners, treeOf, warmingRows, type Branch, type Move, type NetItem, type OwedRow,
} from "@/lib/referralNetwork.ts";

// The Referral Network page in ONE Brain (VIP-SUMMARY §3aq; Parry, 22 Oct: "yes on referral network", prototype in
// research/mockups/referrals). Hero: the goal gauge and the referral tree. Then the three lanes (thank-you owed, ready
// to ask, warming up) and agent to agent. Only the agent's own records when signed in; the example agent sees
// examples. Every name opens that contact ready to act; nothing is sent to anyone by ONE (an ask or a thank-you is the
// agent's own, in their own words).

type Res = { ok: boolean; words: string };
type Props = {
  data: Referrals | null;
  live: boolean;
  today: string;
  onAsk: (contactId: string) => Promise<Res>;
  onThanked: (contactId: string, kind: ThankKind) => Promise<Res>;
  onLogged: () => void;
  onChanged?: () => void;
  onOpenPerson: (contactId: string) => void;
  onRefer: (contactId: string) => void;
  onBack: () => void;
  onClassic: () => void;
};

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const DONE_WORDS: Record<ThankKind, string> = { call: "called", note: "sent a note", text: "texted", email: "emailed", gift: "sent a gift" };

function Avatar({ name, tone, photo }: { name: string; tone: "red" | "gold" | "green" | "teal" | "blue"; photo?: string | null }) {
  const src = faceUrl(photo);
  return (
    <span className={`rn-av rn-${tone}`} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}

function GoalGauge({ data, today, onOpen }: { data: Referrals; today: string; onOpen: () => void }) {
  const g = gaugeOf(data, today);
  const cx = 150, cy = 165, r = 120;
  const pt = (f: number) => [cx + r * Math.cos(Math.PI * (1 - f)), cy - r * Math.sin(Math.PI * (1 - f))] as const;
  const arc = (f0: number, f1: number, stroke: string, key: string) => {
    const [a, b] = pt(f0), [x, y] = pt(Math.max(f1, f0 + 0.005));
    return <path key={key} d={`M${a} ${b} A${r} ${r} 0 0 1 ${x} ${y}`} fill="none" stroke={stroke} strokeWidth={22} strokeLinecap="round" />;
  };
  const mark = g.pace != null ? pt(g.pace) : null;
  const n = yearCount(data);
  return (
    <button type="button" className="rn-gauge" onClick={onOpen} aria-label={`${n} referrals this goal year${g.goal ? ` of ${g.goal}` : ""}. Show who sent them.`}>
      <svg viewBox="0 0 300 220" role="img" aria-hidden="true">
        {arc(0, 1, "rgba(255,255,255,.08)", "track")}
        {g.pace != null ? arc(0, g.pace, "rgba(255,255,255,.18)", "pace") : null}
        {g.share != null && g.share > 0 ? arc(0, g.share, g.share >= 1 ? "#2fbf71" : "#f5c542", "done") : null}
        {mark ? <circle cx={mark[0]} cy={mark[1]} r={7} fill="#fff" /> : null}
        <text x={cx} y={cy - 28} textAnchor="middle" className="rn-g-num">{n}</text>
        <text x={cx} y={cy - 4} textAnchor="middle" className="rn-g-sub">
          {g.goal ? `of ${g.goal}${g.paceCount != null ? ` · on pace you'd be at ${g.paceCount}` : ""}` : "this goal year"}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" className="rn-g-line">{g.line ? g.line.toUpperCase() : "SET A REFERRALS GOAL IN GOALS"}</text>
      </svg>
    </button>
  );
}

function Tree({ branches, pick, onPick }: { branches: Branch[]; pick: string | null; onPick: (b: Branch, leaf?: number) => void }) {
  const n = branches.length;
  const W = 900, cx = 450, cy = 150;
  // an odd count leaves the middle column to YOU, so no branch runs through it
  const slots = n % 2 ? n + 1 : n;
  const xOf = (i: number) => (W * ((n % 2 && i >= Math.floor(slots / 2) ? i + 1 : i) + 0.5)) / slots;
  const hue = (b: Branch) => (b.kind === "agent" ? "#2ec4b6" : "#f5c542");
  const leafHue = (b: Branch) => (b.leaves[0]?.closed ? "#2fbf71" : b.kind === "agent" ? "#5fb3f0" : "#2fbf71");
  const key = (e: React.KeyboardEvent, go: () => void) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    go();
  };
  const clip = (s: string, k: number) => (s.length > k ? `${s.slice(0, k - 1)}…` : s);
  return (
    <>
      <svg className="rn-tree-svg" viewBox="0 0 900 300" role="group" aria-label="Your referral tree">
        {branches.map((b, i) => {
          const x = xOf(i);
          const leaf = b.leaves[0];
          return (
            <g key={b.id}>
              <path d={`M${cx} ${cy} C ${cx} ${(cy + 60) / 2}, ${x} ${cy}, ${x} 86`} stroke={hue(b)} strokeOpacity=".5" strokeWidth={2} fill="none" />
              {leaf ? <path d={`M${x} 86 L ${x} 226`} stroke={leafHue(b)} strokeOpacity=".55" strokeWidth={2} strokeDasharray="4 5" fill="none" /> : null}
              <g className={`rn-node${pick === b.id ? " on" : ""}`} role="button" tabIndex={0} aria-label={b.info} onClick={() => onPick(b)} onKeyDown={(e) => key(e, () => onPick(b))}>
                <circle cx={x} cy={60} r={26} fill="#1b2750" stroke={hue(b)} strokeWidth={3} />
                <text x={x} y={65} textAnchor="middle" className="rn-t-ini">{initials(b.name)}</text>
                <text x={x} y={26} textAnchor="middle" className="rn-t-name">{clip(b.kind === "agent" ? `${b.name} (agent)` : b.name, 22)}</text>
              </g>
              {leaf ? (
                <g className={`rn-node${pick === `${b.id}#0` ? " on" : ""}`} role="button" tabIndex={0} aria-label={`${leaf.name}${leaf.line ? `: ${leaf.line}` : ""}. Sent by ${b.name}.`} onClick={() => onPick(b, 0)} onKeyDown={(e) => key(e, () => onPick(b, 0))}>
                  <circle cx={x} cy={250} r={22} fill="#0a1230" stroke={leafHue(b)} strokeWidth={2.5} />
                  <text x={x} y={254} textAnchor="middle" className="rn-t-ini sm">{initials(leaf.name)}</text>
                  <text x={x} y={290} textAnchor="middle" className="rn-t-name">{clip(`${leaf.name}${leaf.line ? ` · ${leaf.line}` : ""}${b.leaves.length > 1 ? ` +${b.leaves.length - 1}` : ""}`, 24)}</text>
                </g>
              ) : (
                <text x={x} y={104} textAnchor="middle" className="rn-t-name">{`sent ${b.total}`}</text>
              )}
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={30} fill="#0a1230" stroke="#f5c542" strokeWidth={3} />
        <text x={cx} y={cy + 8} textAnchor="middle" className="rn-t-you">YOU</text>
      </svg>
      <ul className="rn-tree-list" aria-label="Your referral tree">
        {branches.map((b) => (
          <li key={b.id}>
            <button type="button" className={`rn-tl-who${pick === b.id ? " on" : ""}`} onClick={() => onPick(b)}>
              <Avatar name={b.name} tone={b.kind === "agent" ? "teal" : "gold"} />
              <span>
                <b>{b.kind === "agent" ? `${b.name} (agent)` : b.name}</b>
                <small>{b.leaves.length ? `sent you ${joinNames(b.leaves.map((l) => l.name))}` : `sent you ${b.total}`}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function ReferralNetwork({ data, live, today, onAsk, onThanked, onLogged, onChanged, onOpenPerson, onRefer, onBack, onClassic }: Props) {
  const demo = !live;
  const [note, setNote] = useState<string | null>(null);
  const toast = (t: string) => setNote(t);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 3600);
    return () => clearTimeout(t);
  }, [note]);

  // agent to agent: the full lists (live), or the example agent's
  const [net, setNet] = useState<{ sent: NetItem[]; received: NetItem[] } | null>(() => (live ? null : demoNetworkItems(today)));
  const [netErr, setNetErr] = useState(false);
  const loadNet = () => {
    if (!live) return;
    fetch(networkListUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const n = readNetworkItems(j);
        setNet(n);
        setNetErr(!n);
      })
      .catch(() => setNetErr(true));
  };
  useEffect(loadNet, [live]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Receive referrals from ONE agents" (§3af.1), the same switch as My Profile and Classic
  const [listed, setListed] = useState<boolean | null>(() => (live ? null : true));
  const [listBusy, setListBusy] = useState(false);
  useEffect(() => {
    if (!live) return;
    fetch(networkListedUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setListed(j && typeof j.listed === "boolean" ? j.listed : null))
      .catch(() => {});
  }, [live]);
  const flipListed = async () => {
    if (listed == null || listBusy) return;
    const next = !listed;
    if (!live) return setListed(next);
    setListBusy(true);
    setListed(next);
    try {
      const r = await fetch(networkListedUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listed: next }) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error();
      setListed(j.listed === true);
    } catch {
      setListed(!next);
      toast("That didn't save. Nothing was changed.");
    } finally {
      setListBusy(false);
    }
  };

  // Warming up falls back to this month's VIP roster until ONE MOVE sends `warming`
  const [roster, setRoster] = useState<VipRoster | null>(null);
  const needRoster = live && !!data && data.warming == null;
  useEffect(() => {
    if (!needRoster) return;
    fetch(vipsUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setRoster(readRoster(j)))
      .catch(() => {});
  }, [needRoster]);

  // the lanes' own state: a done thank-you stays with its green line; asks and thanks count at once
  const [thanked, setThanked] = useState<Record<string, { row: OwedRow; how: ThankKind }>>({});
  const [thankBusy, setThankBusy] = useState<string | null>(null);
  const [asked, setAsked] = useState<Record<string, string | "busy">>({});
  const [plusThanks, setPlusThanks] = useState(0);
  const [plusAsks, setPlusAsks] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<{ id: string; info: string; open: { id: string; name: string } | null } | null>(null);
  const [peek, setPeek] = useState<"year" | "gci" | "thanks" | "asks" | null>(null);
  const [tab, setTab] = useState<"in" | "out">("in");
  const lanesRef = useRef<HTMLDivElement>(null);

  const owed = useMemo(() => (data ? owedRows(data, today).filter((x) => !thanked[x.id]) : []), [data, today, thanked]);
  const owedAll = [...owed, ...Object.values(thanked).map((t) => t.row)];
  const ready: ReadyAsk[] = data?.readyToAsk ?? (data ? data.candidates.filter((c) => c.why !== "fully_touched").slice(0, 5).map((c) => ({ id: c.id, firstName: firstOf(c.name), why: c.words })) : []);
  const warm = data ? warmingRows(data, roster) : { rows: [] as Warming[], from: null };
  const branches = useMemo(() => (data ? treeOf(data, net) : []), [data, net]);

  // Pulse drafts each thank-you in the agent's voice (live; the first three); the plain draft shows until then
  const owedKey = owed.slice(0, 3).map((x) => x.id).join(",");
  useEffect(() => {
    if (!live) return;
    for (const x of owed.slice(0, 3)) {
      if (drafts[x.id]) continue;
      const names = x.clients.map((c) => c.name);
      fetch("/api/draft", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "text", facts: { first: x.first, lastTalk: null, family: [], favourites: [], comingUp: [], openItems: [] }, ask: thankAsk(names) }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          // only Pulse's own draft; the plain-rules fallback writes a check-in, so the thank-you line stays
          if (d && d.source === "pulse" && typeof d.body === "string" && d.body.trim() && !(Array.isArray(d.flags) && d.flags.length)) setDrafts((m) => ({ ...m, [x.id]: d.body.trim() }));
        })
        .catch(() => {});
    }
  }, [live, owedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const person = (id: string | null, name: string) => {
    if (!id) return;
    if (demo) return toast(`Example agent: signed in, this opens ${firstOf(name)}'s contact, ready to touch them.`);
    onOpenPerson(id);
  };

  const logThank = async (x: OwedRow, how: ThankKind) => {
    if (thankBusy) return;
    if (demo) {
      setThanked((t) => ({ ...t, [x.id]: { row: x, how } }));
      setPlusThanks((n) => n + 1);
      return toast(`Example agent: ${x.first}'s thank-you would be logged as a touch. Nothing is saved.`);
    }
    setThankBusy(x.id);
    const res = await onThanked(x.id, how);
    setThankBusy(null);
    if (res.ok) {
      setThanked((t) => ({ ...t, [x.id]: { row: x, how } }));
      setPlusThanks((n) => n + 1);
      onChanged?.();
    }
    toast(res.ok ? `${x.first}: ${res.words}` : res.words);
  };
  const copyDraft = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied. Send it from your own phone, then tap how you thanked them.");
    } catch {
      toast("Select the words and copy them; then tap how you thanked them.");
    }
  };
  const ask = async (x: ReadyAsk) => {
    if (asked[x.id]) return;
    if (demo) {
      setAsked((a) => ({ ...a, [x.id]: `Example agent: this would add "Ask ${x.firstName} for a referral" to today's tasks.` }));
      return setPlusAsks((n) => n + 1);
    }
    setAsked((a) => ({ ...a, [x.id]: "busy" }));
    const res = await onAsk(x.id);
    setAsked((a) => {
      const n = { ...a };
      if (res.ok) n[x.id] = res.words;
      else delete n[x.id];
      return n;
    });
    if (res.ok) {
      setPlusAsks((n) => n + 1);
      onChanged?.();
    } else toast(res.words);
  };

  // agent to agent: the same moves as ONE MOVE's page, through its route
  const [actBusy, setActBusy] = useState<string | null>(null);
  const [extra, setExtra] = useState<Record<string, string>>({});
  const act = async (x: NetItem, m: Move) => {
    if (actBusy) return;
    const body = { ...m.body, ...(m.needsReason && extra[x.id] ? { reason: extra[x.id] } : {}), ...(m.needsDate && extra[`d:${x.id}`] ? { closed_on: extra[`d:${x.id}`] } : {}) };
    if (demo) {
      const next = (m.body.action === "accept" ? "accepted" : m.body.action === "status" ? String(m.body.status) : m.body.action === "decline" ? "declined" : "cancelled") as string;
      setNet((n) => {
        if (!n) return n;
        const upd = (v: NetItem) => (v.id === x.id ? { ...v, status: next, statusWords: next.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), stage: (STAGES as readonly string[]).includes(next) ? (next as NetItem["stage"]) : v.stage } : v);
        return { sent: n.sent.map(upd), received: n.received.map(upd) };
      });
      return toast(`Example agent: ${x.client} would be marked ${next.replace(/_/g, " ")}. Nothing is saved.`);
    }
    setActBusy(x.id);
    try {
      const r = await fetch(networkActUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) toast(j.error ?? "Could not save just now.");
      else {
        toast(`${x.client}: saved.`);
        onChanged?.();
      }
    } catch {
      toast("Could not save just now.");
    }
    setActBusy(null);
    loadNet();
  };

  // Refer a client to a ONE agent: pick the client, then ONE MOVE's refer form opens filled in for them
  const [refer, setRefer] = useState(false);
  const [rq, setRq] = useState("");
  const [rHits, setRHits] = useState<PersonItem[]>([]);
  useEffect(() => {
    if (!refer || demo || rq.trim().length < 2) return setRHits([]);
    const t = setTimeout(() => {
      fetch(listUrl({ q: rq, sort: "name", limit: 6 }), { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setRHits(readPage(j)?.items ?? []))
        .catch(() => setRHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [rq, refer, demo]);

  // Find an agent by area (§3af.1 agents: name, city, team only)
  const [aq, setAq] = useState("");
  const [agents, setAgents] = useState<{ name: string; where: string }[] | null>(null);
  const findAgents = async () => {
    const q = aq.trim();
    if (!q) return;
    if (demo) return setAgents(demoAgents.filter((a) => `${a.name} ${a.where}`.toLowerCase().includes(q.toLowerCase())));
    try {
      const r = await fetch(networkAgentsUrl(q), { credentials: "include", cache: "no-store" });
      const j = (await r.json().catch(() => null)) as { agents?: { name?: string; city?: string | null; state?: string | null; team?: string | null }[] } | null;
      setAgents((j?.agents ?? []).filter((a) => typeof a.name === "string").map((a) => ({ name: a.name!, where: [a.city, a.state].filter(Boolean).join(", ") + (a.team ? ` · ${a.team}` : "") })));
    } catch {
      setAgents([]);
    }
  };

  if (!data) {
    return (
      <div className="page-panel-veil" role="status">
        <span className="page-panel-spin" aria-hidden="true" />
        Opening your Referral Network…
        <button className="vr-btn" onClick={onClassic}>Open the Classic page</button>
      </div>
    );
  }

  const show = tiles(data);
  const closedRefs = data.recent.filter((x) => x.closed);
  const yearPeople = data.referrers.filter((x) => x.thisYear > 0);
  const md = (d: string | null) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "");
  const monthRows = (l: { id: string; name: string; at: string | null; how: string | null }[] | null | undefined, verb: string) => (l ?? []).map((x) => ({ id: x.id.includes(":") ? null : x.id, name: x.name, line: `${verb}${x.how ? ` (${x.how})` : ""} ${md(x.at)}`.trim() }));
  const closedLine = (x: { value: number | null }) => `closed${x.value ? ` at ${money(x.value)}` : ""}`;
  const peekRows: { id: string | null; name: string; line: string }[] =
    peek === "year" ? yearPeople.map((p) => ({ id: p.id, name: p.name, line: `${p.thisYear} this goal year` }))
    : peek === "thanks" ? monthRows(data.thankedThisMonth, "thanked")
    : peek === "asks" ? monthRows(data.askedThisMonth, "asked")
    : peek === "gci" && data.gciClosings ? data.gciClosings.map((x) => ({ id: x.id, name: x.name, line: `${money(x.gci)} GCI ${md(x.closedOn)}`.trim() }))
    : closedRefs.map((x) => ({ id: x.client?.id ?? (x.id.includes(":") ? null : x.id), name: x.client?.name ?? x.name, line: closedLine(x) }));
  const peekLabel = peek === "year" ? "Who sent referrals this goal year" : peek === "thanks" ? "Who you thanked this month" : peek === "asks" ? "Who you asked this month" : peek === "gci" && data.gciClosings ? "Referral closings this goal year" : "Closed referrals";
  const peekEmpty = peek === "year" ? "Nobody yet this goal year. Log one with Log a referral." : peek === "thanks" ? "No thank-yous logged this month." : peek === "asks" ? "No asks logged this month." : peek === "gci" && data.gciClosings ? "No referral closings this goal year." : "No closed referrals in the last 180 days.";
  const tick = (b: Branch, leaf?: number) => {
    const l = leaf != null ? b.leaves[leaf] : null;
    const id = l ? `${b.id}#${leaf}` : b.id;
    setPick({
      id,
      info: l ? `${l.name}${l.line ? `: ${l.line}` : ""}. Sent by ${b.name}.` : `${b.info}${owed.some((o) => o.id === b.id) ? " Thank them in Thank-you owed below." : ""}`,
      open: l ? (l.contactId ? { id: l.contactId, name: l.name } : null) : b.contactId ? { id: b.contactId, name: b.name } : null,
    });
  };
  const toLanes = () => lanesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const list = tab === "in" ? net?.received ?? [] : net?.sent ?? [];
  const waiting = (net?.received ?? []).filter((x) => x.status === "sent").length;
  const partners = net ? tradePartners(net) : [];
  const closest = warm.rows[0];

  return (
    <div className="rn" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="rn-wrap">
        <header className="rn-head">
          <div>
            {/* a back button on every page (Parry, 23 Oct: "I need back buttons on every page") */}
            <button type="button" className="page-back" data-act="page-back" onClick={onBack} aria-label="Back">← Back</button>
            <span className="rn-tag">ONE MOVE · PEOPLE</span>
            <h1>Referral Network</h1>
            <p className="rn-sub">Who sends you business, who to thank, who to ask, and the agents you trade with.</p>
            {demo ? <p className="rn-demo">Example agent: these people are examples. Signed in, you see only your own.</p> : null}
          </div>
          <div className="rn-head-acts">
            <button type="button" className="rn-btn" aria-expanded={refer} onClick={() => setRefer((v) => !v)}>Refer a client to a ONE agent</button>
            <div className="rn-log"><LogReferral demo={demo} onLogged={() => { onLogged(); onChanged?.(); }} /></div>
            <button type="button" className="rn-btn ghost" onClick={onClassic}>Classic page</button>
          </div>
        </header>

        {refer ? (
          <section className="rn-card rn-refer" aria-label="Refer a client to a ONE agent">
            <label>
              <span>Which client are you referring?</span>
              <input autoFocus value={rq} placeholder="Search your contacts" onChange={(e) => setRq(e.target.value)} aria-label="Search your contacts" />
            </label>
            {demo ? <p className="rn-empty">Example agent: signed in, pick the client and ONE MOVE&apos;s refer form opens filled in for them.</p> : null}
            {rHits.length ? (
              <ul className="rn-hits">
                {rHits.map((p) => (
                  <li key={p.id}><button type="button" onClick={() => onRefer(p.id)}>{p.name}</button></li>
                ))}
              </ul>
            ) : null}
            <p className="rn-fine">Fees are agreed between the two agents and paid broker to broker at closing. ONE never collects or pays them.</p>
          </section>
        ) : null}

        <div className="rn-hero">
          <section className="rn-card" aria-label="Referrals this goal year">
            <p className="rn-sec">REFERRALS THIS GOAL YEAR</p>
            <GoalGauge data={data} today={today} onOpen={() => setPeek((p) => (p === "year" ? null : "year"))} />
            <div className="rn-stats">
              {show.includes("thanks") ? (
                <button type="button" className="rn-stat" onClick={() => (data.thankedThisMonth ? setPeek((p) => (p === "thanks" ? null : "thanks")) : toLanes())}><b>{(data.thanksThisMonth ?? 0) + plusThanks}</b><span>thank-yous this month</span></button>
              ) : null}
              {show.includes("asks") ? (
                <button type="button" className="rn-stat" onClick={() => (data.askedThisMonth ? setPeek((p) => (p === "asks" ? null : "asks")) : toLanes())}><b>{(data.asksThisMonth ?? 0) + plusAsks}</b><span>asks this month</span></button>
              ) : null}
              {show.includes("gci") ? (
                <button type="button" className="rn-stat" onClick={() => setPeek((p) => (p === "gci" ? null : "gci"))}><b>{money(data.gciYear ?? 0)}</b><span>referral GCI this year</span></button>
              ) : null}
              {!show.length ? (
                <button type="button" className="rn-stat" onClick={() => setPeek((p) => (p === "gci" ? null : "gci"))}><b>{data.referrers.reduce((n, x) => n + x.closed, 0)}</b><span>referrals closed</span></button>
              ) : null}
            </div>
            {peek ? (
              <ul className="rn-peek" aria-label={peekLabel}>
                {peekRows.map((p, i) => (
                  <li key={`${p.id ?? "x"}${i}`}>
                    <button type="button" className="rn-link" disabled={!p.id} onClick={() => person(p.id, p.name)}>{p.name}</button> <small>{p.line}</small>
                  </li>
                ))}
                {peekRows.length ? null : <li className="rn-empty">{peekEmpty}</li>}
              </ul>
            ) : null}
          </section>
          <section className="rn-card rn-tree" aria-label="Your referral tree">
            <div className="rn-row">
              <p className="rn-sec">YOUR REFERRAL TREE</p>
              <span className="rn-hint">Tap anyone to see what they sent you</span>
            </div>
            {branches.length ? (
              <Tree branches={branches} pick={pick?.id ?? null} onPick={tick} />
            ) : (
              <p className="rn-empty">Nobody has sent you a referral yet. When someone does, log it and they grow here.</p>
            )}
            {pick ? (
              <p className="rn-info" role="status">
                {pick.info}{" "}
                {pick.open ? <button type="button" className="rn-link" onClick={() => person(pick.open!.id, pick.open!.name)}>{`Open ${firstOf(pick.open.name)}`}</button> : null}
              </p>
            ) : null}
          </section>
        </div>

        <div className={`rn-lanes${warm.rows.length ? "" : " two"}`} ref={lanesRef}>
          <section className="rn-lane" aria-label="Thank-you owed">
            <h2><i className="rn-dot red" />Thank-you owed <small>{owed.length}</small></h2>
            {owedAll.length ? (
              owedAll.map((x) => {
                const done = thanked[x.id];
                const draft = drafts[x.id] ?? thankDraft(x.first, x.clients.map((c) => c.name));
                const sentLine = [`${x.sent} ${x.sent === 1 ? "referral" : "referrals"}`, x.lastAt ? `last ${shortDay(x.lastAt)}` : null, x.clients.length ? `sent you ${joinNames(x.clients.map((c) => c.name))}${x.clients[0].kind ? ` (${x.clients[0].kind})` : ""}` : null].filter(Boolean).join(" · ");
                return (
                  <article className="rn-pc" key={x.id}>
                    <div className="rn-top">
                      <Avatar name={x.name} tone={done ? "green" : "red"} />
                      <div>
                        <button type="button" className="rn-name" onClick={() => person(x.id, x.name)}>{x.name}</button>
                        <small>{sentLine}</small>
                      </div>
                    </div>
                    {done ? (
                      <p className="rn-done">{`Thanked: ${DONE_WORDS[done.how]}. Counts and Pulse updated.`}</p>
                    ) : (
                      <>
                        <blockquote className="rn-draft">&ldquo;{draft}&rdquo;</blockquote>
                        <p className="rn-fine">Pulse&apos;s draft. You send it yourself, from your own phone; ONE sends nothing.</p>
                        <div className="rn-acts" role="group" aria-label={`How you thanked ${x.first}`}>
                          <button type="button" className="rn-btn solid" onClick={() => void copyDraft(draft)}>Copy the draft</button>
                          {THANK_KINDS.map((k) => (
                            <button key={k.kind} type="button" className="rn-btn" disabled={thankBusy === x.id} onClick={() => void logThank(x, k.kind)} aria-label={`${x.first}: ${k.label}`} title={THANK_TITLE[k.kind]}>{k.label}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="rn-empty">Everyone who sent you business has been thanked.</p>
            )}
          </section>

          <section className="rn-lane" aria-label="Ready to ask">
            <h2><i className="rn-dot gold" />Ready to ask <small>{ready.filter((x) => !asked[x.id] || asked[x.id] === "busy").length}</small></h2>
            {ready.length ? (
              ready.map((x) => {
                const a = asked[x.id];
                return (
                  <article className="rn-pc" key={x.id}>
                    <div className="rn-top">
                      <Avatar name={x.firstName} tone={a && a !== "busy" ? "green" : "gold"} />
                      <div>
                        <button type="button" className="rn-name" onClick={() => person(x.id, x.firstName)}>{x.firstName}</button>
                        <small>{x.why}</small>
                      </div>
                    </div>
                    {a && a !== "busy" ? (
                      <p className="rn-done">{a}</p>
                    ) : (
                      <>
                        <blockquote className="rn-draft">&ldquo;{askDraft(x.firstName)}&rdquo;</blockquote>
                        <div className="rn-acts">
                          <button type="button" className="rn-btn solid" disabled={a === "busy"} onClick={() => void ask(x)} aria-label={`Add ask task for ${x.firstName}`}>{a === "busy" ? "Adding…" : "Add ask task"}</button>
                        </div>
                      </>
                    )}
                  </article>
                );
              })
            ) : (
              <article className="rn-pc">
                <p className="rn-empty">
                  No VIP-50 is fully touched and yet to refer right now.{closest ? <> <b>{closestLine(closest)}</b></> : null}
                </p>
                {closest ? (
                  <div className="rn-acts">
                    <button type="button" className="rn-btn solid" onClick={() => person(closest.id, closest.name)}>{`Touch ${firstOf(closest.name)} now`}</button>
                  </div>
                ) : null}
              </article>
            )}
          </section>

          {warm.rows.length ? (
            <section className="rn-lane" aria-label="Warming up">
              <h2><i className="rn-dot green" />Warming up <small>{warm.rows.length}</small></h2>
              {warm.rows.map((w) => (
                <article className="rn-pc" key={w.id}>
                  <button type="button" className="rn-top rn-open" onClick={() => person(w.id, w.name)} aria-label={`Open ${w.name}: ${w.done} of ${w.due} touches`}>
                    <Avatar name={w.name} tone="green" photo={w.photo} />
                    <span className="rn-grow">
                      <b>{w.name}</b>
                      <small>{`VIP-50 · ${w.done} of ${w.due} touches${warm.from === "roster" ? " this month" : ""}`}</small>
                      <span className="rn-bar"><i style={{ width: `${Math.round((w.done / Math.max(1, w.due)) * 100)}%` }} /></span>
                      {w.next ? <small className="rn-next">{w.next}</small> : null}
                    </span>
                  </button>
                </article>
              ))}
            </section>
          ) : null}
        </div>

        <div className="rn-net">
          <section className="rn-card" aria-label="Agent to agent">
            <div className="rn-row">
              <h2 className="rn-h3">Agent to agent</h2>
              <span className="rn-hint">Fees are agreed between the two agents and paid broker to broker at closing. ONE never collects or pays them.</span>
            </div>
            <div className="rn-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "in"} className={`rn-tab${tab === "in" ? " on" : ""}`} onClick={() => setTab("in")}>
                Sent to me {net ? net.received.length : ""}{waiting ? ` (${waiting} waiting)` : ""}
              </button>
              <button type="button" role="tab" aria-selected={tab === "out"} className={`rn-tab${tab === "out" ? " on" : ""}`} onClick={() => setTab("out")}>
                I sent {net ? net.sent.length : ""}
              </button>
            </div>
            {!net ? (
              <p className="rn-empty">{netErr ? "Your agent-to-agent referrals did not load. The Classic page has them." : "Loading…"}</p>
            ) : tab === "in" && listed === false && !list.length ? (
              <p className="rn-empty">You are not receiving referrals right now. Turn it back on to show up for other ONE agents.</p>
            ) : !list.length ? (
              <p className="rn-empty">{tab === "in" ? "No referrals sent to you yet." : "You have not referred anyone yet. Refer a client to a ONE agent above."}</p>
            ) : (
              list.map((x) => {
                const moves = movesFor(x);
                const step = x.stage ? STAGES.indexOf(x.stage) : -1;
                return (
                  <article className="rn-ref" key={x.id}>
                    <div className="rn-ref-top">
                      <Avatar name={x.other} tone="teal" />
                      <div className="rn-grow">
                        {x.contactId ? <button type="button" className="rn-name" onClick={() => person(x.contactId, x.client)}>{netTitle(x)}</button> : <b>{netTitle(x)}</b>}
                        <small>{`${x.direction === "received" ? "From" : "To"} ${x.other}${x.createdAt ? ` · ${shortDay(x.createdAt)}` : ""}${x.status === "sent" && x.expiresAt ? ` · answer by ${shortDay(x.expiresAt)}` : ""}`}</small>
                      </div>
                      {step < 0 ? <span className={`rn-pill${x.status === "closed" ? " ok" : x.status === "sent" ? " wait" : ""}`}>{x.statusWords}{x.status === "closed" && x.closedOn ? ` ${shortDay(x.closedOn)}` : ""}</span> : null}
                    </div>
                    {step >= 0 ? (
                      <div className="rn-track" aria-label={`Stage: ${STAGE_LABEL[x.stage!]}`}>
                        {STAGES.map((s, i) => (
                          <div key={s} className={i <= step ? "on" : ""}><i />{STAGE_LABEL[s]}</div>
                        ))}
                      </div>
                    ) : null}
                    {x.direction === "received" && x.status === "sent" && x.feeTerms ? <p className="rn-fine">Fee: {x.feeTerms}</p> : null}
                    {moves.length ? (
                      <div className="rn-acts">
                        {moves.some((m) => m.needsReason) ? <input className="rn-in" value={extra[x.id] ?? ""} placeholder="Reason (optional)" aria-label="Reason (optional)" onChange={(e) => setExtra((m) => ({ ...m, [x.id]: e.target.value }))} /> : null}
                        {moves.some((m) => m.needsDate) ? <input className="rn-in" type="date" value={extra[`d:${x.id}`] ?? ""} aria-label="Closing date" onChange={(e) => setExtra((m) => ({ ...m, [`d:${x.id}`]: e.target.value }))} /> : null}
                        {moves.map((m) => (
                          <button key={m.label} type="button" className={`rn-btn${m.primary ? " solid" : ""}`} disabled={actBusy === x.id} onClick={() => void act(x, m)}>{m.label}</button>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </section>
          <div className="rn-side">
            {listed != null ? (
              <div className="rn-toggle">
                <button type="button" role="switch" aria-checked={listed} className={`rn-sw${listed ? "" : " off"}`} disabled={listBusy} onClick={() => void flipListed()} aria-label="Receive referrals from ONE agents" />
                <div>
                  <b>{listed ? "Receiving referrals" : "Not receiving referrals"}</b>
                  <small>{listed ? "ONE agents can find you in the referral picker." : "You are hidden from the referral picker."}</small>
                </div>
              </div>
            ) : null}
            <section className="rn-card" aria-label="Agents you trade with">
              <p className="rn-sec">AGENTS YOU TRADE WITH</p>
              {partners.length ? (
                partners.map((p) => (
                  <div className="rn-pc rn-mini" key={p.name}>
                    <div className="rn-top">
                      <Avatar name={p.name} tone="teal" />
                      <div>
                        <b>{p.name}</b>
                        <small>{[p.sentYou ? `sent you ${p.sentYou}` : null, p.youSent ? `you sent ${p.youSent}` : null].filter(Boolean).join(" · ")}</small>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rn-empty">No referrals with other ONE agents yet.</p>
              )}
              <form className="rn-find" onSubmit={(e) => { e.preventDefault(); void findAgents(); }}>
                <input className="rn-in" value={aq} placeholder="City, team or name" aria-label="Find an agent by area" onChange={(e) => setAq(e.target.value)} />
                <button type="submit" className="rn-btn">Find an agent by area</button>
              </form>
              {agents ? (
                agents.length ? (
                  <ul className="rn-hits">
                    {agents.map((a) => (
                      <li key={`${a.name}${a.where}`}><b>{a.name}</b> <small>{a.where}</small></li>
                    ))}
                  </ul>
                ) : (
                  <p className="rn-empty">No ONE agents found there yet.</p>
                )
              ) : null}
            </section>
          </div>
        </div>
        <p className="rn-promise">{demo ? "Example agent. " : ""}From your own records only. ONE sends nothing: an ask or a thank-you is yours to give, in your own words.</p>
        <div className="rn-back">
          <button type="button" className="rn-btn ghost" onClick={onBack} aria-label="Back">← Back</button>
        </div>
      </div>
      {note ? <div className="rn-toast" role="status">{note}</div> : null}
    </div>
  );
}
