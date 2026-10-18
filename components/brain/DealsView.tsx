"use client";

import { useEffect, useRef, useState } from "react";
import { useSvgCamera } from "./useSvgCamera.ts";
import PulseRing from "./PulseRing.tsx";
import AddDealForm from "./AddDealForm.tsx";
import { CLIENT_PAGE_WORDS, SAVED, SAVING, showsClientPage } from "@/lib/siteFeeds.ts";
import { LEVEL_HUE, SIDE_WORD, SOURCE_WORD, dealLevel, dealName, daysWords, dueOn, exampleDeal, movedLine, nextDate, repcLinkUrl, timeWords, timeline, whenLine, type ClosingAsk, type Deal, type Status } from "@/lib/deals.ts";

// Deals under contract (VIP-SUMMARY §3z). Each deal round a centre that counts them; a deal pulses red on a deadline's
// day and yellow the day before. Tap one: it comes to the middle (Parry, 6 Oct, the rule for every orb) with every
// REPC date and days left; tap it again, or "All deals", to go back. Pulse never explains cancellation rights (that
// is the hand-back rule); nothing is sent to anyone; only the agent sees a deal.

const SIZE = 1000;
const C = SIZE / 2;
const CORE = 120;
const RING = 300;
const HUE = { under_contract: "#f5c542", closed: "#3fbf7f", fell_through: "#8089a2" } as const;
const STATUS_WORD: Record<Status, string> = { under_contract: "Under contract", closed: "Closed", fell_through: "Fell through" };
const date = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export type SetStatus = (d: Deal, status: Status, closing?: { id: string } | "new") => Promise<"ok" | "failed" | ClosingAsk>;
/** SITE-FEEDS K16: save the client page switch; "ok", or ONE MOVE's words when it did not save. */
export type SetClientPage = (d: Deal, on: boolean) => Promise<"ok" | { error: string }>;

/**
 * "Client can see their deal dates on your site" (SITE-FEEDS K16; Classic's Deal card has the same switch). It flips at
 * once, says Saving... then Saved., and goes back to how it was when ONE MOVE does not take it.
 */
