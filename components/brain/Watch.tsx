"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bounds } from "@/lib/brain/layout.ts";
import { fit } from "@/lib/brain/camera.ts";
import { PRODUCT_COLOR, hex } from "@/lib/brain/theme.ts";
import { SPOTS, WATCH_STEPS, graphAt, shownAt, watchGraph, watchPlaced } from "@/lib/watch.ts";
import { FILM_SPOTS, FILM_STEPS, filmGraph } from "@/lib/film.ts";
import { productFilm, type FilmProduct } from "@/lib/productFilms.ts";
import type { BrainScene, SceneEdge } from "./scene.ts";

// Watch ONE Work: the scripted story, drawn by the same scene as the
// dashboard. Captions carry the words; the canvas is decoration for screen
// readers (aria-hidden), so every step is also read out.

const PHONE_QUERY = "(max-width: 719px)";
const NOTE = "Example agent; people and addresses are invented. Coming: being connected now.";

export default function Watch({ record = false, slow = 1, film = false, product }: { record?: boolean; slow?: number; film?: boolean; product?: FilmProduct }) {
  // Which film: one product's, the long ONE film, or the short story.
  const pf = useMemo(() => (product ? productFilm(product) : null), [product]);
  const STEPS = pf ? pf.steps : film ? FILM_STEPS : WATCH_STEPS;
  const spots = pf ? pf.spots : film ? FILM_SPOTS : SPOTS;
  const center = pf ? pf.center : "one";
  const keep = pf ? pf.keep : undefined;
  const base = useMemo(() => (pf ? pf.graph : film ? filmGraph() : watchGraph()), [pf, film]);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState(false);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const graph = useMemo(() => graphAt(base, i, STEPS), [base, i, STEPS]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

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
      await scene.init(hostRef.current, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      if (dead) return scene.destroy();
      scene.timeScale = 1 / slow;
      sceneRef.current = scene;
      setReady(true);
    })();
    return () => {
      dead = true;
      mq.removeEventListener("change", onMq);
      scene?.destroy();
      sceneRef.current = null;
    };
  }, []);

  // Draw the step: what is on screen, where the camera looks, the light.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const shown = new Set(shownAt(i, STEPS, keep));
    const placed = watchPlaced(shown, graph, spots, center);
    const edges: SceneEdge[] = graph.edges
      .filter((e) => shown.has(e.source) && shown.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, kind: e.relationshipType === "belongs_to" ? "tree" : "link" }));
    scene.setScene(placed, byId, edges, center);
    const focus = new Set(step.focus);
    const b = bounds(placed.filter((p) => focus.has(p.id)), 60);
    b.minY -= 40; // glow and rings above the top node
    // Fit into the part of the screen the caption leaves free: under it on a
    // phone, above it on desktop; the closing words need more room.
    const vp = scene.viewport;
    const [top, bottom] = phone ? (last ? [0, 330] : [200, 150]) : last ? [0, 320] : [0, 230];
    const c = fit(b, { width: vp.width, height: vp.height - top - bottom }, 24);
    scene.setCamera({ ...c, y: c.y - (top - bottom) / 2 / c.scale }, i > 0);
    if (step.flight) {
      const [from, to] = step.flight;
      const t = setTimeout(() => scene.signal(from, to), 650 * slow);
      return () => clearTimeout(t);
    }
  }, [ready, i, phone, graph, byId, step, last, slow, STEPS, spots, center, keep]);

  // Advance.
  useEffect(() => {
    if (!ready || !playing || last) return;
    const t = setTimeout(() => setI((n) => n + 1), step.ms * slow);
    return () => clearTimeout(t);
  }, [ready, playing, i, step, last, slow]);

  const replay = () => {
    setI(0);
    setPlaying(true);
  };
  const color = hex(PRODUCT_COLOR[step.product]);

  return (
    <div className={`brain watch${record ? " recording" : ""}${last ? " ended" : ""}`}>
      <header className="bar">
        <a className="brand" href="/dashboard" aria-label="VIP-50 ONE, your dashboard">
          VIP-50 <b>ONE</b>
        </a>
        <span className="crumbs">Watch ONE Work</span>
        {!record && (
          <a className="watch-exit" href="/dashboard">
            Explore my business →
          </a>
        )}
      </header>
      <section className="canvas-wrap watch-stage" aria-label="Watch ONE Work">
        <div ref={hostRef} className="canvas" aria-hidden="true" />
        {!ready && <p className="loading">ONE is waking up</p>}

        <div className="watch-live" role="status" aria-live="polite">
          {ready && !last && (
            <div className="watch-card pop" key={step.id} style={slow > 1 ? { animationDuration: `${420 * slow}ms` } : undefined}>
              <p className="watch-kicker" style={{ color }}>
                {step.kicker}
                {step.n && <span className="watch-n"> · {step.n[0]} of {step.n[1]}</span>}
                {step.coming && <span className="watch-coming">Coming</span>}
              </p>
              <p className="watch-title">{step.title}</p>
              {step.line && <p className="watch-line">{step.line}</p>}
            </div>
          )}
          {ready && last && (
            <div className="watch-end pop" style={slow > 1 ? { animationDuration: `${420 * slow}ms` } : undefined}>
              <p className="watch-tag">
                {tagLines(step.title).map((l, k, all) => (
                  <span key={k}>
                    {k === all.length - 1 ? <b>{l}</b> : l}
                    {k < all.length - 1 && <br />}
                  </span>
                ))}
              </p>
              {!record && (
                <div className="watch-end-actions">
                  <button onClick={replay}>↺ Watch again</button>
                  <a href="/dashboard">Explore my business</a>
                </div>
              )}
              <p className="watch-end-note">{NOTE}</p>
            </div>
          )}
        </div>

        {!record && ready && !last && (
          <div className="controls" role="toolbar" aria-label="Story controls">
            <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
              {playing ? "❚❚" : "▶"}
            </button>
            <button onClick={replay} aria-label="Start again">
              ↺
            </button>
            <button onClick={() => setI(STEPS.length - 1)} aria-label="Skip to the end">
              ⏭
            </button>
          </div>
        )}
        <p className="watch-note">{NOTE}</p>
      </section>
    </div>
  );
}

// "One relationship. Five products. One connected system." -> one sentence a line
function tagLines(t: string): string[] {
  return (t.match(/[^.]+\./g) ?? [t]).map((x) => x.trim());
}
