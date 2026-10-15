// What everything means v2, Part 2 (moments 13 to 21) on the real Brain (walker, 15 Oct: "re-record on the real Brain
// layout ... in each Part 2 moment show the real thing being used, with a highlight ring on it"). Example mode with the
// tour switch (?walk=1) and invented example data (scripts/tour-fixtures.mjs); each moment starts exactly on its cue in
// docs/film-signals-cues.tsv, so the voice already made fits as it is.
//
//   npm run build && npx next start -p 3102 &
//   SLOW=3 node scripts/record-film-live.mjs [ffmpeg] [desk|tall]
//
// Writes docs/film-signals-live-<cut>.mp4: from cue 13 to cue 22, silent.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installFixtures } from "./tour-fixtures.mjs";

const ffmpeg = process.argv[2] || "ffmpeg";
const cut = process.argv[3] || "desk";
const SLOW = Number(process.env.SLOW || 3);
const BASE = process.env.BASE || "http://localhost:3102";
const tall = cut === "tall";
const [W, H] = tall ? [1080, 1920] : [1920, 1080];
const scale = tall ? 2 : 1;

const cues = Object.fromEntries(
  readFileSync("docs/film-signals-cues.tsv", "utf8").trim().split("\n").slice(1).map((l) => l.split("\t")).map(([k, s]) => [k, Number(s)]),
);
const first = 13, last = 21;
const T0 = cues[first], END = cues[last + 1]; // seconds in the finished film

const dir = mkdtempSync(join(tmpdir(), "film-live-"));
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ timezoneId: "America/Denver", viewport: { width: W / scale, height: H / scale }, deviceScaleFactor: scale, isMobile: tall, hasTouch: tall, recordVideo: { dir, size: { width: W, height: H } } });
const startedAt = Date.now(); // the video starts with the context
const p = await ctx.newPage();
await installFixtures(p);
const cdp = await ctx.newCDPSession(p);
await cdp.send("Animation.enable");
const slowAnimations = () => cdp.send("Animation.setPlaybackRate", { playbackRate: 1 / SLOW }).catch(() => {});
await slowAnimations();
p.on("load", slowAnimations);
const wait = (ms) => p.waitForTimeout(ms * SLOW);

// The finger or cursor, and the gold highlight ring round what is being used.
const OVERLAY = () => {
  if (document.getElementById("film-cursor")) return;
  const c = document.createElement("div");
  c.id = "film-cursor";
  c.style.cssText = "position:fixed;left:50%;top:60%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:3px solid #f5c542;background:rgba(245,197,66,.3);box-shadow:0 0 18px rgba(245,197,66,.7);z-index:2147483647;pointer-events:none;transition:left 1.5s cubic-bezier(.3,.8,.3,1),top 1.5s cubic-bezier(.3,.8,.3,1),transform .45s";
  document.body.appendChild(c);
  const r = document.createElement("div");
  r.id = "film-ring";
  r.style.cssText = "position:fixed;display:none;border:4px solid #ffd86a;border-radius:16px;box-shadow:0 0 0 6px rgba(255,216,106,.25),0 0 30px rgba(255,216,106,.7);z-index:2147483646;pointer-events:none";
  document.body.appendChild(r);
};
await p.addInitScript(`try { localStorage.setItem("one.lastVisit", new Date().toISOString()); } catch {}\ndocument.addEventListener("DOMContentLoaded", ${OVERLAY.toString()});`);

