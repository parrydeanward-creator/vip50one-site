"use client";

import { useState } from "react";
import type { GraphNode } from "@/lib/graph/types.ts";
import { PRODUCT_COLOR, hex } from "@/lib/brain/theme.ts";
import { ANSWER_WORD, SHOWLY_LENDER, SHOWLY_LENDER_REQUESTS, SHOWLY_RECAPS, SHOWLY_TOURS, tallyWords, type Answer, type LenderRequest, type TourHome } from "@/lib/examples/showly.ts";
import { isExampleTool } from "@/lib/examples/open.ts";
import ShowlyOpenShell, { HomeBlock, OpenToolButton, RealRows } from "./ShowlyOpenShell.tsx";

// Showly's four tools in the Brain (Parry, 18 Oct: the side panel shows the example itself, and "Open ..." opens a full
// view inside the Brain where the actions work). Demo, or a tool with no data of the agent's own: the labelled example.
// Live with data: the agent's own rows, the same way. Nothing here sends anything.

export const SHOWLY_TOOL = /^showly-tool-(tours|answers|recaps|lender)$/;
type Key = "tours" | "answers" | "recaps" | "lender";
const TABS: { key: Key; label: string }[] = [
  { key: "tours", label: "Tours" },
  { key: "answers", label: "Buyer answers" },
  { key: "recaps", label: "Recaps" },
  { key: "lender", label: "Lender" },
];
const COLOR = hex(PRODUCT_COLOR.showly);
const NOT_SENT = "(Example: nothing was sent.)";
const ALL_HOMES = SHOWLY_TOURS.flatMap((t) => t.homes.map((h) => ({ ...h, buyer: t.buyer, tourId: t.id })));

function AnswerBadge({ a }: { a: Answer | null }) {
  return <span className={`pso-ans ${a ?? "none"}`}>{a ? ANSWER_WORD[a] : "No answer yet"}</span>;
}

interface State {
  sent: Record<string, string>;
  requests: LenderRequest[];
  note: string | null;
}

