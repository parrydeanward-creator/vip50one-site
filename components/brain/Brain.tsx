"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BusinessGraph, GraphNode } from "@/lib/graph/types.ts";
import { DESKTOP_BUDGET, PHONE_BUDGET, childrenOf, indexGraph, pathTo, visibleSet } from "@/lib/graph/model.ts";
import { bounds, layout } from "@/lib/brain/layout.ts";
import { fit, pan, zoomAt } from "@/lib/brain/camera.ts";
import * as nav from "@/lib/brain/nav.ts";
import { PRODUCT_COLOR, STATUS, hex } from "@/lib/brain/theme.ts";
import { UPGRADE_URL } from "@/lib/products.ts";
import type { BrainScene } from "./scene.ts";

// The ONE Brain shell: navigation controller, gestures, the accessible layer
// of real buttons over the drawn nodes, and the detail drawer. Business data
// comes in as a graph; nothing here knows about any product's internals.

const PHONE_QUERY = "(max-width: 719px)";
const CARD_ROOM = 420; // desktop width kept free for the floating card

export default function Brain({ graph, pkg = "complete" }: { graph: BusinessGraph; pkg?: string }) {
  // ONE's morning note, written by the AI when it is available (rules otherwise).
  const [note, setNote] = useState<{ note: string; source: "ai" | "rules" } | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/note?package=${encodeURIComponent(pkg)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((n) => live && n && setNote(n))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pkg]);
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
  const stateRef = useRef(state.focusId);
  stateRef.current = state.focusId;
  const drag = useRef({ down: false, moved: false, x: 0, y: 0, pointers: new Map<number, { x: number; y: number }>(), pinch: 0 });

  const focus = ix.byId.get(state.focusId)!;
  const vs = useMemo(() => visibleSet(ix, state.focusId, phone ? PHONE_BUDGET : DESKTOP_BUDGET), [ix, state.focusId, phone]);
  const placed = useMemo(() => layout(vs), [vs]);

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

  const fitNow = useCallback(
    (animate: boolean) => {
      const s = sceneRef.current;
      if (!s) return;
      const b = bounds(placed, 20);
      b.maxY += phone ? 70 : 40; // keep clear of the controls
      const vp = s.viewport;
      if (phone) return s.setCamera(fit(b, vp, 12), animate);
      // Desktop: the detail card floats on the right; fit the graph to the rest.
      const room = Math.min(CARD_ROOM, vp.width * 0.45);
      const c = fit(b, { width: vp.width - room, height: vp.height }, 40);
      s.setCamera({ ...c, x: c.x + room / 2 / c.scale }, animate);
    },
    [placed, phone],
  );

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.setScene(placed, ix.byId, vs.edges, state.focusId);
    fitNow(true);
  }, [ready, placed, vs, ix, state.focusId, fitNow]);

  useEffect(() => {
    drawerRef.current?.scrollTo({ top: 0 });
  }, [state.focusId]);

  useEffect(() => {
    sceneRef.current?.setHighlight(highlight);
  }, [highlight, ready]);

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
    setState((s) => nav.go(s, id));
  }, []);
  const goBack = useCallback(() => {
    setHighlight(null);
    setOpenWhy(null);
    setState((s) => nav.back(s));
  }, []);
  const goHome = useCallback(() => {
    setHighlight(null);
    setState((s) => (s.focusId === graph.rootId ? s : nav.reset(s, graph.rootId)));
    fitNow(true);
  }, [graph.rootId, fitNow]);
  const zoom = (f: number) => {
    const s = sceneRef.current;
    if (s) s.setCamera(zoomAt(s.camera, s.viewport, f), true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === "Escape" || e.key === "Backspace") {
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
    const s = sceneRef.current;
    if (!s) return;
    const rect = hostRef.current!.getBoundingClientRect();
    s.setCamera(zoomAt(s.camera, s.viewport, Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top), false);
  };
  const clickNode = (id: string) => {
    if (drag.current.moved) return; // that was a drag, not a tap
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
  const orderedForTab = [...vs.nodes].sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.order - b.order);

  return (
    <div className="brain">
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
        <span className="me" aria-label="Sarah Bennett, ONE Complete, founding member">SB</span>
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
                  onPointerEnter={() => sceneRef.current?.setHover(v.node.id)}
                  onPointerLeave={() => sceneRef.current?.setHover(null)}
                  onFocus={() => sceneRef.current?.setHover(v.node.id)}
                  onBlur={() => sceneRef.current?.setHover(null)}
                />
              ))}
            </div>
            {!ready && <div className="loading">Waking ONE…</div>}
          </div>
          <div className="controls" role="toolbar" aria-label="Map controls">
            <button onClick={goBack} disabled={!state.history.length} aria-label="Back">
              ←
            </button>
            <button onClick={() => zoom(1.25)} aria-label="Zoom in">
              +
            </button>
            <button onClick={() => zoom(0.8)} aria-label="Zoom out">
              −
            </button>
            <button onClick={goHome} aria-label="Centre on ONE">
              ◎
            </button>
          </div>
        </section>

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
          <h1 className="d-title">{focus.type === "core" ? "Good morning, Sarah." : focus.label}</h1>
          {focus.secondaryLabel && focus.type !== "core" && <p className="d-sub">{focus.secondaryLabel}</p>}
          {focus.type === "core" && note ? (
            <>
              <p className="d-sum">{note.note}</p>
              {note.source === "ai" && <p className="d-src">Written for you this morning</p>}
            </>
          ) : (
            focus.summary && <p className="d-sum">{focus.summary}</p>
          )}

          {focus.locked && (
            <a className="btn" href={UPGRADE_URL}>
              Add with Complete
            </a>
          )}

          {focus.stats && <Stats stats={focus.stats} color={hex(PRODUCT_COLOR[focus.product])} />}

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
            <div className="d-list">
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

function Stats({ stats, color }: { stats: { label: string; value: string }[]; color: string }) {
  const [hero, ...rest] = stats;
  const m = /^\s*(\d+)\s*\/\s*(\d+)/.exec(hero.value);
  return (
    <div className="stats">
      {m ? (
        <div className="hero">
          <Ring value={Number(m[1])} max={Number(m[2])} color={color} />
          <div>
            <p className="hero-label">{hero.label}</p>
            <p className="hero-value">{hero.value}</p>
          </div>
        </div>
      ) : (
        <div className="row">
          <span>{hero.label}</span>
          <b>{hero.value}</b>
        </div>
      )}
      {rest.map((s) => (
        <div className="row" key={s.label}>
          <span>{s.label}</span>
          <b>{s.value}</b>
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
