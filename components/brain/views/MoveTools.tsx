"use client";

import { useReducer, useState } from "react";
import type { GraphNode } from "@/lib/graph/types.ts";
import { PRODUCT_COLOR, hex } from "@/lib/brain/theme.ts";
import { moveMenuHref } from "@/lib/moveMenu.ts";
import { ANALYTICS, DOCS, M2_TOOLS, REF_AGENTS, dropByAreas, m2KeyOf, m2Reduce, m2Start, type M2Key } from "@/lib/examples/move2.ts";
import ShowlyOpenShell, { HomeBlock, OpenToolButton } from "./ShowlyOpenShell.tsx";
import { AnalyticsView, Bars, DocsView, DropByView, Face, LoungeView, ReferralView, VideosView } from "./MoveViews.tsx";
import "@/app/showly-open-views.css";
import "@/app/move2-views.css";

// ONE MOVE's tools that had no example (walker 18 Oct; Parry 06:48: "the side information is blank"): Drop-By Map,
// Referral Network, Analytics, Video Library, VIP Docs and The Lounge. For the example
// agent the side panel shows the example itself and "Open ..." opens a full view inside the Brain where the actions work
// on screen only. A signed-in agent's orb opens the ONE MOVE page as before (Brain.tsx); this is never drawn for them.

const COLOR = hex(PRODUCT_COLOR.move);
const TABS = M2_TOOLS.map((t) => ({ key: t.key, label: t.label }));

