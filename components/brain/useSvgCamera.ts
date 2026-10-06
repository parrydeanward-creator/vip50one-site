"use client";

import { useEffect, useRef, useState } from "react";

// Zoom and pan for a full-window SVG view, the way the Brain map moves:
// two-finger swipe or pinch zooms around the fingers, dragging the
// background pans, buttons zoom about the centre. Used by the native ONE MOVE
// pages (the Daily Tracker; the VIP rings carry their own copy).
export function useSvgCamera(size: number) {
  const c0 = { x: size / 2, y: size / 2, s: 1 };
  const [cam, setCam] = useState(c0);
  const svgRef = useRef<SVGSVGElement>(null);
  const anim = useRef(0);
  const g = useRef({ pointers: new Map<number, { x: number; y: number }>(), pinch: 0, pan: false, lx: 0, ly: 0 });

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };
  const zoomAt = (factor: number, at?: { x: number; y: number }) => {
    cancelAnimationFrame(anim.current);
    setCam((c) => {
      const s2 = Math.min(4, Math.max(0.6, c.s * factor));
      const k = c.s / s2;
      const p = at ?? { x: c.x, y: c.y };
      return { s: s2, x: p.x - (p.x - c.x) * k, y: p.y - (p.y - c.y) * k };
    });
  };
  // Every orb, every view (Parry, 6 Oct, hard rule): the orb clicked glides to the middle and opens in the
  // side panel. centreOn eases the camera there; reset eases back to the whole view.
  const now = useRef(cam);
  now.current = cam;
  useEffect(() => () => cancelAnimationFrame(anim.current), []);
  const glide = (to: { x: number; y: number; s: number }) => {
    cancelAnimationFrame(anim.current);
    if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setCam(to);
    const from = now.current;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 420);
      const e = 1 - Math.pow(1 - k, 3);
      setCam({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, s: from.s + (to.s - from.s) * e });
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };
  const reset = () => glide(c0);
  const centreOn = (x: number, y: number, zoom = 1.25) => glide({ x, y, s: Math.max(now.current.s, zoom) });
  const viewBox = `${cam.x - size / (2 * cam.s)} ${cam.y - size / (2 * cam.s)} ${size / cam.s} ${size / cam.s}`;

  const handlers = {
    onWheel: (e: React.WheelEvent) => zoomAt(Math.exp(-e.deltaY * 0.0015), toSvg(e)),
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.target as Element).closest?.("[data-tap]")) return;
      cancelAnimationFrame(anim.current);
      const s = g.current;
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      if (s.pointers.size === 2) {
        const [a, b] = [...s.pointers.values()];
        s.pinch = Math.hypot(a.x - b.x, a.y - b.y);
        s.pan = false;
      } else {
        s.pan = true;
        s.lx = e.clientX;
        s.ly = e.clientY;
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = g.current;
      if (!s.pointers.has(e.pointerId)) return;
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (s.pointers.size === 2) {
        const [a, b] = [...s.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (s.pinch > 0) zoomAt(d / s.pinch, toSvg({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }));
        s.pinch = d;
      } else if (s.pan) {
        const p0 = toSvg({ clientX: s.lx, clientY: s.ly });
        const p1 = toSvg(e);
        setCam((c) => ({ ...c, x: c.x - (p1.x - p0.x), y: c.y - (p1.y - p0.y) }));
        s.lx = e.clientX;
        s.ly = e.clientY;
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = g.current;
      s.pointers.delete(e.pointerId);
      s.pinch = 0;
      if (!s.pointers.size) s.pan = false;
    },
  };
  return { svgRef, viewBox, zoomAt, reset, centreOn, handlers: { ...handlers, onPointerCancel: handlers.onPointerUp } };
}
