// Records the full product tour of the Brain (Film A; Parry, 15 Oct: "build them"), in real time, from the example
// agent's Brain with the tour switch on (/dashboard?demo=1&tour=1). The screens are the real ones; their data calls are
// answered with invented example data (scripts/tour-fixtures.mjs), so nothing real is read, changed or sent.
//
//   npm run build && npx next start -p 3102 &
//   SLOW=3 node scripts/record-tour.mjs [ffmpeg path] [first chapter] [last chapter]
//
// Writes docs/tour-desktop-1920x1080.mp4 (silent), docs/tour-desktop.vtt (the spoken words, word for word) and
// docs/tour-desktop-cues.tsv (moment, start second, chapter, line) for the master bot to lay the voice on.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CHAPTERS } from "./tour-desktop.mjs";

const ffmpeg = process.argv[2] || "ffmpeg";
const from = Number(process.argv[3] || 1);
const to = Number(process.argv[4] || CHAPTERS.length);
const W = 1920, H = 1080;
// The page runs SLOW times slower (the map's own clock, CSS animations, every wait here), then the video is sped back
// up; a machine without a GPU then still draws every frame (as scripts/record-watch.mjs does for the films).
const SLOW = Number(process.env.SLOW || 3);
// DRY=<dir>: a quick check run, no video, a screenshot after every moment and short waits (find what misses first).
const DRY = process.env.DRY || "";
const BASE = process.env.BASE || "http://localhost:3102";
const dir = mkdtempSync(join(tmpdir(), "tour-"));
const suffix = from === 1 && to === CHAPTERS.length ? "" : `-ch${from}-${to}`;

// How long a line takes to say (Brian, about 2.6 words a second), with a breath after.
export const sayMs = (say) => Math.max(3200, Math.round(say.split(/\s+/).length * 390 + 1100));

const b = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ timezoneId: "America/Denver", viewport: { width: W, height: H }, ...(DRY ? {} : { recordVideo: { dir, size: { width: W, height: H } } }) });
const t0 = Date.now();
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send("Animation.enable");
const slowAnimations = () => cdp.send("Animation.setPlaybackRate", { playbackRate: 1 / SLOW }).catch(() => {});
await slowAnimations();
p.on("load", slowAnimations);
const wait = (ms) => p.waitForTimeout(ms * SLOW);
let installFixtures = null;
try {
  ({ installFixtures } = await import("./tour-fixtures.mjs"));
} catch {
  console.warn("no scripts/tour-fixtures.mjs: native ONE MOVE pages will fall back");
}
if (installFixtures) await installFixtures(p);

// The visible cursor and the chapter cards, drawn over the page (never part of the product).
const OVERLAY = () => {
  if (document.getElementById("tour-cursor")) return;
  const c = document.createElement("div");
  c.id = "tour-cursor";
  c.style.cssText = "position:fixed;left:960px;top:540px;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:3px solid #f5c542;background:rgba(245,197,66,.25);box-shadow:0 0 18px rgba(245,197,66,.6);z-index:2147483647;pointer-events:none;transition:left 1.8s cubic-bezier(.3,.8,.3,1),top 1.8s cubic-bezier(.3,.8,.3,1),transform .45s";
  document.body.appendChild(c);
  const k = document.createElement("div");
  k.id = "tour-card";
  k.style.cssText = "position:fixed;inset:0;display:none;place-items:center;background:radial-gradient(circle at 50% 45%,rgba(20,28,58,.97),rgba(4,6,16,.99));z-index:2147483646;pointer-events:none;text-align:center;font-family:Bebas Neue,Impact,sans-serif";
  document.body.appendChild(k);
};
await p.addInitScript(`try { localStorage.setItem("one.lastVisit", new Date().toISOString()); } catch {}\ndocument.addEventListener("DOMContentLoaded", ${OVERLAY.toString()});`);

const cursorTo = async (x, y) => {
  await p.evaluate(([x, y]) => {
    const c = document.getElementById("tour-cursor");
    if (c) Object.assign(c.style, { left: `${x}px`, top: `${y}px` });
  }, [x, y]);
  await wait(650);
};
const pressDot = async () => {
  await p.evaluate(() => {
    const c = document.getElementById("tour-cursor");
    if (!c) return;
    c.style.transform = "scale(.7)";
    setTimeout(() => (c.style.transform = ""), 540);
  });
};

