"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bounds } from "@/lib/brain/layout.ts";
import { fit } from "@/lib/brain/camera.ts";
import { PRODUCT_COLOR, hex } from "@/lib/brain/theme.ts";
import { WATCH_STEPS, shownAt, watchGraph, watchPlaced } from "@/lib/watch.ts";
import type { BrainScene, SceneEdge } from "./scene.ts";

// Watch ONE Work: the scripted story, drawn by the same scene as the
// dashboard. Captions carry the words; the canvas is decoration for screen
// readers (aria-hidden), so every step is also read out.

const PHONE_QUERY = "(max-width: 719px)";
const NOTE = "Example agent; people and addresses are invented. Coming: being connected now.";
const STORY = WATCH_STEPS.filter((s) => s.id !== "intro" && s.id !== "outro").length;

export default function Watch({ record = false, slow = 1 }: { record?: boolean; slow?: number }) {
  const graph = useMemo(() => watchGraph(), []);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState(false);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const step = WATCH_STEPS[i];
  const last = i === WATCH_STEPS.length - 1;

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
    const shown = new Set(shownAt(i));
    const placed = watchPlaced(shown, graph);
    const edges: SceneEdge[] = graph.edges
      .filter((e) => shown.has(e.source) && shown.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, kind: e.relationshipType === "belongs_to" ? "tree" : "link" }));
    scene.setScene(placed, byId, edges, "one");
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
  }, [ready, i, phone, graph, byId, step, last, slow]);

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
  const storyN = WATCH_STEPS.slice(0, i + 1).filter((s) => s.id !== "intro" && s.id !== "outro").length;
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
                {step.id !== "intro" && <span className="watch-n"> · {storyN} of {STORY}</span>}
                {step.coming && <span className="watch-coming">Coming</span>}
              </p>
              <p className="watch-title">{step.title}</p>
              {step.line && <p className="watch-line">{step.line}</p>}
            </div>
          )}
          {ready && last && (
            <div className="watch-end pop" style={slow > 1 ? { animationDuration: `${420 * slow}ms` } : undefined}>
              <p className="watch-tag">
                One relationship.
                <br />
                Five products.
                <br />
                <b>One connected system.</b>
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
            <button onClick={() => setI(WATCH_STEPS.length - 1)} aria-label="Skip to the end">
              ⏭
            </button>
          </div>
        )}
        <p className="watch-note">{NOTE}</p>
      </section>
    </div>
  );
}
