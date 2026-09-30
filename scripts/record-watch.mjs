// Records Watch ONE Work as an MP4 for the sales page (ONE-BRAIN.md §7).
//
//   npm run build && npx next start -p 3102 &
//   node scripts/record-watch.mjs [1920x1080] [slow] [ffmpeg path]
//   FILM=1 node scripts/record-watch.mjs ...   (the long film, /watch?film=1)
//
// The story plays `slow` times slower (default 4) so a machine without a GPU
// still draws every frame; the video is then sped back up to real time at
// 30 fps. Needs an ffmpeg with libx264 (the one Playwright ships makes WebM only).
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [w, h] = (process.argv[2] || "1920x1080").split("x").map(Number);
const slow = Number(process.argv[3] || 4);
const ffmpeg = process.argv[4] || "ffmpeg";
const film = process.env.FILM === "1";
const out = `docs/watch-one-work${film ? "-film" : ""}-${w}x${h}.mp4`;
const dir = mkdtempSync(join(tmpdir(), "watch-"));

const b = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const ctx = await b.newContext({ viewport: { width: w, height: h }, recordVideo: { dir, size: { width: w, height: h } } });
const t0 = Date.now();
const p = await ctx.newPage();
await p.goto(`http://localhost:3102/watch?record=1&slow=${slow}${film ? "&film=1" : ""}`, { waitUntil: "networkidle" });
await p.waitForSelector(".watch-card", { timeout: 30000 });
const start = (Date.now() - t0) / 1000 - 0.3;
await p.waitForSelector(".watch-end", { timeout: 1200000 });
await new Promise((r) => setTimeout(r, 3500 * slow));
const webm = await p.video().path();
await ctx.close();
await b.close();

execFileSync(ffmpeg, [
  "-y", "-loglevel", "error", "-ss", String(Math.max(0, start)), "-i", webm,
  "-vf", `setpts=PTS/${slow},fps=30,format=yuv420p`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", "-an", out,
]);
console.log(out);
