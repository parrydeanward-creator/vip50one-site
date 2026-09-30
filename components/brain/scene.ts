import { Application, Container, FillGradient, Graphics, Text } from "pixi.js";
import type { GraphNode, ProductKey } from "@/lib/graph/types.ts";
import type { Placed } from "@/lib/brain/layout.ts";
import { type Camera, type Viewport, lerpCamera, toScreen } from "@/lib/brain/camera.ts";
import { GLASS, GOLD, GOLD_LIGHT, GREY, PRODUCT_COLOR, STATUS, WHITE } from "@/lib/brain/theme.ts";

// Layers 3 and 4 on the GPU: draws what presentation placed, and eases every
// change (motion). It never decides what is shown or what anything means.

interface Sprite {
  id: string;
  node: GraphNode;
  root: Container;
  body: Graphics;
  deco: Graphics; // status ring / core internals
  label: Text;
  sub: Text;
  cur: { x: number; y: number; r: number; a: number };
  tgt: { x: number; y: number; r: number; a: number };
  drawnR: number;
  drawnKey: string;
  phase: number;
  leaving: boolean;
}

interface Pulse {
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

export class BrainScene {
  app = new Application();
  private world = new Container();
  private edgeG = new Graphics();
  private pulseG = new Graphics();
  private nodes = new Container();
  private halo = new Container();
  private sprites = new Map<string, Sprite>();
  private edges: SceneEdge[] = [];
  private pulses: Pulse[] = [];
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
  reducedMotion = false;
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
    this.world.addChild(this.edgeG, this.nodes, this.halo, this.pulseG);
    this.app.stage.addChild(this.world);
    this.buildHalo();
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
      const alpha = p.role === "ancestor" ? 0.55 : p.role === "sibling" ? 0.5 : p.role === "related" ? 0.85 : 1;
      let s = this.sprites.get(p.id);
      if (!s) {
        s = this.makeSprite(node);
        // New nodes grow out of the node that opened them.
        s.cur = { x: origin.x, y: origin.y, r: p.r * 0.3, a: 0 };
        this.sprites.set(p.id, s);
      }
      s.node = node;
      s.leaving = false;
      s.tgt = { x: p.x, y: p.y, r: p.r, a: node.locked ? alpha * 0.55 : alpha };
      if (this.reducedMotion) s.cur = { ...s.tgt };
      this.style(s, p.role);
    }
    this.halo.visible = focusId === "one";
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

  screenOf(id: string): { x: number; y: number; r: number; a: number } | null {
    const s = this.sprites.get(id);
    if (!s || s.leaving) return null;
    const p = toScreen(this.cam, this.viewport, s.cur.x, s.cur.y);
    return { x: p.x, y: p.y, r: s.cur.r * this.cam.scale, a: s.cur.a };
  }

  // ---- drawing ------------------------------------------------------------

  private makeSprite(node: GraphNode): Sprite {
    const root = new Container();
    const body = new Graphics();
    const deco = new Graphics();
    const label = new Text({
      text: "",
      style: { fontFamily: "Inter Tight, Inter, system-ui, sans-serif", fontSize: 15, fontWeight: "700", fill: WHITE, align: "center", letterSpacing: 0.4 },
      resolution: 3,
    });
    const sub = new Text({
      text: "",
      style: { fontFamily: "Inter Tight, Inter, system-ui, sans-serif", fontSize: 12, fill: GREY, align: "center" },
      resolution: 3,
    });
    label.anchor.set(0.5, 0);
    sub.anchor.set(0.5, 0);
    root.addChild(body, deco, label, sub);
    this.nodes.addChild(root);
    return { id: node.id, node, root, body, deco, label, sub, cur: { x: 0, y: 0, r: 1, a: 0 }, tgt: { x: 0, y: 0, r: 1, a: 1 }, drawnR: 0, drawnKey: "", phase: Math.random() * Math.PI * 2, leaving: false };
  }

