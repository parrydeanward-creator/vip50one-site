// Checks that every native ONE MOVE screen in the Brain's example mode draws with the tour fixtures (no Classic
// iframe, no "couldn't load"), and saves a screenshot of each to docs/tour-check/.
//   node scripts/tour-fixtures-check.mjs [base-url]   (default http://localhost:3130)
// Chromium: CHROME env or /opt/pw-browsers/chromium.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installFixtures, MOVE } from "./tour-fixtures.mjs";

const BASE = process.argv[2] ?? "http://localhost:3130";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "tour-check");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, timezoneId: "America/Denver" });
page.setDefaultTimeout(10000);
// no morning fly-through on load: "visited a minute ago"
await page.addInitScript(() => {
  try {
    localStorage.setItem("one.lastVisit", new Date().toISOString());
  } catch {}
});
const errors = [];
// ONE MOVE API calls that failed outright (installFixtures fulfils every one, so this should stay empty)
const failedCalls = [];
page.on("requestfailed", (r) => r.url().startsWith(`${MOVE}/api/`) && failedCalls.push(r.url()));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
const answered = [];
await installFixtures(page);
page.on("request", (r) => {
  if (r.url().startsWith(MOVE)) answered.push(`${r.method()} ${r.url().replace(MOVE, "")}`);
});

await page.goto(`${BASE}/dashboard?demo=1&walk=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const results = [];
const openMove = async () => {
  if (await page.locator("nav.rail-menu").isVisible().catch(() => false)) return;
  await page.locator("button", { hasText: "Relationship intelligence" }).first().click();
  await page.locator("nav.rail-menu").waitFor({ timeout: 8000 });
};
const menu = async (group, item) => {
  await openMove();
  const nav = page.locator("nav.rail-menu");
  if (group) {
    const g = nav.locator("button.rail-group-btn", { hasText: group });
    if ((await g.getAttribute("aria-expanded")) !== "true") await g.click();
  }
  await nav.locator("button, a", { hasText: new RegExp(`^\\s*${item.replace(/[/+]/g, "\\$&")}`) }).first().click();
};
const check = async (name, shot) => {
  await page.waitForTimeout(2500);
  const iframe = await page.locator(`iframe[src^="${MOVE}"]`).count();
  const native = await page.locator(".page-panel-native").count();
  const text = await page.locator(".page-panel").innerText().catch(() => "");
  // the native views' error state is a .vr-msg alert with an "Open the Classic page" button
  const failed = (await page.locator(".page-panel .vr-msg[role=alert]").count()) > 0 || /couldn.t load|Sign in again|didn't save/i.test(text);
  const ok = native > 0 && iframe === 0 && !failed;
  await page.screenshot({ path: join(OUT, `${shot}.png`) });
  results.push({ name, ok, native, iframe, failed });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${ok ? "" : ` (native=${native} iframe=${iframe} failed=${failed})`}`);
  return ok;
};
const back = async () => {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
};

const PAGES = [
  ["People", "Contacts", "01-contacts"],
  ["People", "VIP Management", "02-vip"],
  ["People", "Touch Audit", "03-touch-audit"],
  ["People", "Hot/Warm/Cold", "04-hwc"],
  ["People", "Business Rolodex", "05-rolodex"],
  ["Trackers", "Daily Tracker", "06-daily"],
  ["Trackers", "Weekly Tracker", "07-weekly"],
  [null, "My Profile", "08-profile"],
];
for (const [group, item, shot] of PAGES) {
  try {
    await menu(group, item);
    await check(item, shot);
    // a step deeper on some screens
    if (item === "Contacts") {
      await page.locator(".page-panel").getByText("VIP-50", { exact: true }).first().click().catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(OUT, "01b-contacts-vip50.png") });
      await page.locator(".page-panel").getByText("Jen Alvarez").first().click().catch(() => {});
      await page.waitForTimeout(2000);
      await check("Contacts > Jen Alvarez", "01c-contacts-person");
    }
    if (item === "VIP Management") {
      await page.locator(".page-panel").getByText("JA", { exact: true }).first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(2000);
      await check("VIP > contact card", "02b-vip-card");
    }
    if (item === "Touch Audit") {
      await page.locator(".page-panel").getByText("Call", { exact: true }).first().click().catch(() => {});
      await page.waitForTimeout(1500);
      await check("Touch Audit > Call", "03b-audit-call");
    }
    if (item === "Hot/Warm/Cold") {
      await page.locator(".page-panel").getByText("Hot", { exact: true }).first().click().catch(() => {});
      await page.waitForTimeout(1500);
      await check("Hot/Warm/Cold > Hot", "04b-hwc-hot");
    }
    if (item === "My Profile") {
      for (const [tab, s] of [["Connections", "08b-profile-connections"], ["Badges", "08c-profile-badges"], ["Settings", "08d-profile-settings"], ["Pulse", "08e-profile-pulse"]]) {
        await page.getByRole("tab", { name: tab }).click();
        await check(`My Profile > ${tab}`, s);
      }
    }
  } catch (e) {
    results.push({ name: item, ok: false, error: String(e).slice(0, 200) });
    console.log(`FAIL ${item}: ${String(e).slice(0, 200)}`);
    await page.screenshot({ path: join(OUT, `${shot}-error.png`) }).catch(() => {});
  }
  await back();
  await back();
}

// The Team screen (ONE YOU > Team): the team lead's cards (Add a member, Seats, invite link, Members).
try {
  await back();
  await back();
  await page.locator("button", { hasText: "Your plan, your week" }).first().click();
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: "this week" }).filter({ hasText: /^\s*Team/ }).first().click();
  await page.waitForTimeout(1500);
  const open = page.locator("button.pm-open").first();
  if (await open.count()) await open.click().catch(() => {});
  await page.waitForTimeout(2500);
  // Add a member and Members start folded (a button); Seats and the invite link are open cards
  const want = [/Add a member/i, /^\s*Seats/, /Invite link/, /Members \(\d+\)/i];
  let cards = 0;
  for (const re of want) if (await page.locator("button, h3, section").filter({ hasText: re }).count()) cards++;
  const okTeam = cards === want.length;
  results.push({ name: "Team cards", ok: okTeam, cards });
  console.log(`${okTeam ? "OK  " : "FAIL"} Team cards (${cards} cards)`);
  await page.screenshot({ path: join(OUT, "09-team.png") });
  await page.locator(".tm-add").last().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: join(OUT, "09b-team-cards.png") });
} catch (e) {
  results.push({ name: "Team cards", ok: false });
  console.log(`FAIL Team cards: ${String(e).slice(0, 200)}`);
  await page.screenshot({ path: join(OUT, "09-team-error.png") }).catch(() => {});
}

console.log(`\nONE MOVE calls answered by fixtures: ${new Set(answered).size} distinct`);
for (const a of [...new Set(answered)].sort()) console.log(`  ${a}`);
if (failedCalls.length) console.log(`ONE MOVE calls that failed: ${failedCalls.join(", ")}`);
const errs = [...new Set(errors)].filter((e) => !/favicon/.test(e));
if (errs.length) console.log(`Console errors:\n  ${errs.slice(0, 15).join("\n  ")}`);
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length} of ${results.length} checks passed.`);
await browser.close();
process.exit(bad.length ? 1 : 0);