const loc = (l) => (typeof l === "string" ? p.locator(l).first() : l.first());
const ring = async (l) => {
  const box = await loc(l).boundingBox().catch(() => null);
  await p.evaluate((b) => {
    const r = document.getElementById("film-ring");
    if (!r) return;
    if (!b) return void (r.style.display = "none");
    Object.assign(r.style, { display: "block", left: `${b.x - 8}px`, top: `${b.y - 8}px`, width: `${b.width + 16}px`, height: `${b.height + 16}px` });
  }, box);
};
const unring = () => p.evaluate(() => { const r = document.getElementById("film-ring"); if (r) r.style.display = "none"; });
const point = async (l) => {
  const box = await loc(l).boundingBox().catch(() => null);
  if (!box) return;
  await p.evaluate(([x, y]) => { const c = document.getElementById("film-cursor"); if (c) Object.assign(c.style, { left: `${x}px`, top: `${y}px` }); }, [box.x + box.width / 2, box.y + box.height / 2]);
  await wait(550);
};
// Ring it, move to it, press it.
const use = async (l, after = 500, force = false) => {
  const x = loc(l);
  await x.waitFor({ state: "visible", timeout: 15000 * SLOW });
  if (!force) await x.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {}); // orbs on the map never scroll
  await ring(x);
  await point(x);
  await p.evaluate(() => { const c = document.getElementById("film-cursor"); if (c) { c.style.transform = "scale(.7)"; setTimeout(() => (c.style.transform = ""), 450); } });
  // The map's orb buttons sit under the orb hint and moving layers; a press that is blocked is forced through.
  if (force) await x.click({ force: true });
  else await x.click({ timeout: 4000 * SLOW }).catch(() => x.click({ force: true }));
  await wait(after);
};
// Back to the whole map: the "ONE" crumb in the header (works from every view, ONE MOVE's menu included).
const home = async () => {
  await p.keyboard.press("Escape").catch(() => {});
  const crumb = p.locator('nav.crumbs button', { hasText: /^ONE$/ }).first();
  if (await crumb.isVisible().catch(() => false)) await crumb.click();
  else {
    // Phones hide the breadcrumb: the back arrow until it greys out, then centre on ONE.
    // Short, forced presses: the live notice ("Showly · just now") can sit over the controls row.
    for (let i = 0; i < 6; i++) {
      const back = backBtn();
      if (!(await back.isEnabled({ timeout: 500 }).catch(() => false))) break;
      await back.click({ force: true, timeout: 1500 }).catch(() => {});
      await wait(150);
    }
    await p.locator('[aria-label="Centre on ONE"]').first().click({ force: true, timeout: 1500 }).catch(() => {});
    await p.evaluate(() => window.scrollTo(0, 0));
  }
  await wait(400);
};
// On a phone a person opens over the map with its own Back arrow on top; the topmost Back is the one to press.
const backBtn = () => (tall ? p.locator('[aria-label="Back"]').last() : p.locator('[aria-label="Back"]').first());
const rail = (t) => p.locator(".rail button", { hasText: t });