  private style(s: Sprite, role: string) {
    const n = s.node;
    const key = `${n.type}|${n.status}|${n.locked}|${role}|${n.label}|${n.secondaryLabel}|${s.tgt.r}`;
    if (key === s.drawnKey) return;
    s.drawnKey = key;
    const r = s.tgt.r;
    s.drawnR = r;
    const color = PRODUCT_COLOR[n.product as ProductKey];
    const b = s.body.clear();
    const d = s.deco.clear();
    for (const c of d.removeChildren()) c.destroy();

    if (n.type === "core") {
      this.drawCore(b, d, r);
      s.label.text = "";
      s.sub.text = "";
      return;
    }

    // Soft outer light, dark glass body, product-coloured edge.
    b.circle(0, 0, r + 7).fill({ color, alpha: 0.06 });
    b.circle(0, 0, r).fill({ color: GLASS, alpha: 0.92 });
    b.circle(0, -r * 0.28, r * 0.72).fill({ color: WHITE, alpha: 0.025 });
    b.circle(0, 0, r).stroke({ width: role === "focus" ? 2.5 : 1.6, color: n.locked ? 0x3a4256 : color, alpha: role === "focus" ? 1 : 0.8 });

    if (n.status && !n.locked && role !== "sibling" && role !== "ancestor") {
      const st = STATUS[n.status];
      d.circle(0, 0, r + 6).stroke({ width: 2, color: st.color, alpha: 0.85 });
    }

    const big = n.type === "product" || role === "focus";
    s.label.style.fontSize = role === "sibling" || role === "ancestor" ? 12 : big ? (role === "focus" ? 19 : 15) : 13;
    s.label.text = n.label;
    s.sub.text = n.locked ? "Included in Complete" : n.secondaryLabel ?? "";
    // Products carry their name inside the node; everything else below it.
    if (n.type === "product" && role !== "ancestor") {
      s.label.y = -s.label.height / 2 - (s.sub.text ? 7 : 0);
      s.sub.y = s.label.y + s.label.height + 1;
      s.sub.style.wordWrap = true;
      s.sub.style.wordWrapWidth = r * 1.6;
    } else {
      s.label.y = r + 10;
      s.sub.y = s.label.y + s.label.height + 1;
      s.sub.style.wordWrap = true;
      s.sub.style.wordWrapWidth = 150;
    }
    s.sub.visible = role !== "ancestor" && role !== "sibling";
    s.label.alpha = role === "ancestor" ? 0.8 : 1;
  }

  private drawCore(b: Graphics, d: Graphics, r: number) {
    for (let i = 5; i >= 1; i--) b.circle(0, 0, r + i * 12).fill({ color: GOLD, alpha: 0.012 * (6 - i) });
    const g = new FillGradient({
      type: "radial",
      center: { x: 0.5, y: 0.42 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.5,
      colorStops: [
        { offset: 0, color: "#2a2410" },
        { offset: 0.55, color: "#0d1224" },
        { offset: 1, color: "#070b18" },
      ],
    });
    b.circle(0, 0, r).fill(g);
    b.circle(0, 0, r).stroke({ width: 2.5, color: GOLD, alpha: 0.9 });
    b.circle(0, 0, r - 8).stroke({ width: 1, color: GOLD_LIGHT, alpha: 0.18 });

    // Faint internal network (seeded so it never changes between renders).
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pts = Array.from({ length: 16 }, () => {
      const a = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * r * 0.72;
      return { x: Math.cos(a) * rr, y: Math.sin(a) * rr };
    });
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        if (dx * dx + dy * dy < (r * 0.42) ** 2) d.moveTo(pts[i].x, pts[i].y).lineTo(pts[j].x, pts[j].y);
      }
    d.stroke({ width: 0.8, color: GOLD_LIGHT, alpha: 0.12 });
    for (const p of pts) d.circle(p.x, p.y, 1.6).fill({ color: GOLD_LIGHT, alpha: 0.45 });

    const word = new Text({
      text: "ONE",
      style: { fontFamily: "Bebas Neue, Inter Tight, sans-serif", fontSize: Math.round(r * 0.58), fill: WHITE, letterSpacing: r * 0.045 },
      resolution: 3,
    });
    word.anchor.set(0.5);
    word.y = -r * 0.06;
    d.addChild(word);
  }

  private haloWord!: Text;
  private haloIndex = 0;

