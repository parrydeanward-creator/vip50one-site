import { FillGradient, Graphics, Texture } from "pixi.js";

// Drawing helpers for the Brain's look (Parry's reference board, 30 Sep):
// luminous glass orbs lit by their product colour, simple line icons, a
// golden ONE core. Pure drawing; no state.

let glowTex: Texture | null = null;

// A soft white radial falloff, tinted per node and added on top: cheap bloom.
export function glowTexture(): Texture {
  if (glowTex) return glowTex;
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.35, "rgba(255,255,255,0.22)");
  g.addColorStop(0.7, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTex = Texture.from(c);
  return glowTex;
}

const hexStr = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

// Dark glass centre, lit toward the rim by the product colour.
export function orbBody(g: Graphics, r: number, color: number, strength = 1) {
  const fill = new FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.5,
    colorStops: [
      { offset: 0, color: "#070b18" },
      { offset: 0.55, color: "#0b1020" },
      { offset: 0.86, color: mix(0x0b1020, color, 0.38 * strength) },
      { offset: 1, color: mix(0x0b1020, color, 0.75 * strength) },
    ],
  });
  g.circle(0, 0, r).fill(fill);
  // top highlight, like light on glass
  g.ellipse(0, -r * 0.52, r * 0.55, r * 0.22).fill({ color: 0xffffff, alpha: 0.05 * strength });
  g.circle(0, 0, r).stroke({ width: Math.max(2, r * 0.06), color, alpha: 0.95 * strength });
  g.circle(0, 0, r - Math.max(2, r * 0.06)).stroke({ width: 1, color: 0xffffff, alpha: 0.18 * strength });
}

export function coreBody(g: Graphics, r: number) {
  const fill = new FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.45 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.5,
    colorStops: [
      { offset: 0, color: "#3a2c0a" },
      { offset: 0.5, color: "#1c1608" },
      { offset: 0.8, color: "#5a4312" },
      { offset: 0.95, color: "#d9a72e" },
      { offset: 1, color: "#ffd86a" },
    ],
  });
  g.circle(0, 0, r).fill(fill);
  g.circle(0, 0, r).stroke({ width: 3, color: 0xffd86a, alpha: 1 });
  g.circle(0, 0, r * 0.9).stroke({ width: 1, color: 0xffe9a8, alpha: 0.35 });
  g.ellipse(0, -r * 0.55, r * 0.5, r * 0.18).fill({ color: 0xffffff, alpha: 0.07 });
}

// Tilted orbit ellipses with a few sparks; drawn once, rotated slowly.
export function orbit(g: Graphics, rx: number, ry: number, color: number, alpha: number) {
  g.ellipse(0, 0, rx, ry).stroke({ width: 1.2, color, alpha });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    g.circle(Math.cos(a) * rx, Math.sin(a) * ry, i % 2 ? 1.6 : 2.4).fill({ color: 0xfff1c0, alpha: 0.85 });
  }
}

// A starfield/constellation for depth. Screen-sized, drawn once.
export function constellation(g: Graphics, w: number, h: number) {
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pts = Array.from({ length: Math.round((w * h) / 9000) }, () => ({ x: rnd() * w, y: rnd() * h, s: rnd() }));
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < Math.min(pts.length, i + 6); j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      if (dx * dx + dy * dy < 130 * 130) g.moveTo(pts[i].x, pts[i].y).lineTo(pts[j].x, pts[j].y);
    }
  }
  g.stroke({ width: 0.6, color: 0x6f86c6, alpha: 0.08 });
  for (const p of pts) g.circle(p.x, p.y, 0.6 + p.s * 1.4).fill({ color: p.s > 0.85 ? 0xf5c542 : 0x9fb3e6, alpha: 0.15 + p.s * 0.35 });
}

import type { IconKind } from "@/lib/brain/icons.ts";
export type { IconKind };