// One entry a moment: what is used while the voice says the line.
// Each moment: `prep` gets the screen one step away just before the cue (quick, no ring), `act` is the thing the
// voice names, done on the cue with the ring (Parry, 15 Oct: the screens came "way past when they should be").
const quick = async (l, force = false) => {
  const x = loc(l);
  await x.waitFor({ state: "visible", timeout: 8000 * SLOW });
  if (force) return void (await x.click({ force: true }), await wait(250)); // a moving orb never settles
  await x.scrollIntoViewIfNeeded().catch(() => {});
  await x.click({ timeout: 3000 * SLOW }).catch(() => x.click({ force: true }));
  await wait(250);
};
const openPeople = async () => {
  if (!(await rail("People▾").count())) await quick(rail("People"));
};
const clearAsk = async () => {
  const clear = p.locator('[aria-label^="Clear the question"]');
  if (await clear.first().isVisible().catch(() => false)) await clear.first().click({ timeout: 1000 }).catch(() => {});
  await wait(200);
  await p.locator(".ask-field input, .ask-field textarea").first().fill("", { timeout: 1500 }).catch(() => {});
};
// The ONE MOVE row for a page: on a desktop the menu column, on a phone the row in the panel under the map.
const movePrep = async (label) => {
  const t = now();
  await home();
  if (process.env.TRACE) console.log("  home took", (now() - t).toFixed(1));
  if (tall) {
    await quick('.canvas-wrap button[aria-label^="ONE MOVE"]', true);
    await quick(p.locator(".drawer button", { hasText: label }));
  } else {
    await quick(rail("ONE MOVE"));
    await openPeople();
  }
};
const moveAct = async (label) => {
  // Ring and press at once (no cursor glide): the page is on screen as the voice names it.
  const x = tall ? p.locator(".drawer button", { hasText: label }).first() : rail(label).first();
  await ring(x);
  await x.click({ timeout: 3000 * SLOW }).catch(() => x.click({ force: true }));
  await wait(200);
  await unring();
  await p.evaluate(() => window.scrollTo(0, 0));
};
const MOMENTS = {
  13: { act: async () => { await use(".next-pill", 900); } },
  14: {
    act: async () => {
      await use(".pm-open", 600);
      const ok = p.getByRole("button", { name: /^Looks good$/ }).first();
      if (await ok.count()) await use(ok, 600);
      const back = p.locator('[aria-label="Back to the Brain"]').first();
      if (await back.count()) await back.click().catch(() => {});
      await wait(250);
      const done = p.locator(".drawer button", { hasText: /Done/ }).first();
      if (await done.count()) await use(done, 300);
    },
  },
  15: {
    prep: async () => { await home(); },
    act: async () => {
      const box = p.locator(".ask-field input, .ask-field textarea").first();
      await use(box, 100);
      await box.pressSequentially("Who haven't I called in 60 days?", { delay: 35 * SLOW });
      await ring(".ask-field");
      await p.keyboard.press("Enter");
      await wait(1500);
      await unring();
    },
  },
  16: {
    // Tap one of the VIP-50 people Pulse brought up: their card opens; then the back arrow to everything.
    act: async () => {
      const person = p.locator('.canvas-wrap button[aria-label*="VIP-50"]').first();
      if (await person.count()) await use(person, 4000, true);
      // The back arrow until it greys out: back to everything.
      if (process.env.TRACE) console.log("16 tapped", now().toFixed(1));
      await use(backBtn(), 250, true);
      if (process.env.TRACE) console.log("16 back1", now().toFixed(1));
      for (let i = 0; i < (tall ? 5 : 3); i++) {
        const back = backBtn();
        if (!(await back.isEnabled({ timeout: 500 }).catch(() => false))) break;
        await back.click({ force: true, timeout: 1500 }).catch(() => {});
        await wait(250);
        if (process.env.TRACE) console.log("16 back+", now().toFixed(1));
      }
    },
  },
  17: {
    prep: async () => { if (process.env.TRACE) console.log("17 prep", now().toFixed(1)); await clearAsk(); if (process.env.TRACE) console.log("17 cleared", now().toFixed(1)); await home(); if (process.env.TRACE) console.log("17 home", now().toFixed(1)); },
    act: async () => {
      const s = p.locator('input[aria-label="Timeline"]').first();
      await ring(".timeline");
      await point(s);
      await s.focus();
      for (let i = 0; i < 21; i++) { await p.keyboard.press("ArrowLeft"); await wait(45); }
      await wait(1200);
      for (let i = 0; i < 42; i++) { await p.keyboard.press("ArrowRight"); await wait(30); }
      await wait(1100);
      await use('[aria-label="Back to today"]', 200);
    },
  },
  18: { lead: tall ? 3.4 : 1.6, prep: async () => { await movePrep("Hot/Warm/Cold"); }, act: async () => { await moveAct("Hot/Warm/Cold"); } },
  19: { lead: tall ? 2.6 : 1.6, prep: async () => { await movePrep("VIP Management"); }, act: async () => { await moveAct("VIP Management"); } },
  // On a phone the ONE MOVE pages cover the header, so the photo button comes back with the main map first.
  20: { lead: 1.2, prep: async () => { if (tall) await home(); }, act: async () => { await use(".me-menu", 300, tall); } },
  21: {
    prep: async () => { const x = p.locator(".pmenu-x").first(); if (await x.count()) await x.click().catch(() => {}); await wait(150); await home(); },
    act: async () => { await use('[aria-label="What everything means"]', 300); },
  },
};

await p.goto(`${BASE}/dashboard?demo=1&walk=1&slow=${SLOW}`, { waitUntil: "networkidle" });
await p.waitForSelector(".next-pill", { timeout: 30000 * SLOW });
await wait(2500);
const t0 = Date.now();
const now = () => (Date.now() - t0) / 1000 / SLOW; // seconds of finished film since cue 13
for (let k = first; k <= last; k++) {
  const m = MOMENTS[k];
  await unring();
  const due = cues[k] - T0;
  if (m.prep) {
    // The set-up waits until just before the cue, so the last screen stays up while its own line is said.
    const lead = due - (m.lead ?? 1.6) - now();
    if (lead > 0) await wait(lead * 1000);
    try { await m.prep(); } catch (e) { console.warn(`moment ${k} prep:`, e.message.split("\n")[0]); }
  }
  const late = now() - due;
  if (late > 0.05) console.warn(`moment ${k} starts ${late.toFixed(2)} s late`);
  else await wait((due - now()) * 1000);
  const began = now();
  try {
    await m.act();
  } catch (e) {
    console.warn(`moment ${k}:`, e.message.split("\n")[0]);
  }
  console.log(`moment ${k}: on screen by +${(now() - began).toFixed(1)} s`);
  if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/m${k}.png` });
}
const left = END - T0 - now();
if (left > 0) await wait(left * 1000);
const webm = await p.video().path();
const videoStart = (t0 - startedAt) / 1000;
await ctx.close();
await b.close();
const out = `docs/film-signals-live-${cut}.mp4`;
execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-ss", String(videoStart), "-i", webm, "-t", String((END - T0) * SLOW), "-vf", `setpts=PTS/${SLOW},fps=30,format=yuv420p`, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", "-an", out]);
console.log(out, (END - T0).toFixed(2), "s");