  // The intelligence halo: one word at a time under "ONE", slowly cross-fading
  // (UNDERSTANDS, REMEMBERS, ...), plus a faint ring. Never over the graph.
  private buildHalo() {
    this.haloWord = new Text({
      text: HALO_WORDS[0],
      style: { fontFamily: "Inter Tight, Inter, sans-serif", fontSize: 9, fontWeight: "700", fill: GOLD, letterSpacing: 2.6 },
      resolution: 3,
    });
    this.haloWord.anchor.set(0.5);
    this.haloWord.y = 34;
    const ring = new Graphics().circle(0, 0, 128).stroke({ width: 1, color: GOLD, alpha: 0.07 });
    this.halo.addChild(ring, this.haloWord);
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
    this.haloWord.alpha = this.reducedMotion ? 0.6 : 0.6 * fade;
  }

  // ---- motion -------------------------------------------------------------

  private frame(dt: number) {
    dt = Math.min(dt, 0.1);
    this.time += dt;
    this.idleFor += dt;
    const k = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 5.5);

    if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt / 0.9);
      this.cam = lerpCamera(this.camFrom, this.camTo, this.camT);
    }
    const vp = this.viewport;
    this.world.scale.set(this.cam.scale);
    this.world.position.set(vp.width / 2 - this.cam.x * this.cam.scale, vp.height / 2 - this.cam.y * this.cam.scale);

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
      // Breathing: ONE clearly, products lightly, nothing else.
      let breathe = 1;
      if (!this.reducedMotion) {
        if (s.node.type === "core") breathe = 1 + 0.016 * Math.sin((this.time / 5) * Math.PI * 2);
        else if (s.node.type === "product") breathe = 1 + 0.006 * Math.sin((this.time / 6) * Math.PI * 2 + s.phase);
      }
      const hover = this.hoverId === s.id ? 1.07 : 1;
      s.root.position.set(s.cur.x, s.cur.y);
      s.root.scale.set((s.cur.r / (s.drawnR || 1)) * breathe * hover);
      s.root.alpha = s.cur.a;
      if (s.node.status === "opportunity" && !this.reducedMotion) {
        s.deco.alpha = 0.6 + 0.4 * Math.sin(this.time * 1.6 + s.phase);
      }
    }
    this.tickHalo();
    const core = this.sprites.get("one");
    if (core) {
      this.halo.position.set(core.cur.x, core.cur.y);
      this.halo.alpha = core.cur.a * (this.focusId === "one" ? 1 : 0);
    }

    this.drawEdges();
    this.heartbeat(dt);
    this.drawPulses(dt);
    // Idle: drop to 30fps; the heartbeat keeps it alive without cost.
    this.app.ticker.maxFPS = this.idleFor > 8 ? 30 : 0;
    this.onFrame?.();
  }

  private drawEdges() {
    const g = this.edgeG.clear();
    for (const e of this.edges) {
      const a = this.sprites.get(e.source), b = this.sprites.get(e.target);
      if (!a || !b) continue;
      const alpha = Math.min(a.cur.a, b.cur.a);
      if (alpha < 0.02) continue;
      const color = PRODUCT_COLOR[(e.kind === "tree" ? b.node.product : b.node.product) as ProductKey];
      const lit = this.hoverId && (this.hoverId === e.source || this.hoverId === e.target) ? 1.8 : 1;
      g.moveTo(a.cur.x, a.cur.y).lineTo(b.cur.x, b.cur.y).stroke({
        width: (e.kind === "tree" ? 1.4 : 1.1) / this.cam.scale,
        color,
        alpha: alpha * (e.kind === "tree" ? 0.3 : 0.5) * lit,
      });
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
      const s = this.sprites.get(e.target);
      this.pulses.push({ from: e.source, to: e.target, t: -i * 0.12, color: s ? PRODUCT_COLOR[s.node.product as ProductKey] : GOLD });
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
      g.circle(x, y, 9 * s).fill({ color: p.color, alpha: 0.12 * fade });
      g.circle(x, y, 3 * s).fill({ color: p.color, alpha: 0.9 * fade });
    }
  }
}
