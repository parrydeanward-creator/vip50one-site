import { Application, Assets, Container, Graphics, Sprite as PixiSprite, Text, type Texture } from "pixi.js";
import type { GraphNode, ProductKey } from "@/lib/graph/types.ts";
import type { Placed } from "@/lib/brain/layout.ts";
import { type Camera, type Viewport, lerpCamera, toScreen } from "@/lib/brain/camera.ts";
import { GOLD, GOLD_LIGHT, GREY, PRODUCT_COLOR, STATUS, WHITE } from "@/lib/brain/theme.ts";
import { constellation, coreBody, glowTexture, icon, orbBody, orbit } from "./draw.ts";
import { iconFor } from "@/lib/brain/icons.ts";

// Layers 3 and 4 on the GPU: draws what presentation placed, and eases every
// change (motion). It never decides what is shown or what anything means.

interface Sprite {
  id: string;
  node: GraphNode;
  root: Container;
  glow: PixiSprite;
  body: Graphics;
  deco: Container; // icon, initials, status ring, core internals
  label: Text;
  sub: Text;
  cur: { x: number; y: number; r: number; a: number };
  tgt: { x: number; y: number; r: number; a: number };
  drawnR: number;
  drawnKey: string;
  phase: number;
  leaving: boolean;
  role: string;
}

// A one-off ring that spreads out from a node: "this changed" (Since you were
// last here). Plays once; skipped under reduced motion.
interface Ping {
  id: string;
  t: number;
  color: number;
}

interface Pulse {
  from: string;
  to: string;
  t: number;
  color: number;
}

// A live signal: a brighter light with a short trail that travels from the
// product it came from into ONE, which rings when it lands.
interface Flight {
  from: string;
  to: string;
  t: number;
  color: number;
}

export interface SceneEdge {
  source: string;
  target: string;
  kind: "tree" | "link";
}

const HALO_WORDS = ["UNDERSTANDS", "REMEMBERS", "CONNECTS", "PRIORITIZES", "RECOMMENDS", "ACTS"];
const FONT = "Inter Tight, Inter, system-ui, sans-serif";