// Simple line icons centred on (0, 0) within a `s`-sized box.
export function icon(g: Graphics, kind: IconKind, s: number, color: number) {
  const w = Math.max(1.6, s * 0.09);
  const st = { width: w, color, alpha: 1, cap: "round" as const, join: "round" as const };
  const h = s / 2;
  switch (kind) {
    case "go":
    case "check":
      g.roundRect(-h, -h, s, s, s * 0.22).stroke(st);
      g.moveTo(-h * 0.45, 0).lineTo(-h * 0.08, h * 0.38).lineTo(h * 0.5, -h * 0.35).stroke(st);
      break;
    case "move":
    case "people":
      g.circle(0, -h * 0.35, h * 0.3).stroke(st);
      g.arc(0, h * 0.75, h * 0.62, Math.PI * 1.1, Math.PI * 1.9).stroke(st);
      g.circle(-h * 0.72, -h * 0.15, h * 0.22).stroke(st);
      g.circle(h * 0.72, -h * 0.15, h * 0.22).stroke(st);
      break;
    case "marquee":
    case "house":
      g.moveTo(-h, -h * 0.05).lineTo(0, -h * 0.9).lineTo(h, -h * 0.05).stroke(st);
      g.moveTo(-h * 0.7, -h * 0.25).lineTo(-h * 0.7, h * 0.85).lineTo(h * 0.7, h * 0.85).lineTo(h * 0.7, -h * 0.25).stroke(st);
      g.rect(-h * 0.2, h * 0.3, h * 0.4, h * 0.55).stroke(st);
      break;
    case "showly":
      g.moveTo(-h, -h * 0.05).lineTo(0, -h * 0.9).lineTo(h, -h * 0.05).stroke(st);
      g.moveTo(-h * 0.7, -h * 0.25).lineTo(-h * 0.7, h * 0.85).lineTo(h * 0.7, h * 0.85).lineTo(h * 0.7, -h * 0.25).stroke(st);
      g.circle(0, h * 0.28, h * 0.22).fill({ color, alpha: 1 });
      break;
    case "open":
      g.rect(-h * 0.6, -h * 0.9, h * 1.2, h * 1.8).stroke(st);
      g.moveTo(-h * 0.6, -h * 0.9).lineTo(h * 0.15, -h * 0.6).lineTo(h * 0.15, h * 1.05).lineTo(-h * 0.6, h * 0.9).stroke(st);
      g.circle(-h * 0.05, h * 0.1, w * 0.8).fill({ color });
      break;
    case "calendar":
      g.roundRect(-h, -h * 0.75, s, s * 0.85, s * 0.12).stroke(st);
      g.moveTo(-h, -h * 0.3).lineTo(h, -h * 0.3).stroke(st);
      g.moveTo(-h * 0.45, -h).lineTo(-h * 0.45, -h * 0.55).moveTo(h * 0.45, -h).lineTo(h * 0.45, -h * 0.55).stroke(st);
      break;
    case "star": {
      const pts: number[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? h * 0.42 : h;
        pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.poly(pts).stroke(st);
      break;
    }
    case "map":
      g.circle(0, -h * 0.25, h * 0.5).stroke(st);
      g.moveTo(-h * 0.45, 0).lineTo(0, h).lineTo(h * 0.45, 0).stroke(st);
      g.circle(0, -h * 0.25, h * 0.15).fill({ color });
      break;
    case "chat":
      g.roundRect(-h, -h * 0.75, s, s * 0.7, s * 0.2).stroke(st);
      g.moveTo(-h * 0.4, h * 0.05).lineTo(-h * 0.6, h * 0.7).lineTo(0, h * 0.05).stroke(st);
      break;
    case "trophy":
      g.moveTo(-h * 0.6, -h * 0.8).lineTo(h * 0.6, -h * 0.8).lineTo(h * 0.45, 0).lineTo(-h * 0.45, 0).closePath().stroke(st);
      g.moveTo(0, 0).lineTo(0, h * 0.55).moveTo(-h * 0.45, h * 0.8).lineTo(h * 0.45, h * 0.8).stroke(st);
      break;
    case "list":
      for (const y of [-0.55, 0, 0.55]) {
        g.circle(-h * 0.75, y * h, w * 0.7).fill({ color });
        g.moveTo(-h * 0.4, y * h).lineTo(h, y * h).stroke(st);
      }
      break;
    case "bolt":
      g.poly([h * 0.15, -h, -h * 0.55, h * 0.15, 0, h * 0.15, -h * 0.15, h, h * 0.55, -h * 0.15, 0, -h * 0.15]).stroke(st);
      break;
    case "none":
      break;
  }
}

export function mix(a: number, b: number, t: number): string {
  const ch = (n: number, s: number) => (n >> s) & 255;
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return hexStr((m(16) << 16) | (m(8) << 8) | m(0));
}