export default function ShowlyTools({ node, kids, live }: { node: GraphNode; kids: GraphNode[]; live: boolean }) {
  const key = (SHOWLY_TOOL.exec(node.id)?.[1] ?? "tours") as Key;
  const example = !live || isExampleTool(node);
  const [open, setOpen] = useState<Key | null>(null);
  const [st, setSt] = useState<State>({ sent: {}, requests: SHOWLY_LENDER_REQUESTS, note: null });
  const send = (id: string, buyer: string) => setSt((s) => ({ ...s, sent: { ...s.sent, [id]: `Sent to ${buyer} just now. ${NOT_SENT}` } }));
  const askLetter = (h: (typeof ALL_HOMES)[number]) =>
    setSt((s) =>
      s.requests.some((r) => r.street === h.street)
        ? s
        : { ...s, requests: [...s.requests, { id: `lr-${h.id}`, buyer: h.buyer, street: h.street, asked: "just now", state: "waiting" }], note: `Asked ${SHOWLY_LENDER.name} for a letter on ${h.street}. ${NOT_SENT}` },
    );
  const label = TABS.find((t) => t.key === key)!.label;
  const realRows = kids.map((k) => ({ id: k.id, label: k.label, sub: k.secondaryLabel }));
  const dana = SHOWLY_TOURS[0];

  const panel = !example ? (
    <OpenToolButton label={label} line={`Your ${label.toLowerCase()} from Showly, in a full view.`} onOpen={() => setOpen(key)} />
  ) : (
    <>
      {key === "tours" && (
        <>
          <OpenToolButton label="Tours" line="Every home with photos, your notes and the buyer's answer." onOpen={() => setOpen("tours")} />
          <p className="pso-cap"><span className="pso-ex">Example</span> {dana.buyer} · {dana.day} · {dana.homes.length} homes · {tallyWords(dana.homes)}</p>
          <ul className="pso-list">
            {dana.homes.map((h) => (
              <li key={h.id} className="pso-row">
                <HomeBlock hue={h.hue} label={h.street} small />
                <span className="pso-row-b">
                  <b>{h.street}</b>
                  <small>{h.time} · {h.city}</small>
                </span>
                <AnswerBadge a={h.answer} />
              </li>
            ))}
          </ul>
        </>
      )}
      {key === "answers" && (
        <>
          <OpenToolButton label="Buyer answers" line="Every Yes, Maybe and No with the buyer's own note." onOpen={() => setOpen("answers")} />
          <p className="pso-cap"><span className="pso-ex">Example</span> {dana.buyer} answered {dana.homes.filter((h) => h.answer).length} of {dana.homes.length} homes</p>
          <ul className="pso-list">
            {dana.homes.map((h) => (
              <li key={h.id} className="pso-row top">
                <AnswerBadge a={h.answer} />
                <span className="pso-row-b">
                  <b>{h.street}</b>
                  <small>{h.buyerNote ? `"${h.buyerNote}"` : "No note"}</small>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {key === "recaps" && (
        <>
          <OpenToolButton label="Recaps" line="Read each recap the way the buyer sees it, then send." onOpen={() => setOpen("recaps")} />
          <p className="pso-cap"><span className="pso-ex">Example</span> 2 recaps ready to send</p>
          <ul className="pso-list">
            {SHOWLY_RECAPS.map((r) => (
              <li key={r.id} className="pso-row wrap">
                <span className="pso-row-b">
                  <b>{r.buyer}</b>
                  <small>{r.day} · {r.homes} homes · {r.photos} photos · {r.voiceNotes} voice notes</small>
                </span>
                {st.sent[r.id] ? <span className="pso-done">Sent</span> : <button type="button" className="pso-act" onClick={() => send(r.id, r.buyer)}>Send</button>}
                {st.sent[r.id] ? <p className="pso-note" role="status">{st.sent[r.id]}</p> : null}
              </li>
            ))}
          </ul>
        </>
      )}
      {key === "lender" && (
        <>
          <OpenToolButton label="Lender" line="Your loan officer and every pre-approval letter you asked for." onOpen={() => setOpen("lender")} />
          <LenderCard />
          <ul className="pso-list">
            {st.requests.map((r) => (
              <li key={r.id} className="pso-row">
                <span className="pso-row-b">
                  <b>{r.buyer} · {r.street}</b>
                  <small>Asked {r.asked}{r.back ? ` · back ${r.back}` : ""}</small>
                </span>
                <span className={`pso-state ${r.state}`}>{r.state === "ready" ? "Letter ready" : "Waiting"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );

  return (
    <div className="pso-panel">
      {panel}
      {open ? (
        <ShowlyOpenShell product="Showly" color={COLOR} title={TABS.find((t) => t.key === open)!.label} tabs={TABS} tab={open} onTab={(k) => setOpen(k as Key)} example={example || open !== key} onClose={() => setOpen(null)}>
          {!example && open === key ? (
            <RealRows rows={realRows} empty={`Nothing in ${label} yet.`} />
          ) : (
            <ShowlyView tab={open} st={st} onSend={send} onAsk={askLetter} onTab={setOpen} />
          )}
        </ShowlyOpenShell>
      ) : null}
    </div>
  );
}

function LenderCard() {
  const l = SHOWLY_LENDER;
  return (
    <div className="pso-card pso-lo">
      <span className="pso-avatar" aria-hidden="true">{l.name.split(" ").map((w) => w[0]).join("")}</span>
      <span className="pso-row-b">
        <b><span className="pso-ex">Example</span> {l.name}</b>
        <small>{l.company} · {l.phoneShown}</small>
        <small className="pso-ok">{l.connectedSince}</small>
      </span>
    </div>
  );
}

function ShowlyView({ tab, st, onSend, onAsk, onTab }: { tab: Key; st: State; onSend: (id: string, buyer: string) => void; onAsk: (h: (typeof ALL_HOMES)[number]) => void; onTab: (k: Key) => void }) {
  const [tourId, setTourId] = useState(SHOWLY_TOURS[0].id);
  const tour = SHOWLY_TOURS.find((t) => t.id === tourId)!;
  const asked = new Set(st.requests.map((r) => r.street));
  const homeCard = (h: TourHome) => (
    <li key={h.id} className="pso-home">
      <HomeBlock hue={h.hue} label={h.street} />
      <div className="pso-home-b">
        <p className="pso-home-t"><b>{h.street}</b><AnswerBadge a={h.answer} /></p>
        <small>{h.time} · {h.city} · {h.beds} bd · {h.baths} ba · {h.sqft.toLocaleString("en-US")} sq ft</small>
        <p className="pso-q"><span>Your note</span>{h.agentNote}</p>
        {h.buyerNote ? <p className="pso-q buyer"><span>{tour.buyer.split(" ")[0]} said</span>"{h.buyerNote}"</p> : null}
      </div>
    </li>
  );
  if (tab === "tours")
    return (
      <section aria-label="Tours">
        <div className="pso-seg" role="group" aria-label="Pick a tour">
          {SHOWLY_TOURS.map((t) => (
            <button key={t.id} type="button" className="chip-btn" aria-pressed={t.id === tourId} onClick={() => setTourId(t.id)}>{t.buyer} · {t.day}</button>
          ))}
        </div>
        <p className="pso-cap">{tour.homes.length} homes · {tallyWords(tour.homes)}</p>
        <ul className="pso-homes">{tour.homes.map(homeCard)}</ul>
        <button type="button" className="chip-btn primary pso-cta" onClick={() => onTab("recaps")}>Go to the recap</button>
      </section>
    );
  if (tab === "answers")
    return (
      <section aria-label="Buyer answers">
        {st.note ? <p className="pso-note" role="status">{st.note}</p> : null}
        {SHOWLY_TOURS.map((t) => (
          <div key={t.id} className="pso-group">
            <h2>{t.buyer} · {t.day} <small>{tallyWords(t.homes)}</small></h2>
            <ul className="pso-list">
              {t.homes.map((h) => {
                const home = ALL_HOMES.find((x) => x.id === h.id)!;
                return (
                  <li key={h.id} className="pso-row top wrap">
                    <HomeBlock hue={h.hue} label={h.street} small />
                    <span className="pso-row-b">
                      <b>{h.street}</b>
                      <small>{h.buyerNote ? `"${h.buyerNote}"` : "No note"}</small>
                    </span>
                    <AnswerBadge a={h.answer} />
                    {h.answer === "yes" ? (
                      asked.has(h.street) ? <span className="pso-done">Letter asked</span> : <button type="button" className="pso-act" onClick={() => onAsk(home)}>Ask for a letter</button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    );
  if (tab === "recaps")
    return (
      <section aria-label="Recaps" className="pso-grid2">
        {SHOWLY_RECAPS.map((r) => {
          const t = SHOWLY_TOURS.find((x) => x.id === r.tourId)!;
          return (
            <article key={r.id} className="pso-card pso-recap">
              <p className="pso-kick">Recap for {r.buyer} · {r.day}</p>
              <p className="pso-intro">"{r.intro}"</p>
              <div className="pso-strip">{t.homes.map((h) => <HomeBlock key={h.id} hue={h.hue} label={h.street} small />)}</div>
              <small className="pso-muted">{r.homes} homes · {r.photos} photos · {r.voiceNotes} voice notes · Yes, Maybe or No on each</small>
              <div className="pso-acts">
                {st.sent[r.id] ? <span className="pso-done">Sent</span> : <button type="button" className="chip-btn primary" onClick={() => onSend(r.id, r.buyer)}>Send to {r.buyer.split(" ")[0]}</button>}
              </div>
              {st.sent[r.id] ? <p className="pso-note" role="status">{st.sent[r.id]}</p> : null}
            </article>
          );
        })}
      </section>
    );
  return (
    <section aria-label="Lender" className="pso-grid2">
      <div>
        <LenderCard />
        <p className="pso-muted"><b>She sees:</b> {SHOWLY_LENDER.sees}</p>
        <p className="pso-muted"><b>She never sees:</b> {SHOWLY_LENDER.never}</p>
        {st.note ? <p className="pso-note" role="status">{st.note}</p> : null}
      </div>
      <div>
        <h2 className="pso-h2">Pre-approval letters</h2>
        <ul className="pso-list">
          {st.requests.map((r) => (
            <li key={r.id} className="pso-row">
              <span className="pso-row-b">
                <b>{r.buyer} · {r.street}</b>
                <small>Asked {r.asked}{r.back ? ` · back ${r.back}` : ""}</small>
              </span>
              <span className={`pso-state ${r.state}`}>{r.state === "ready" ? "Letter ready" : "Waiting"}</span>
            </li>
          ))}
        </ul>
        <h2 className="pso-h2">Ask for a letter on a Yes home</h2>
        <ul className="pso-list">
          {ALL_HOMES.filter((h) => h.answer === "yes").map((h) => (
            <li key={h.id} className="pso-row">
              <span className="pso-row-b"><b>{h.street}</b><small>{h.buyer}</small></span>
              {asked.has(h.street) ? <span className="pso-done">Asked</span> : <button type="button" className="pso-act" onClick={() => onAsk(h)}>Ask</button>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