function ClientPageSwitch({ d, onSave }: { d: Deal; onSave: SetClientPage }) {
  const saved = d.clientPage !== false;
  const [on, setOn] = useState(saved);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setMsg(null), [d.id]);
  useEffect(() => setOn(saved), [d.id, saved]);
  const flip = async () => {
    if (busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    setMsg({ ok: true, text: SAVING });
    const r = await onSave(d, next);
    setBusy(false);
    if (r === "ok") return setMsg({ ok: true, text: SAVED });
    setOn(!next);
    setMsg({ ok: false, text: r.error });
  };
  return (
    <div className="dl-client-page">
      <button type="button" role="switch" className={`hr-switch${on ? " on" : ""}`} aria-checked={on} aria-label={CLIENT_PAGE_WORDS} disabled={busy} onClick={() => void flip()}>
        <i aria-hidden="true" />
        <span>{CLIENT_PAGE_WORDS}</span>
      </button>
      {msg ? <small className={msg.ok ? "pm-empty dl-cp-msg" : "cc-err dl-cp-msg"} role="status">{msg.text}</small> : null}
    </div>
  );
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** A deal's dates in the order they fall, coloured by days left (red on the day, yellow the day before). */
function Timeline({ d, today, label }: { d: Deal; today: string; label: string }) {
  const rows = timeline(d, today);
  if (!rows.length) return <p className="pm-empty">No dates yet. Add them in ONE MOVE, or add the deal again with its REPC.</p>;
  return (
    <ol className="dl-tl" aria-label={label}>
      {rows.map((x) => {
        const moved = movedLine(x);
        return (
          <li key={x.key} className={`dl-tl-${x.level}`} aria-label={`${x.label}, ${date(dueOn(x))}, ${daysWords(x, today)}`}>
            <i className="dl-tl-dot" style={{ background: LEVEL_HUE[x.level], boxShadow: x.level === "now" || x.level === "today" ? `0 0 0 4px ${LEVEL_HUE[x.level]}33` : undefined }} aria-hidden="true" />
            <span className="pm-body">
              <b>{x.label}</b>
              <small>{date(dueOn(x))}{moved ? ` · ${moved}` : ""}</small>
            </span>
            <span className="dl-tl-left" style={{ color: LEVEL_HUE[x.level] }}>{daysWords(x, today)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function DealsView({ deals, today, demo, onStatus, onClientPage, onClose, onAdded, startAdding = false }: { deals: Deal[]; today: string; demo: boolean; onStatus: SetStatus; onClientPage: SetClientPage; onClose: () => void; onAdded: (d: Deal | null) => void; startAdding?: boolean }) {
  const cam = useSvgCamera(SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ deal: Deal; q: ClosingAsk } | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(startAdding);
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const [repcMsg, setRepcMsg] = useState<string | null>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const open = deals.filter((d) => d.status === "under_contract");
  const recent = deals.filter((d) => d.status !== "under_contract").slice(0, 4);
  const list = [...open, ...recent].slice(0, 12);
  const picked = list.find((d) => d.id === sel) ?? null;
  const seats = list.map((d, k) => {
    const a = (k / Math.max(list.length, 1)) * 2 * Math.PI;
    return { d, x: C + RING * Math.sin(a), y: C - RING * Math.cos(a) };
  });
  const pick = (d: Deal, x: number, y: number) => {
    if (sel === d.id) {
      setSel(null);
      return cam.reset();
    }
    setSel(d.id);
    setAsk(null);
    setConfirmClose(null);
    setRepcMsg(null);
    setAdding(false);
    cam.centreOn(x, y);
  };
  const back = () => {
    setSel(null);
    setAsk(null);
    setConfirmClose(null);
    setRepcMsg(null);
    cam.reset();
  };
  // The agent's own REPC, by a link good for 10 minutes; the tab opens first so the browser does not block it.
  const viewRepc = async (d: Deal) => {
    setRepcMsg(null);
    if (demo || !d.repcPath) return setRepcMsg(demo ? "In the example there is no file to open." : "The signed REPC is kept with this deal in ONE MOVE.");
    const w = window.open("", "_blank");
    const r = await fetch(repcLinkUrl(d.repcPath), { credentials: "include", cache: "no-store" }).catch(() => null);
    const j = r?.ok ? await r.json().catch(() => null) : null;
    if (j && typeof j.url === "string" && /^https:\/\//.test(j.url)) {
      if (w) {
        w.opener = null;
        w.location.href = j.url;
      } else window.location.assign(j.url);
    } else {
      w?.close();
      setRepcMsg("The REPC could not be opened just now. Try again.");
    }
  };
  const saved = (d: Deal | null) => {
    setAdding(false);
    onAdded(d);
    setNote(d ? `Saved. ${dealName(d)} is under contract, with every deadline.` : "Saved. It shows here in a moment.");
  };
  const set = async (d: Deal, status: Status, closing?: { id: string } | "new") => {
    setBusy(true);
    const r = await onStatus(d, status, closing);
    setBusy(false);
    if (r === "failed") return setNote("That didn't save just now. Nothing was changed.");
    if (r !== "ok") return setAsk({ deal: d, q: r });
    back();
    setNote(status === "closed" ? "Closed. Counted in Goals: Closed so far." : status === "fell_through" ? "Marked as fallen through. Its reminders stop." : "Back under contract.");
  };
  const tap = (go: () => void) => ({
    onClick: go,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      go();
    },
  });
  const red = open.filter((d) => dealLevel(d, today) === "now").length;

  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-labelledby="dl-title">
      <div className={`vr${adding ? " dl-wide" : ""}`} onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage">
          <svg ref={cam.svgRef} className="vr-svg" viewBox={cam.viewBox} preserveAspectRatio="xMidYMid meet" {...cam.handlers} role="group" aria-label="Deals under contract">
            <defs>
              <radialGradient id="dl-glass" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#0b1226" />
                <stop offset="0.7" stopColor="#111a33" />
                <stop offset="1" stopColor="#2b2a3f" />
              </radialGradient>
              <radialGradient id="dl-hi" cx="40%" cy="30%" r="60%">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle className="vr-track" cx={C} cy={C} r={RING} />
            {seats.map(({ d, x, y }) => (
              <line key={`l-${d.id}`} className="vr-link" x1={C} y1={C} x2={x} y2={y} />
            ))}
            <g aria-label={`${open.length} under contract`} {...(picked ? { "data-tap": true, role: "button", tabIndex: 0, ...tap(back) } : {})}>
              <circle cx={C} cy={C} r={CORE} fill="url(#dl-glass)" stroke="#f5c542" strokeWidth={3} />
              <circle cx={C} cy={C} r={CORE} fill="url(#dl-hi)" pointerEvents="none" />
              <text className="dt-score" x={C} y={C - 4} textAnchor="middle">{open.length}</text>
              <text className="dt-score-sub" x={C} y={C + 26} textAnchor="middle">UNDER CONTRACT</text>
              <text className="pm-core-end" x={C} y={C + 50} textAnchor="middle">{red ? `${red} due today` : "REPC deadlines"}</text>
            </g>
            {seats.map(({ d, x, y }) => {
              const hue = HUE[d.status];
              const level = dealLevel(d, today);
              const n = d.status === "under_contract" ? nextDate(d, today) : null;
              const on = sel === d.id;
              return (
                <g key={d.id} data-tap className={`cm-orb${on ? " picked" : ""}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${dealName(d)}: ${n ? whenLine(n, today) : STATUS_WORD[d.status]}`} {...tap(() => pick(d, x, y))}>
                  {level !== "good" && <PulseRing r={56} level={level} x={x} y={y} />}
                  <circle cx={x} cy={y} r={56} fill="url(#dl-glass)" stroke={hue} strokeWidth={on ? 4 : 2.5} strokeOpacity={d.status === "under_contract" ? 1 : 0.6} />
                  <circle cx={x} cy={y} r={56} fill="url(#dl-hi)" pointerEvents="none" />
                  <text className="pm-mark" x={x} y={y - 6} textAnchor="middle" fontSize={22} fill={hue}>{d.status === "closed" ? "✓" : d.status === "fell_through" ? "×" : n ? (dueOn(n) === today ? "Today" : String(Math.round((Date.parse(dueOn(n)) - Date.parse(today)) / 86_400_000))) : "·"}</text>
                  <text className="cm-orb-k" x={x} y={y + 20} textAnchor="middle">{d.status === "under_contract" ? (n ? n.label.toUpperCase().slice(0, 14) : "NO DATES") : STATUS_WORD[d.status].toUpperCase()}</text>
                  <text className="pm-name-l" x={x} y={y + 56 + 24} textAnchor="middle">{dealName(d).slice(0, 26)}</text>
                </g>
              );
            })}
          </svg>
          {note && (
            <div className="vr-bar pop" role="status">
              <span>{note}</span>
              <button className="chip-btn" onClick={() => setNote(null)}>OK</button>
            </div>
          )}
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button ref={closeRef} onClick={onClose} aria-label="Back to the Brain">←</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button className="zoom-btn" onClick={() => cam.zoomAt(0.8)} aria-label="Zoom out">−</button>
            <button onClick={back} aria-label="Back to the middle">◎</button>
          </div>
        </div>

        <aside className="drawer vr-drawer pm-drawer" aria-label="Deals">
          <div className="d-head">
            <span className="chip" style={{ color: "#3fbf7f", borderColor: "#3fbf7f" }}>ONE MOVE</span>
          </div>
          <h1 className="d-title" id="dl-title">{picked ? dealName(picked) : "Deals"}</h1>
          {picked ? (
            <section className="cm-form">
              <p className="d-sub">
                {picked.contact && picked.address ? `${picked.address} · ` : ""}
                {SIDE_WORD[picked.side]} · {STATUS_WORD[picked.status]} · {picked.form} REPC{picked.acceptedOn ? ` · accepted ${date(picked.acceptedOn)}` : ""}
              </p>
              <p className="dl-src">
                {SOURCE_WORD[picked.source ?? "manual"]}
                {picked.price != null ? ` · ${money(picked.price)}` : ""}
                {picked.gci != null ? ` · GCI ${money(picked.gci)}` : ""}
              </p>
              <h2 className="pm-h">Deadlines, {timeWords(picked.deadlineTime)} on the day</h2>
              <Timeline d={picked} today={today} label={`Timeline for ${dealName(picked)}`} />
              {showsClientPage(picked) ? <ClientPageSwitch d={picked} onSave={onClientPage} /> : null}
              {picked.hasRepc ? (
                <div>
                  <button type="button" className="vr-classic dl-repc" onClick={() => void viewRepc(picked)} aria-label={`View REPC for ${dealName(picked)}`}>
                    View REPC
                  </button>
                  {repcMsg ? <small className="pm-empty" role="status"> {repcMsg}</small> : null}
                </div>
              ) : null}
              {ask && ask.deal.id === picked.id ? (
                <div className="vr-ask" role="alert">
                  <p className="d-sum">{ask.q.question}</p>
                  <div className="decide-btns">
                    <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void set(picked, "closed", { id: ask.q.id })}>Yes, the same closing</button>
                    <button type="button" className="chip-btn" disabled={busy} onClick={() => void set(picked, "closed", "new")}>No, a new closing</button>
                  </div>
                </div>
              ) : confirmClose === picked.id ? (
                <div className="vr-ask" role="alert">
                  <p className="d-sum">Mark {dealName(picked)} closed? It counts once in Goals: Closed so far, with its GCI when you have it.</p>
                  <div className="decide-btns">
                    <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void set(picked, "closed")}>Yes, it closed</button>
                    <button type="button" className="chip-btn" disabled={busy} onClick={() => setConfirmClose(null)}>Not yet</button>
                  </div>
                </div>
              ) : (
                <div className="decide-btns">
                  {picked.status === "under_contract" ? (
                    <>
                      <button type="button" className="chip-btn primary" disabled={busy} onClick={() => setConfirmClose(picked.id)}>Mark closed</button>
                      <button type="button" className="chip-btn" disabled={busy} onClick={() => void set(picked, "fell_through")}>It fell through</button>
                    </>
                  ) : (
                    <button type="button" className="chip-btn" disabled={busy} onClick={() => void set(picked, "under_contract")}>Back under contract</button>
                  )}
                </div>
              )}
              <p className="pm-empty">Dates are as on the contract. On the 2027 form, earnest money and settlement that land on a weekend or Utah holiday move to the next business day. For cancellation rights, ask your broker or the contract.</p>
              <button className="vr-classic" onClick={back}>All deals</button>
            </section>
          ) : (
            <div className="dl-split">
              {adding ? <AddDealForm today={today} live={!demo} onSaved={saved} onCancel={() => setAdding(false)} /> : null}
              <section aria-label="Your deals">
                <p className="d-sub">{open.length ? `${open.length} under contract${red ? ` · ${red} due today` : ""}` : "None under contract"}</p>
                <p className="d-sum">Every REPC deadline with days left. A deal pulses yellow the day before a deadline and red on the day. Tap one to see its dates.</p>
                {!adding ? (
                  <button type="button" className="chip-btn primary dl-add-btn" onClick={() => setAdding(true)} aria-label="Add a deal">
                    Add a deal
                  </button>
                ) : null}
                {open.length ? (
                  <ul className="pm-list pm-compact">
                    {open.map((d) => {
                      const n = nextDate(d, today);
                      const k = list.indexOf(d);
                      const seat = seats[k];
                      return (
                        <li key={d.id}>
                          <i className="pm-dot" style={{ background: dealLevel(d, today) === "now" ? "#ff6b6b" : dealLevel(d, today) === "today" ? "#f5c542" : "#3fbf7f" }} aria-hidden="true" />
                          <button type="button" className="pm-body dl-row" onClick={() => seat && pick(d, seat.x, seat.y)}>
                            <b>{dealName(d)}</b>
                            <small>{SIDE_WORD[d.side]} · {n ? whenLine(n, today) : "no dates left"} · {SOURCE_WORD[d.source ?? "manual"]}</small>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="dl-example" aria-label="Example deal">
                    <p className="pm-empty">Add your first deal and every REPC deadline shows here. This is an example, not saved:</p>
                    <span className="vr-flag" style={{ color: "#f5c542" }}>EXAMPLE</span>
                    <p className="d-sub">{exampleDeal(today).address} · Buyer · {SOURCE_WORD.manual}</p>
                    <Timeline d={exampleDeal(today)} today={today} label="Example deal timeline" />
                    <small className="pm-empty">Due diligence is tomorrow, so it turns yellow today and red on the day.</small>
                  </div>
                )}
              </section>
            </div>
          )}
          <p className="pm-promise">{demo ? "Example agent. " : ""}Only you see your deals; a coach or team leader sees at most a count. Nothing is sent to anyone.</p>
        </aside>
      </div>
    </div>
  );
}