// The helpers each moment uses: glide the cursor to the thing, then press it.
const T = {
  p,
  wait,
  async click(locator) {
    const l = typeof locator === "string" ? p.locator(locator).first() : locator.first();
    await l.waitFor({ state: "visible", timeout: DRY ? 5000 : 15000 });
    await l.scrollIntoViewIfNeeded().catch(() => {});
    const box = await l.boundingBox();
    if (box) await cursorTo(box.x + box.width / 2, box.y + box.height / 2);
    await pressDot();
    // A button over the moving map can be visible but never "stable"; a blocked press is forced through.
    await l.click({ timeout: (DRY ? 2500 : 4000) * SLOW }).catch(() => l.click({ force: true, timeout: 3000 * SLOW }));
    await wait(450);
  },
  async hover(locator) {
    const l = typeof locator === "string" ? p.locator(locator).first() : locator.first();
    const box = await l.boundingBox({ timeout: DRY ? 4000 : 30000 });
    if (box) await cursorTo(box.x + box.width / 2, box.y + box.height / 2);
    await l.hover().catch(() => {});
  },
  async point(x, y) {
    await cursorTo(x, y);
  },
  rail: (text) => p.locator(".rail button", { hasText: text }),
  inside: (text) => p.locator(".drawer button", { hasText: text }),
  menu: (text) => p.locator(".pmenu button, .pmenu a", { hasText: text }),
  text: (text) => p.getByText(text, { exact: false }),
  async back() {
    await T.click('[aria-label="Back"]');
  },
  // Back to the whole map: the "ONE" crumb works from every view (a ONE MOVE page, a planner, My Profile).
  async home() {
    await p.keyboard.press("Escape").catch(() => {});
    const crumb = p.locator("nav.crumbs button", { hasText: /^ONE$/ }).first();
    if (await crumb.isVisible().catch(() => false)) await crumb.click({ timeout: 3000 * SLOW }).catch(() => crumb.click({ force: true }));
    else await p.locator('[aria-label="Centre on ONE"]').first().click({ force: true, timeout: 3000 * SLOW }).catch(() => {});
    await wait(350);
  },
  async scrollDrawer(px) {
    const d = p.locator(".drawer").first();
    const box = await d.boundingBox();
    if (box) await cursorTo(box.x + box.width / 2, box.y + box.height / 2);
    await p.mouse.wheel(0, px);
    await wait(900);
  },
  async type(locator, text) {
    const l = typeof locator === "string" ? p.locator(locator).first() : locator.first();
    await T.click(l);
    await l.pressSequentially(text, { delay: 70 * SLOW });
  },
};

await p.goto(`${BASE}/dashboard?demo=1&walk=1&slow=${SLOW}`, { waitUntil: "networkidle" });
await p.waitForSelector(".rail button", { timeout: 30000 });
await wait(2500);
const start = (Date.now() - t0) / 1000;
const now = () => ((Date.now() - t0) / 1000 - start) / SLOW; // seconds into the finished (sped-up) film

const cues = [];
let k = 0;
for (const [ci, ch] of CHAPTERS.entries()) {
  const n = ci + 1;
  if (n < from || n > to) continue;
  // The chapter card: "Chapter 3 · Morning Pulse".
  await p.evaluate(([n, title]) => {
    const k = document.getElementById("tour-card");
    if (!k) return;
    k.innerHTML = `<div><div style="color:#d4af37;font-size:34px;letter-spacing:.3em">CHAPTER ${n}</div><div style="color:#fff;font-size:96px;letter-spacing:.04em;margin-top:8px">${title}</div></div>`;
    k.style.display = "grid";
  }, [n, ch.title.toUpperCase()]);
  const cardAt = now();
  cues.push({ k: ++k, at: cardAt, chapter: `${n}. ${ch.title}`, say: ch.intro ?? `Chapter ${n}. ${ch.title}.` });
  if (ch.setup) await ch.setup(T).catch((e) => console.warn(`chapter ${n} setup:`, e.message));
  await wait(DRY ? 300 : Math.max(3400, sayMs(ch.intro ?? `Chapter ${n}. ${ch.title}.`)));
  await p.evaluate(() => {
    const k = document.getElementById("tour-card");
    if (k) k.style.display = "none";
  });
  for (const m of ch.moments) {
    // The line starts once its screen is up (Parry, 15 Oct, on the help film: screens came "way past when they should
    // be"): the moves to get there happen in the gap after the last line, then the voice names what is on screen.
    try {
      if (m.do) await m.do(T);
    } catch (e) {
      console.warn(`MISS ch${n} m${k} "${m.say.slice(0, 50)}":`, e.message.split("\n")[0]);
    }
    const at = now();
    cues.push({ k: ++k, at, chapter: `${n}. ${ch.title}`, say: m.say });
    if (DRY) {
      await p.waitForTimeout(700);
      await p.screenshot({ path: `${DRY}/c${String(n).padStart(2, "0")}-m${String(k).padStart(3, "0")}.jpg`, quality: 55 });
      continue;
    }
    await wait(sayMs(m.say) + (m.hold ?? 0));
  }
}
await wait(2500);
const end = now();
if (DRY) {
  await b.close();
  console.log("dry run done", cues.length, "moments");
  process.exit(0);
}
const webm = await p.video().path();
await ctx.close();
await b.close();

const out = `docs/tour-desktop${suffix}-${W}x${H}.mp4`;
execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-ss", String(start), "-i", webm, "-vf", `setpts=PTS/${SLOW},fps=30,format=yuv420p`, "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-movflags", "+faststart", "-an", out]);

const stamp = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = (s % 60).toFixed(3).padStart(6, "0");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${x}`;
};
const vtt = ["WEBVTT", ""];
cues.forEach((c, i) => {
  const next = i + 1 < cues.length ? cues[i + 1].at : end;
  vtt.push(`${stamp(c.at + 0.3)} --> ${stamp(Math.max(c.at + 1, next - 0.2))}`, c.say, "");
});
writeFileSync(`docs/tour-desktop${suffix}.vtt`, vtt.join("\n"));
writeFileSync(`docs/tour-desktop${suffix}-cues.tsv`, ["moment\tstart_s\tchapter\tline", ...cues.map((c) => `${c.k}\t${c.at.toFixed(2)}\t${c.chapter}\t${c.say}`)].join("\n") + "\n");
console.log(out, `${(end / 60).toFixed(1)} min`, `${cues.length} cues`);
