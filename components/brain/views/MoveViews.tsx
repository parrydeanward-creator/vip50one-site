"use client";

import { useEffect, useRef, useState } from "react";
import { initialsOf } from "@/lib/vips.ts";
import { ANALYTICS, DOCS, NEED_AREAS, NEED_LISTINGS, REF_AGENTS, dropByAreas, fitsFor, money, type M2Act, type M2State, type Need } from "@/lib/examples/move2.ts";
import { HomeBlock } from "./ShowlyOpenShell.tsx";

// The full views of ONE MOVE's example tools inside the Brain (walker 18 Oct): Drop-By Map, Referral Network, Buyer
// Needs, Your listings, Analytics, Video Library, VIP Docs and The Lounge. Every action works on screen only.

export function Face({ name, small }: { name: string; small?: boolean }) {
  return (
    <span className={`m2-face${small ? " sm" : ""}`} aria-hidden="true">
      {initialsOf(name.replace(/\([^)]*\)/g, " "))}
    </span>
  );
}
const Note = ({ text }: { text?: string }) => (text ? <p className="pso-note m2-note" role="status">{text}</p> : null);

// ---- Drop-By Map ----------------------------------------------------------------------------------------------------

export function DropByView({ s, act }: { s: M2State; act: (a: M2Act) => void }) {
  const areas = dropByAreas(s.drops);
  const left = s.drops.filter((d) => !d.done).length;
  return (
    <>
      <div className="pso-nums">
        <span><b>{left}</b><small>Due this quarter</small></span>
        <span><b>{s.drops.length - left}</b><small>Done</small></span>
        <span><b>{areas.length}</b><small>Areas</small></span>
        <span><b>{Math.round(((s.drops.length - left) / s.drops.length) * 100)}%</b><small>Quarter covered</small></span>
      </div>
      <Note text={s.note.dropby} />
      <div className="m2-cols">
        {areas.map((a) => (
          <section key={a.area} className="pso-card">
            <h2 className="pso-h2">{a.area} <small className="m2-sub">{a.left ? `${a.left} to go` : "All done"}</small></h2>
            <ul className="pso-list">
              {a.items.map((d) => (
                <li key={d.id} className={`pso-row${d.done ? " m2-done" : ""}`}>
                  <Face name={d.name} small />
                  <span className="pso-row-b">
                    <b>{d.name}</b>
                    <small>{d.street} · {d.idea}</small>
                    <small>Last drop-by: {d.last}</small>
                  </span>
                  <button type="button" className="pso-act" onClick={() => act({ t: "drop", id: d.id })} aria-pressed={d.done}>
                    {d.done ? "Undo" : "Mark done"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

// ---- Referral Network -----------------------------------------------------------------------------------------------

const CLIENTS = ["Elise Danner", "Laura Finch", "Nora Bishop", "Trent Mayer", "Julia Sloan"];
export function ReferralView({ s, act }: { s: M2State; act: (a: M2Act) => void }) {
  const [agentId, setAgentId] = useState(REF_AGENTS[0].id);
  const [client, setClient] = useState(CLIENTS[3]);
  const [note, setNote] = useState("");
  const agent = (id: string) => REF_AGENTS.find((a) => a.id === id);
  return (
    <div className="pso-grid2">
      <section className="pso-card">
        <h2 className="pso-h2">Send a referral</h2>
        <label className="m2-field">
          <span className="pso-lbl">Client</span>
          <select value={client} onChange={(e) => setClient(e.target.value)}>
            {CLIENTS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="m2-field">
          <span className="pso-lbl">To agent</span>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            {REF_AGENTS.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.market}</option>)}
          </select>
        </label>
        <label className="m2-field">
          <span className="pso-lbl">Note for the agent</span>
          <textarea className="pso-ta" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Moving in the spring, two kids, wants a good school area." />
        </label>
        <button type="button" className="btn m2-btn" onClick={() => { act({ t: "refer", client, agentId, note }); setNote(""); }}>
          Send referral
        </button>
        <Note text={s.note.referrals} />
        <h2 className="pso-h2 m2-gap">Your referrals</h2>
        <ul className="pso-list">
          {s.refs.map((r) => (
            <li key={r.id} className="pso-row">
              <Face name={r.client} small />
              <span className="pso-row-b">
                <b>{r.client} → {agent(r.agentId)?.name}</b>
                <small>{agent(r.agentId)?.market} · {r.when}{r.note ? ` · "${r.note}"` : ""}</small>
              </span>
              <span className={`pso-pill m2-st ${r.status.replace(/\s+/g, "-").toLowerCase()}`}>{r.status}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="pso-card">
        <h2 className="pso-h2">Agents in your network</h2>
        <ul className="pso-list">
          {REF_AGENTS.map((a) => (
            <li key={a.id} className="pso-row">
              <Face name={a.name} />
              <span className="pso-row-b">
                <b>{a.name}</b>
                <small>{a.brokerage} · {a.market}</small>
                <small>{a.focus} · you sent {a.sent}, got {a.got}</small>
              </span>
              <button type="button" className="pso-act" onClick={() => setAgentId(a.id)} aria-pressed={agentId === a.id}>
                {agentId === a.id ? "Picked" : "Refer"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---- Buyer Needs ----------------------------------------------------------------------------------------------------

const PRICES = [450_000, 500_000, 575_000, 650_000, 750_000];
export function NeedsView({ s, act }: { s: M2State; act: (a: M2Act) => void }) {
  const [pick, setPick] = useState(s.needs[0]?.id ?? "");
  const [buyer, setBuyer] = useState("");
  const [beds, setBeds] = useState(3);
  const [max, setMax] = useState(575_000);
  const [areas, setAreas] = useState<string[]>(["Centerville"]);
  const sel = s.needs.find((n) => n.id === pick) ?? s.needs[0];
  const fits = sel ? fitsFor(sel) : [];
  const post = () => {
    if (!buyer.trim()) return;
    const n: Need = { id: `nd-${s.needs.length + 1}`, buyer: buyer.trim(), beds, maxPrice: max, areas, must: [], posted: "Today" };
    act({ t: "need", need: n });
    setPick(n.id);
    setBuyer("");
  };
  return (
    <>
      <div className="pso-grid2">
        <section className="pso-card">
          <h2 className="pso-h2">Post a need</h2>
          <label className="m2-field">
            <span className="pso-lbl">Buyer</span>
            <input value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Buyer's name" />
          </label>
          <div className="m2-row2">
            <label className="m2-field">
              <span className="pso-lbl">Beds at least</span>
              <select value={beds} onChange={(e) => setBeds(Number(e.target.value))}>
                {[2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="m2-field">
              <span className="pso-lbl">Up to</span>
              <select value={max} onChange={(e) => setMax(Number(e.target.value))}>
                {PRICES.map((p) => <option key={p} value={p}>{money(p)}</option>)}
              </select>
            </label>
          </div>
          <span className="pso-lbl">Areas</span>
          <div className="pso-seg">
            {NEED_AREAS.map((a) => (
              <button key={a} type="button" className="chip-btn" aria-pressed={areas.includes(a)} onClick={() => setAreas((x) => (x.includes(a) ? x.filter((y) => y !== a) : [...x, a]))}>
                {a}
              </button>
            ))}
          </div>
          <button type="button" className="btn m2-btn" onClick={post} disabled={!buyer.trim()}>Post need</button>
          <Note text={s.note.needs} />
        </section>
        <section className="pso-card">
          <h2 className="pso-h2">Your needs</h2>
          <ul className="pso-list">
            {s.needs.map((n) => (
              <li key={n.id}>
                <button type="button" className={`pso-row m2-rowbtn${sel?.id === n.id ? " on" : ""}`} onClick={() => setPick(n.id)} aria-pressed={sel?.id === n.id}>
                  <Face name={n.buyer} small />
                  <span className="pso-row-b">
                    <b>{n.buyer}</b>
                    <small>{n.beds}+ beds · up to {money(n.maxPrice)} · {n.areas.join(", ") || "Any area"}{n.must.length ? ` · ${n.must.join(", ")}` : ""}</small>
                  </span>
                  <span className="pso-pill">{fitsFor(n).length} fit</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {sel && (
        <section className="pso-group">
          <h2>Homes that fit {sel.buyer}<small>{fits.length} of {NEED_LISTINGS.length} example listings</small></h2>
          {fits.length ? (
            <ul className="pso-homes">
              {fits.map((l) => (
                <li key={l.id} className="pso-home">
                  <HomeBlock hue={l.hue} label={l.street} />
                  <div className="pso-home-b">
                    <p className="pso-home-t"><b>{l.street}</b><span className="pso-pill">{money(l.price)}</span></p>
                    <small>{l.city} · {l.beds} beds · {l.baths} baths · {l.sqft.toLocaleString("en-US")} sq ft</small>
                    <small>{l.agent === "You" ? "Your listing" : l.agent}{l.features.length ? ` · ${l.features.join(", ")}` : ""}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pso-muted">No example listing fits yet. Pulse tells you the day one does.</p>
          )}
        </section>
      )}
    </>
  );
}

// ---- Your listings --------------------------------------------------------------------------------------------------

export function ListingsView({ s, act }: { s: M2State; act: (a: M2Act) => void }) {
  return (
    <>
      <Note text={s.note.listings} />
      <ul className="pso-homes m2-gap">
        {s.listings.map((l) => (
          <li key={l.id} className="pso-home">
            <HomeBlock hue={l.hue} label={l.street} />
            <div className="pso-home-b">
              <p className="pso-home-t"><b>{l.street}</b><span className={`pso-pill m2-st ${l.status.replace(/\s+/g, "-").toLowerCase()}`}>{l.status}</span></p>
              <small>{l.city} · {money(l.price)}{l.days ? ` · ${l.days} days on market` : " · not live yet"}</small>
              <small>{l.views.toLocaleString("en-US")} views · {l.showings} showings</small>
              <ul className="pso-checks">
                {l.steps.map((st, i) => (
                  <li key={st.label}>
                    <button type="button" className={`pso-check${st.done ? " on" : ""}`} onClick={() => act({ t: "step", id: l.id, i })} aria-pressed={st.done}>
                      <i aria-hidden="true">{st.done ? "✓" : ""}</i>
                      <span>{st.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---- Analytics ------------------------------------------------------------------------------------------------------

export function Bars({ rows, max }: { rows: { label: string; value: number; color?: string }[]; max?: number }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="m2-bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="m2-bar-l">{r.label}</span>
          <span className="m2-bar" role="img" aria-label={`${r.label}: ${r.value}`}>
            <i style={{ width: `${Math.max(2, Math.round((r.value / top) * 100))}%`, background: r.color }} />
          </span>
          <b>{r.value}</b>
        </li>
      ))}
    </ul>
  );
}

export function AnalyticsView() {
  const total = ANALYTICS.touches.reduce((a, t) => a + t.value, 0);
  return (
    <>
      <div className="pso-nums">
        {ANALYTICS.numbers.map((n) => (
          <span key={n.label}><b>{n.value}</b><small>{n.label}</small></span>
        ))}
      </div>
      <div className="pso-grid2">
        <section className="pso-card">
          <h2 className="pso-h2">{ANALYTICS.month} touches · {total}</h2>
          <Bars rows={ANALYTICS.touches} />
        </section>
        <section className="pso-card">
          <h2 className="pso-h2">Weekly score (minimum 100)</h2>
          <ul className="m2-weeks" aria-label="Weekly scores">
            {ANALYTICS.weeks.map((w) => (
              <li key={w.label}>
                <span className="m2-col" role="img" aria-label={`Week of ${w.label}: ${w.score}`}>
                  <i style={{ height: `${Math.min(100, Math.round((w.score / 130) * 100))}%` }} className={w.score >= 100 ? "met" : ""} />
                  <em style={{ bottom: `${Math.round((100 / 130) * 100)}%` }} aria-hidden="true" />
                </span>
                <b>{w.score}</b>
                <small>{w.label}</small>
              </li>
            ))}
          </ul>
          <p className="pso-muted">The gold line is the weekly minimum of 100. This week is still running.</p>
        </section>
      </div>
    </>
  );
}

// ---- Video Library and VIP Docs -------------------------------------------------------------------------------------

/** On a phone the open item sits under the list: bring it into sight once one is picked. */
function useShowPicked(openId: string | null, picked: boolean) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (picked && window.matchMedia("(max-width: 760px)").matches) ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [openId, picked]);
  return ref;
}

export function VideosView({ s, act, openId, setOpenId, picked = false }: { s: M2State; act: (a: M2Act) => void; openId: string | null; setOpenId: (id: string | null) => void; picked?: boolean }) {
  const v = s.videos.find((x) => x.id === openId) ?? null;
  const shown = useShowPicked(openId, picked);
  return (
    <div className="pso-grid2">
      <section className="pso-card">
        <h2 className="pso-h2">Videos · {s.videos.filter((x) => x.watched).length} of {s.videos.length} watched</h2>
        <ul className="pso-list">
          {s.videos.map((x) => (
            <li key={x.id} className={`pso-row${openId === x.id ? " m2-on" : ""}`}>
              <span className="m2-play" aria-hidden="true">▶</span>
              <span className="pso-row-b">
                <b>{x.title}</b>
                <small>{x.topic} · {x.mins} min{x.watched ? " · watched" : ""}</small>
              </span>
              <button type="button" className="pso-act" onClick={() => setOpenId(x.id)}>Open</button>
            </li>
          ))}
        </ul>
      </section>
      <section className="pso-card" ref={shown}>
        {v ? (
          <>
            <div className="m2-player" role="img" aria-label={`Example: ${v.title} plays here`}>
              <span aria-hidden="true">▶</span>
              <small>Example: the film plays here</small>
            </div>
            <h2 className="pso-h2 m2-gap">{v.title}</h2>
            <p className="pso-q">{v.about}</p>
            <div className="pso-acts">
              <button type="button" className="pso-act" onClick={() => act({ t: "watched", id: v.id })} aria-pressed={v.watched}>{v.watched ? "Watched ✓" : "Mark watched"}</button>
              <small className="pso-muted">{v.topic} · {v.mins} minutes</small>
            </div>
            <Note text={s.note.videos} />
          </>
        ) : (
          <p className="pso-muted">Open a video to watch it here.</p>
        )}
      </section>
    </div>
  );
}

export function DocsView({ openId, setOpenId, picked = false }: { openId: string | null; setOpenId: (id: string | null) => void; picked?: boolean }) {
  const d = DOCS.find((x) => x.id === openId) ?? null;
  const shown = useShowPicked(openId, picked);
  return (
    <div className="pso-grid2">
      <section className="pso-card">
        <h2 className="pso-h2">VIP Docs</h2>
        <ul className="pso-list">
          {DOCS.map((x) => (
            <li key={x.id} className={`pso-row${openId === x.id ? " m2-on" : ""}`}>
              <span className="m2-doc" aria-hidden="true">{x.kind.slice(0, 1)}</span>
              <span className="pso-row-b">
                <b>{x.title}</b>
                <small>{x.kind} · {x.pages} {x.pages === 1 ? "page" : "pages"} · updated {x.updated}</small>
              </span>
              <button type="button" className="pso-act" onClick={() => setOpenId(x.id)}>Open</button>
            </li>
          ))}
        </ul>
      </section>
      <section className="pso-card m2-paper" ref={shown}>
        {d ? (
          <>
            <p className="pso-kick">{d.kind} · {d.pages} {d.pages === 1 ? "page" : "pages"}</p>
            <h2 className="m2-doc-t">{d.title}</h2>
            {d.lines.map((l) => <p key={l} className="pso-q">{l}</p>)}
            <p className="pso-muted">Example: the first page of the document.</p>
          </>
        ) : (
          <p className="pso-muted">Open a document to read it here.</p>
        )}
      </section>
    </div>
  );
}

// ---- The Lounge -----------------------------------------------------------------------------------------------------

export function LoungeView({ s, act }: { s: M2State; act: (a: M2Act) => void }) {
  const [text, setText] = useState("");
  const [reply, setReply] = useState<{ id: string; text: string } | null>(null);
  return (
    <div className="m2-lounge">
      <section className="pso-card">
        <label className="pso-lbl" htmlFor="m2-post">Post to your team</label>
        <textarea id="m2-post" className="pso-ta" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Share a win, ask for a vendor, invite the team." />
        <div className="pso-acts">
          <button type="button" className="btn m2-btn" disabled={!text.trim()} onClick={() => { act({ t: "post", text }); setText(""); }}>Post</button>
        </div>
        <Note text={s.note.lounge} />
      </section>
      <ul className="pso-list m2-gap">
        {s.posts.map((p) => (
          <li key={p.id} className="pso-card m2-post">
            <div className="m2-post-h">
              <Face name={p.author} />
              <span className="pso-row-b">
                <b>{p.author}</b>
                <small>{p.role} · {p.when}</small>
              </span>
            </div>
            <p className="pso-qt">{p.text}</p>
            {p.replies.length > 0 && (
              <ul className="m2-replies">
                {p.replies.map((r, i) => (
                  <li key={i}><b>{r.author}</b> {r.text}</li>
                ))}
              </ul>
            )}
            <div className="pso-acts">
              <button type="button" className="pso-act" aria-pressed={!!s.liked[p.id]} onClick={() => act({ t: "like", id: p.id })}>
                {s.liked[p.id] ? "Liked" : "Like"} · {p.likes + (s.liked[p.id] ? 1 : 0)}
              </button>
              <button type="button" className="pso-act" onClick={() => setReply(reply?.id === p.id ? null : { id: p.id, text: "" })}>Reply</button>
            </div>
            {reply?.id === p.id && (
              <div className="m2-reply">
                <input value={reply.text} onChange={(e) => setReply({ id: p.id, text: e.target.value })} placeholder={`Reply to ${p.author.split(" ")[0]}`} aria-label={`Reply to ${p.author}`} />
                <button type="button" className="pso-act" onClick={() => { act({ t: "reply", id: p.id, text: reply.text }); setReply(null); }}>Send</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