export default function MoveTools({ node }: { node: GraphNode }) {
  const key = m2KeyOf(node.id) ?? "dropby";
  const tool = M2_TOOLS.find((t) => t.key === key)!;
  const [s, act] = useReducer(m2Reduce, undefined, m2Start);
  const [open, setOpen] = useState<M2Key | null>(null);
  const [item, setItem] = useState<string | null>(null);
  const openAt = (k: M2Key, id: string | null = null) => {
    setItem(id);
    setOpen(k);
  };
  const refAgent = (id: string) => REF_AGENTS.find((a) => a.id === id);

  const panel = (() => {
    switch (key) {
      case "dropby": {
        const areas = dropByAreas(s.drops);
        return (
          <>
            <OpenToolButton label="Drop-By Map" line="Every drop-by this quarter, by area, with Mark done." onOpen={() => openAt("dropby")} />
            <p className="pso-cap"><span className="pso-ex">Example</span> {s.drops.filter((d) => !d.done).length} drop-bys left this quarter in {areas.length} areas</p>
            {areas.map((a) => (
              <div key={a.area} className="m2-area">
                <p className="m2-area-h">{a.area} <small>{a.left ? `${a.left} to go` : "All done"}</small></p>
                <ul className="pso-list tight">
                  {a.items.map((d) => (
                    <li key={d.id} className={`pso-row${d.done ? " m2-done" : ""}`}>
                      <Face name={d.name} small />
                      <span className="pso-row-b">
                        <b>{d.name}</b>
                        <small>{d.street} · {d.idea}</small>
                      </span>
                      <button type="button" className="pso-act" onClick={() => act({ t: "drop", id: d.id })} aria-pressed={d.done}>{d.done ? "Done" : "Mark done"}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {s.note.dropby ? <p className="pso-note" role="status">{s.note.dropby}</p> : null}
          </>
        );
      }
      case "referrals":
        return (
          <>
            <OpenToolButton label="Referral Network" line="Send a referral to an agent anywhere, and see where each one stands." onOpen={() => openAt("referrals")} />
            <p className="pso-cap"><span className="pso-ex">Example</span> {REF_AGENTS.length} agents in your network · {s.refs.filter((r) => r.status !== "Closed").length} referrals out</p>
            <ul className="pso-list">
              {s.refs.map((r) => (
                <li key={r.id} className="pso-row">
                  <Face name={r.client} small />
                  <span className="pso-row-b">
                    <b>{r.client} → {refAgent(r.agentId)?.name}</b>
                    <small>{refAgent(r.agentId)?.market} · {r.when}</small>
                  </span>
                  <span className={`pso-pill m2-st ${r.status.replace(/\s+/g, "-").toLowerCase()}`}>{r.status}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="pso-act m2-under" onClick={() => openAt("referrals")}>Send a referral</button>
          </>
        );
      case "analytics":
        return (
          <>
            <OpenToolButton label="Analytics" line="This month's touches, weekly scores and your year." onOpen={() => openAt("analytics")} />
            <p className="pso-cap"><span className="pso-ex">Example</span> {ANALYTICS.month}: {ANALYTICS.touches.reduce((a, t) => a + t.value, 0)} touches</p>
            <Bars rows={ANALYTICS.touches} />
            <div className="pso-nums m2-nums2">
              {ANALYTICS.numbers.slice(0, 2).map((n) => (
                <span key={n.label}><b>{n.value}</b><small>{n.label}</small></span>
              ))}
            </div>
          </>
        );
      case "videos":
        return (
          <>
            <OpenToolButton label="Video Library" line="Training films; open one to watch it here." onOpen={() => openAt("videos")} />
            <p className="pso-cap"><span className="pso-ex">Example</span> {s.videos.filter((v) => v.watched).length} of {s.videos.length} watched</p>
            <ul className="pso-list tight">
              {s.videos.slice(0, 6).map((v) => (
                <li key={v.id} className="pso-row">
                  <span className="m2-play" aria-hidden="true">▶</span>
                  <span className="pso-row-b">
                    <b>{v.title}</b>
                    <small>{v.mins} min{v.watched ? " · watched" : ""}</small>
                  </span>
                  <button type="button" className="pso-act" onClick={() => openAt("videos", v.id)}>Open</button>
                </li>
              ))}
            </ul>
          </>
        );
      case "docs":
        return (
          <>
            <OpenToolButton label="VIP Docs" line="Playbooks, scripts and checklists; open one to read it here." onOpen={() => openAt("docs")} />
            <p className="pso-cap"><span className="pso-ex">Example</span> {DOCS.length} documents</p>
            <ul className="pso-list tight">
              {DOCS.map((d) => (
                <li key={d.id} className="pso-row">
                  <span className="m2-doc" aria-hidden="true">{d.kind.slice(0, 1)}</span>
                  <span className="pso-row-b">
                    <b>{d.title}</b>
                    <small>{d.kind} · {d.pages} {d.pages === 1 ? "page" : "pages"}</small>
                  </span>
                  <button type="button" className="pso-act" onClick={() => openAt("docs", d.id)}>Open</button>
                </li>
              ))}
            </ul>
          </>
        );
      case "lounge":
        return (
          <>
            <OpenToolButton label="The Lounge" line="Your team's posts; post, like and reply." onOpen={() => openAt("lounge")} />
            <p className="pso-cap"><span className="pso-ex">Example</span> {s.posts.length} team posts</p>
            <ul className="pso-list">
              {s.posts.slice(0, 3).map((p) => (
                <li key={p.id} className="pso-row top">
                  <Face name={p.author} small />
                  <span className="pso-row-b">
                    <b>{p.author} <em>· {p.when}</em></b>
                    <small className="pso-quiet">{p.text}</small>
                    <small>{p.likes + (s.liked[p.id] ? 1 : 0)} likes · {p.replies.length} {p.replies.length === 1 ? "reply" : "replies"}</small>
                  </span>
                </li>
              ))}
            </ul>
          </>
        );
    }
  })();

  return (
    <div className="pso-panel m2-panel">
      {panel}
      <a className="link m2-classic" href={moveMenuHref(tool.path)} target="_blank" rel="noreferrer">Open in ONE MOVE ↗</a>
      {open ? (
        <ShowlyOpenShell product="ONE MOVE" color={COLOR} title={TABS.find((t) => t.key === open)!.label} tabs={TABS} tab={open} onTab={(k) => openAt(k as M2Key)} example onClose={() => setOpen(null)}>
          <div className="m2-view">
            {open === "dropby" && <DropByView s={s} act={act} />}
            {open === "referrals" && <ReferralView s={s} act={act} />}
            {open === "analytics" && <AnalyticsView />}
            {open === "videos" && <VideosView s={s} act={act} openId={item ?? s.videos[0].id} setOpenId={setItem} picked={!!item} />}
            {open === "docs" && <DocsView openId={item ?? DOCS[0].id} setOpenId={setItem} picked={!!item} />}
            {open === "lounge" && <LoungeView s={s} act={act} />}
          </div>
        </ShowlyOpenShell>
      ) : null}
    </div>
  );
}
