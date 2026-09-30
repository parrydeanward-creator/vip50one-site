// The camera: world -> screen. Pure functions; the motion layer eases between
// camera states, the navigation controller decides which state to go to.

export interface Camera {
  x: number; // world point at the viewport centre
  y: number;
  scale: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3;

export function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

export function fit(b: { minX: number; minY: number; maxX: number; maxY: number }, vp: Viewport, pad = 24): Camera {
  const w = Math.max(1, b.maxX - b.minX);
  const h = Math.max(1, b.maxY - b.minY);
  const scale = clampScale(Math.min((vp.width - pad * 2) / w, (vp.height - pad * 2) / h, 1.4));
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, scale };
}

export function toScreen(c: Camera, vp: Viewport, x: number, y: number) {
  return { x: (x - c.x) * c.scale + vp.width / 2, y: (y - c.y) * c.scale + vp.height / 2 };
}

export function toWorld(c: Camera, vp: Viewport, sx: number, sy: number) {
  return { x: (sx - vp.width / 2) / c.scale + c.x, y: (sy - vp.height / 2) / c.scale + c.y };
}

// Zoom keeping the world point under (sx, sy) where it is.
export function zoomAt(c: Camera, vp: Viewport, factor: number, sx = vp.width / 2, sy = vp.height / 2): Camera {
  const scale = clampScale(c.scale * factor);
  const before = toWorld(c, vp, sx, sy);
  const next = { ...c, scale };
  const after = toWorld(next, vp, sx, sy);
  return { x: c.x + (before.x - after.x), y: c.y + (before.y - after.y), scale };
}

export function pan(c: Camera, dxScreen: number, dyScreen: number): Camera {
  return { ...c, x: c.x - dxScreen / c.scale, y: c.y - dyScreen / c.scale };
}

export function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // ease in-out cubic
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, scale: a.scale + (b.scale - a.scale) * e };
}