function initials(label: string) {
  const name = label.replace(/^(Call|Text|Send note to|Social touch:|Face-to-face:)\s*/i, "").replace(/^the\s+/i, "");
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

export class BrainScene {
  app = new Application();
  private bg = new Graphics();
  private world = new Container();
  private edgeG = new Graphics();
  private pulseG = new Graphics();
  private nodes = new Container();
  private halo = new Container();
  private orbits = new Container();
  private sprites = new Map<string, Sprite>();
  // Faces and homes: a loaded photo per URL; null when it failed (initials stay).
  private photos = new Map<string, Texture | null>();
  private edges: SceneEdge[] = [];
  private pulses: Pulse[] = [];
  private pings: Ping[] = [];
  private flights: Flight[] = [];
  private pingG = new Graphics();
  private focusId = "";
  private hoverId: string | null = null;
  private dimOthers: Set<string> | null = null;
  private cam: Camera = { x: 0, y: 0, scale: 1 };
  private camFrom: Camera = this.cam;
  private camTo: Camera = this.cam;
  private camT = 1;
  private time = 0;
  private nextBeat = 2.5;
  private idleFor = 0;
  private ready = false;
  private haloWord!: Text;
  private haloIndex = 0;
  private bgSize = "";
  reducedMotion = false;
  // Below 1 slows every motion (used only to record Watch ONE Work smoothly
  // on a slow machine; the video is sped back up).
  timeScale = 1;
  onFrame: (() => void) | null = null;

  async init(host: HTMLElement, reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
    await this.app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: "webgl",
    });
    host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute("aria-hidden", "true");
    this.world.addChild(this.orbits, this.edgeG, this.pingG, this.nodes, this.halo, this.pulseG);
    this.app.stage.addChild(this.bg, this.world);
    this.buildHalo();
    this.buildOrbits();
    this.app.ticker.add((t) => this.frame(t.deltaMS / 1000));
    document.addEventListener("visibilitychange", this.onVisibility);
    this.ready = true;
  }

  destroy() {
    document.removeEventListener("visibilitychange", this.onVisibility);
    if (this.ready) this.app.destroy(true, { children: true });
  }

  private onVisibility = () => {
    if (document.hidden) this.app.ticker.stop();
    else this.app.ticker.start();
  };

  get viewport(): Viewport {
    return { width: this.app.screen.width, height: this.app.screen.height };
  }

  get camera(): Camera {
    return this.cam;
  }

  // ---- inputs from presentation -----------------------------------------

  setScene(placed: Placed[], nodes: Map<string, GraphNode>, edges: SceneEdge[], focusId: string) {
    const prevFocus = this.focusId;
    this.focusId = focusId;
    this.edges = edges;
    const keep = new Set(placed.map((p) => p.id));
    for (const s of this.sprites.values()) {
      if (!keep.has(s.id)) {
        s.leaving = true;
        s.tgt.a = 0;
      }
    }
    const origin = this.sprites.get(focusId)?.cur ?? { x: 0, y: 0 };
    for (const p of placed) {
      const node = nodes.get(p.id)!;
      const alpha = p.role === "ancestor" ? 0.6 : p.role === "sibling" ? 0.45 : p.role === "related" ? 0.85 : 1;
      let s = this.sprites.get(p.id);
      if (!s) {
        s = this.makeSprite(node);
        s.cur = { x: origin.x, y: origin.y, r: p.r * 0.3, a: 0 }; // grow out of the node that opened them
        this.sprites.set(p.id, s);
      }
      s.node = node;
      s.leaving = false;
      s.role = p.role;
      s.tgt = { x: p.x, y: p.y, r: p.r, a: node.locked ? alpha * 0.5 : alpha };
      if (this.reducedMotion) s.cur = { ...s.tgt };
      this.style(s, p.role);
    }
    if (prevFocus && prevFocus !== focusId && !this.reducedMotion) {
      this.pulses.push({ from: prevFocus, to: focusId, t: 0, color: GOLD_LIGHT });
    }
    this.idleFor = 0;
  }

  setCamera(c: Camera, animate = true) {
    if (!animate || this.reducedMotion) {
      this.cam = this.camFrom = this.camTo = c;
      this.camT = 1;
    } else {
      this.camFrom = this.cam;
      this.camTo = c;
      this.camT = 0;
    }
    this.idleFor = 0;
  }

  setHover(id: string | null) {
    this.hoverId = id;
    this.idleFor = 0;
  }

  // Highlight a set (e.g. SHOW ME); everything else fades, nothing disappears.
  setHighlight(ids: string[] | null) {
    this.dimOthers = ids ? new Set(ids) : null;
    this.idleFor = 0;
  }

  // Ring out once from each node (it changed since the agent was last here).
  ping(ids: string[]) {
    if (this.reducedMotion) return;
    ids.forEach((id, i) => {
      const s = this.sprites.get(id);
      this.pings.push({ id, t: -i * 0.35, color: s ? PRODUCT_COLOR[s.node.product as ProductKey] : GOLD });
    });
    this.idleFor = 0;
  }

  // Something new arrived in a product (live signals). Returns false when it
  // cannot be drawn (reduced motion, or either end off screen).
  signal(from: string, to: string): boolean {
    const a = this.sprites.get(from), b = this.sprites.get(to);
    if (this.reducedMotion || !a || !b || a.leaving || b.leaving || from === to) return false;
    const color = PRODUCT_COLOR[a.node.product as ProductKey] ?? GOLD;
    this.pings.push({ id: from, t: 0, color });
    this.flights.push({ from, to, t: -0.25, color });
    this.idleFor = 0;
    return true;
  }

  isVisible(id: string): boolean {
    const s = this.sprites.get(id);
    return !!s && !s.leaving && s.tgt.a > 0.05;
  }

  screenOf(id: string): { x: number; y: number; r: number; a: number } | null {
    const s = this.sprites.get(id);
    if (!s || s.leaving) return null;
    const p = toScreen(this.cam, this.viewport, s.cur.x, s.cur.y);
    return { x: p.x, y: p.y, r: s.cur.r * this.cam.scale, a: s.cur.a };
  }

  // ---- drawing ------------------------------------------------------------

  private makeSprite(node: GraphNode): Sprite {
    const root = new Container();
    const glow = new PixiSprite(glowTexture());
    glow.anchor.set(0.5);
    glow.blendMode = "add";
    const body = new Graphics();
    const deco = new Container();
    const label = new Text({ text: "", style: { fontFamily: FONT, fontSize: 15, fontWeight: "700", fill: WHITE, align: "center", letterSpacing: 0.6 }, resolution: 3 });
    const sub = new Text({ text: "", style: { fontFamily: FONT, fontSize: 12, fill: GREY, align: "center" }, resolution: 3 });
    label.anchor.set(0.5, 0);
    sub.anchor.set(0.5, 0);
    root.addChild(glow, body, deco, label, sub);
    this.nodes.addChild(root);
    return { id: node.id, node, root, glow, body, deco, label, sub, cur: { x: 0, y: 0, r: 1, a: 0 }, tgt: { x: 0, y: 0, r: 1, a: 1 }, drawnR: 0, drawnKey: "", phase: Math.random() * Math.PI * 2, leaving: false, role: "" };
  }

  // Starts loading a photo the first time it is needed; the orb keeps its
  // initials or icon until it arrives, and for good if it fails.
  private photoFor(url: string): Texture | null {
    if (this.photos.has(url)) return this.photos.get(url) ?? null;
    this.photos.set(url, null);
    Assets.load<Texture>({ src: url, parser: "texture" })
      .then((tex) => {
        this.photos.set(url, tex);
        for (const sp of this.sprites.values())
          if (sp.node.image === url && !sp.leaving) {
            sp.drawnKey = "";
            this.style(sp, sp.role);
          }
      })
      .catch(() => this.photos.set(url, null));
    return null;
  }

  private style(s: Sprite, role: string) {
    const n = s.node;
    const photo = n.image ? this.photoFor(n.image) : null;
    const key = `${n.type}|${n.status}|${n.locked}|${role}|${n.label}|${n.secondaryLabel}|${s.tgt.r}|${photo ? "p" : ""}`;
    if (key === s.drawnKey) return;
    s.drawnKey = key;
    const r = s.tgt.r;
    s.drawnR = r;
    const color = n.locked ? 0x4a5268 : PRODUCT_COLOR[n.product as ProductKey];
    const b = s.body.clear();
    for (const c of s.deco.removeChildren()) c.destroy({ children: true });

    if (n.type === "core") {
      s.glow.tint = GOLD;
      s.glow.width = s.glow.height = r * 4.2;
      s.glow.alpha = 0.95;
      coreBody(b, r);
      const one = new Text({ text: "ONE", style: { fontFamily: "Bebas Neue, Inter Tight, sans-serif", fontSize: Math.round(r * 0.62), fill: WHITE, letterSpacing: r * 0.04, dropShadow: { color: 0xffd86a, blur: 8, distance: 0, alpha: 0.6 } }, resolution: 3 });
      one.anchor.set(0.5);
      one.y = -r * 0.1;
      const tag = new Text({ text: "AI INTELLIGENCE", style: { fontFamily: FONT, fontSize: Math.max(7, r * 0.1), fontWeight: "700", fill: 0xf6e7b8, letterSpacing: 2 }, resolution: 3 });
      tag.anchor.set(0.5);
      tag.y = r * 0.3;
      tag.visible = role !== "ancestor";
      s.deco.addChild(one, tag);
      s.label.text = "";
      s.sub.text = "";
      return;
    }

    const lit = role === "sibling" || role === "ancestor" ? 0.55 : 1;
    s.glow.tint = color;
    s.glow.width = s.glow.height = r * (n.type === "product" ? 3.6 : 3);
    s.glow.alpha = (n.type === "product" || role === "focus" ? 0.75 : 0.45) * lit;
    orbBody(b, r, color, lit);

    // Progress arc for nodes whose headline number is "x / y" (e.g. 14 / 25).
    const ratio = /^\s*(\d+)\s*\/\s*(\d+)/.exec(n.stats?.[0]?.value ?? "");
    if (ratio && !n.locked && (role === "focus" || role === "child")) {
      const frac = Math.max(0, Math.min(1, Number(ratio[1]) / Number(ratio[2])));
      const ar = r + 11;
      const arc = new Graphics();
      arc.circle(0, 0, ar).stroke({ width: 3, color: 0xffffff, alpha: 0.08 });
      if (frac > 0) {
        arc.moveTo(0, -ar).arc(0, 0, ar, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2).stroke({ width: 3, color: lighten(color), alpha: 0.95, cap: "round" });
      }
      s.deco.addChild(arc);
    }

    // Status as a small badge on the rim (its label is in the card and the
    // button's name), not a second ring fighting the product colour.
    const d = new Graphics();
    d.label = "status";
    if (n.status && !n.locked && role !== "sibling" && role !== "ancestor") {
      const st = STATUS[n.status];
      const bx = Math.cos(-Math.PI / 4) * r, by = Math.sin(-Math.PI / 4) * r;
      const br = Math.max(5, r * 0.13);
      d.circle(bx, by, br + 3).fill({ color: 0x070b18, alpha: 1 });
      d.circle(bx, by, br).fill({ color: st.color, alpha: 1 });
    }
    s.deco.addChild(d);

    const inside = n.type === "product" || role === "focus";
    if (photo && !inside && !n.locked) {
      // The person's face or the home, cropped to the orb.
      const pic = new PixiSprite(photo);
      pic.anchor.set(0.5);
      const fit = r * 0.9;
      pic.scale.set((fit * 2) / Math.min(photo.width, photo.height));
      const mask = new Graphics().circle(0, 0, fit).fill({ color: 0xffffff });
      pic.mask = mask;
      s.deco.addChild(mask, pic);
    } else if (n.type === "person") {
      const t = new Text({ text: initials(n.label), style: { fontFamily: FONT, fontSize: Math.round(r * 0.62), fontWeight: "700", fill: WHITE }, resolution: 3 });
      t.anchor.set(0.5);
      s.deco.addChild(t);
    } else {
      const ig = new Graphics();
      const size = inside ? r * 0.46 : r * 0.62;
      icon(ig, iconFor(n), size, color === 0x4a5268 ? 0x8a93a8 : lighten(color));
      ig.y = inside ? -r * 0.36 : 0;
      s.deco.addChild(ig);
    }

    s.label.style.fontSize = role === "sibling" || role === "ancestor" ? 12 : inside ? Math.max(14, Math.round(r * 0.24)) : 13;
    s.label.text = n.type === "product" ? n.label : n.label;
    s.sub.text = n.locked ? "Included in Complete" : n.secondaryLabel ?? "";
    s.sub.style.wordWrap = true;
    if (inside && role !== "ancestor") {
      s.label.y = r * 0.08;
      s.sub.style.fontSize = Math.max(10, Math.round(r * 0.14));
      s.sub.style.wordWrapWidth = r * 1.5;
      s.sub.y = s.label.y + s.label.height;
    } else {
      s.label.y = r + 10;
      s.sub.style.fontSize = 12;
      s.sub.style.wordWrapWidth = 150;
      s.sub.y = s.label.y + s.label.height + 1;
    }
    s.sub.visible = role !== "ancestor" && role !== "sibling";
    s.label.alpha = role === "ancestor" ? 0.8 : 1;
  }

  private buildHalo() {
    this.haloWord = new Text({ text: HALO_WORDS[0], style: { fontFamily: FONT, fontSize: 9, fontWeight: "700", fill: GOLD_LIGHT, letterSpacing: 2.6 }, resolution: 3 });
    this.haloWord.anchor.set(0.5);
    this.haloWord.y = 118;
    this.halo.addChild(this.haloWord);
  }

  // Tilted orbits around ONE (reference panel 1). Rotate very slowly.
  private buildOrbits() {
    const a = new Graphics();
    orbit(a, 150, 52, GOLD, 0.35);
    a.rotation = -0.35;
    const b = new Graphics();
    orbit(b, 138, 70, GOLD_LIGHT, 0.22);
    b.rotation = 0.5;
    const c = new Graphics();
    orbit(c, 200, 92, GOLD, 0.12);
    c.rotation = 0.1;
    this.orbits.addChild(c, a, b);
  }

  private tickHalo() {
    const period = 3.2;
    const phase = this.time % period;
    const i = Math.floor(this.time / period) % HALO_WORDS.length;
    if (i !== this.haloIndex) {
      this.haloIndex = i;
      this.haloWord.text = HALO_WORDS[i];
    }
    const fade = Math.min(1, phase / 0.6, (period - phase) / 0.6);
    this.haloWord.alpha = this.reducedMotion ? 0.7 : 0.7 * fade;
  }

  private drawBackground() {
    const { width, height } = this.viewport;
    const key = `${width}x${height}`;
    if (key === this.bgSize) return;
    this.bgSize = key;
    constellation(this.bg.clear(), width, height);
  }

  // ---- motion -------------------------------------------------------------

  private frame(dt: number) {
    dt = Math.min(dt, 0.1) * this.timeScale;
    this.time += dt;
    this.idleFor += dt;
    const k = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 5.5);
    this.drawBackground();

    if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt / 0.9);
      this.cam = lerpCamera(this.camFrom, this.camTo, this.camT);
    }
    const vp = this.viewport;
    this.world.scale.set(this.cam.scale);
    this.world.position.set(vp.width / 2 - this.cam.x * this.cam.scale, vp.height / 2 - this.cam.y * this.cam.scale);
    // Slight parallax: the stars move a fraction of the camera.
    this.bg.position.set((-this.cam.x * 0.04) % 40, (-this.cam.y * 0.04) % 40);

    for (const s of this.sprites.values()) {
      s.cur.x += (s.tgt.x - s.cur.x) * k;
      s.cur.y += (s.tgt.y - s.cur.y) * k;
      s.cur.r += (s.tgt.r - s.cur.r) * k;
      let a = s.tgt.a;
      if (this.dimOthers && !this.dimOthers.has(s.id) && s.id !== this.focusId) a *= 0.22;
      s.cur.a += (a - s.cur.a) * k;
      if (s.leaving && s.cur.a < 0.02) {
        s.root.destroy({ children: true });
        this.sprites.delete(s.id);
        continue;
      }
      let breathe = 1;
      if (!this.reducedMotion) {
        if (s.node.type === "core") breathe = 1 + 0.016 * Math.sin((this.time / 5) * Math.PI * 2);
        else if (s.node.type === "product") breathe = 1 + 0.006 * Math.sin((this.time / 6) * Math.PI * 2 + s.phase);
      }
      const hover = this.hoverId === s.id ? 1.07 : 1;
      s.root.position.set(s.cur.x, s.cur.y);
      s.root.scale.set((s.cur.r / (s.drawnR || 1)) * breathe * hover);
      s.root.alpha = s.cur.a;
      if (this.hoverId === s.id) s.glow.alpha = Math.min(1, s.glow.alpha + 0.02);
      if (s.node.status === "opportunity" && !this.reducedMotion) {
        const st = s.deco.getChildByLabel("status");
        if (st) st.alpha = 0.6 + 0.4 * Math.sin(this.time * 1.6 + s.phase);
      }
    }

    const core = this.sprites.get("one");
    const coreFocused = core && this.focusId === "one";
    if (core) {
      const sc = core.cur.r / 92;
      this.orbits.position.set(core.cur.x, core.cur.y);
      this.orbits.scale.set(sc);
      this.orbits.alpha = core.cur.a * (coreFocused ? 1 : 0.5);
      this.halo.position.set(core.cur.x, core.cur.y);
      this.halo.alpha = coreFocused ? core.cur.a : 0;
    } else {
      this.orbits.alpha = 0;
      this.halo.alpha = 0;
    }
    if (!this.reducedMotion) {
      const [c, a, b] = this.orbits.children;
      c.rotation += dt * 0.012;
      a.rotation += dt * 0.02;
      b.rotation -= dt * 0.016;
    }
    this.tickHalo();

    this.drawEdges();
    this.heartbeat(dt);
    this.drawPulses(dt);
    this.drawFlights(dt);
    this.drawPings(dt);
    this.app.ticker.maxFPS = this.idleFor > 8 ? 30 : 0; // idle: 30fps
    this.onFrame?.();
  }

  private drawEdges() {
    const g = this.edgeG.clear();
    const s = 1 / this.cam.scale;
    for (const e of this.edges) {
      const a = this.sprites.get(e.source), b = this.sprites.get(e.target);
      if (!a || !b) continue;
      const alpha = Math.min(a.cur.a, b.cur.a);
      if (alpha < 0.02) continue;
      const color = b.node.type === "core" ? GOLD : PRODUCT_COLOR[b.node.product as ProductKey];
      const lit = this.hoverId && (this.hoverId === e.source || this.hoverId === e.target) ? 1.7 : 1;
      // a soft wide stroke under a thin bright one: a lit connection
      g.moveTo(a.cur.x, a.cur.y).lineTo(b.cur.x, b.cur.y).stroke({ width: 6 * s, color, alpha: alpha * 0.07 * lit });
      g.moveTo(a.cur.x, a.cur.y).lineTo(b.cur.x, b.cur.y).stroke({ width: (e.kind === "tree" ? 1.4 : 1.1) * s, color, alpha: alpha * (e.kind === "tree" ? 0.45 : 0.6) * lit });
    }
  }

  // ONE's heartbeat: every few seconds a signal leaves the focus along its
  // connections, lights them briefly, and fades.
  private heartbeat(dt: number) {
    if (this.reducedMotion) return;
    this.nextBeat -= dt;
    if (this.nextBeat > 0) return;
    this.nextBeat = 7 + Math.random() * 2;
    const out = this.edges.filter((e) => e.source === this.focusId && e.kind === "tree").slice(0, 8);
    out.forEach((e, i) => {
      const t = this.sprites.get(e.target);
      this.pulses.push({ from: e.source, to: e.target, t: -i * 0.12, color: t ? PRODUCT_COLOR[t.node.product as ProductKey] : GOLD });
    });
  }

  private drawPulses(dt: number) {
    const g = this.pulseG.clear();
    this.pulses = this.pulses.filter((p) => p.t < 1);
    for (const p of this.pulses) {
      p.t += dt / 1.3;
      if (p.t < 0) continue;
      const a = this.sprites.get(p.from), b = this.sprites.get(p.to);
      if (!a || !b) continue;
      const e = p.t < 0.5 ? 2 * p.t * p.t : 1 - (-2 * p.t + 2) ** 2 / 2;
      const x = a.cur.x + (b.cur.x - a.cur.x) * e;
      const y = a.cur.y + (b.cur.y - a.cur.y) * e;
      const fade = Math.sin(Math.PI * Math.min(1, p.t)) * Math.min(a.cur.a, b.cur.a);
      const s = 1 / this.cam.scale;
      g.circle(x, y, 10 * s).fill({ color: p.color, alpha: 0.14 * fade });
      g.circle(x, y, 3 * s).fill({ color: 0xffffff, alpha: 0.9 * fade });
    }
  }

  private drawFlights(dt: number) {
    this.flights = this.flights.filter((f) => {
      if (f.t < 1) return true;
      const to = this.sprites.get(f.to);
      this.pings.push({ id: f.to, t: 0, color: to?.node.type === "core" ? GOLD : f.color });
      return false;
    });
    const g = this.pulseG; // drawn after the heartbeat pulses, same layer
    const s = 1 / this.cam.scale;
    for (const f of this.flights) {
      f.t += dt / 1.4;
      if (f.t < 0) continue;
      const a = this.sprites.get(f.from), b = this.sprites.get(f.to);
      if (!a || !b) continue;
      const alpha = Math.min(a.cur.a, b.cur.a);
      const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
      const at = (t: number) => {
        const e = ease(Math.max(0, Math.min(1, t)));
        return { x: a.cur.x + (b.cur.x - a.cur.x) * e, y: a.cur.y + (b.cur.y - a.cur.y) * e };
      };
      // the path lights up behind the signal
      const tail = at(f.t - 0.22), head = at(f.t);
      g.moveTo(tail.x, tail.y).lineTo(head.x, head.y).stroke({ width: 3 * s, color: f.color, alpha: 0.5 * alpha });
      for (let i = 4; i >= 1; i--) {
        const p = at(f.t - i * 0.035);
        g.circle(p.x, p.y, (5 - i) * 1.4 * s).fill({ color: f.color, alpha: (0.35 - i * 0.06) * alpha });
      }
      g.circle(head.x, head.y, 16 * s).fill({ color: f.color, alpha: 0.18 * alpha });
      g.circle(head.x, head.y, 5 * s).fill({ color: 0xffffff, alpha: 0.95 * alpha });
    }
  }

  private drawPings(dt: number) {
    const g = this.pingG.clear();
    this.pings = this.pings.filter((p) => p.t < 1);
    const s = 1 / this.cam.scale;
    for (const p of this.pings) {
      p.t += dt / 1.8;
      if (p.t < 0) continue;
      const sp = this.sprites.get(p.id);
      if (!sp || sp.cur.a < 0.05) continue;
      const e = 1 - (1 - p.t) ** 3; // ease out
      for (const lag of [0, 0.18]) {
        const q = Math.max(0, e - lag);
        const fade = (1 - p.t) * sp.cur.a * (lag ? 0.5 : 1);
        g.circle(sp.cur.x, sp.cur.y, sp.cur.r * (1 + 0.9 * q)).stroke({ width: 2.2 * s, color: p.color, alpha: 0.85 * fade });
      }
    }
  }
}

function lighten(c: number): number {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const l = (v: number) => Math.round(v + (255 - v) * 0.35);
  return (l(r) << 16) | (l(g) << 8) | l(b);
}
