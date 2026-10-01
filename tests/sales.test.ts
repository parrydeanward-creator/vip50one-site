import { test } from "node:test";
import assert from "node:assert/strict";
import { FAQ, JOIN, PACKAGES, PRODUCTS, TESTIMONIALS, joinFor, shownTestimonials } from "../lib/sales.ts";

test("prices are the settled ones (ECOSYSTEM.md §7)", () => {
  const p = Object.fromEntries(PACKAGES.map((x) => [x.id, x]));
  assert.equal(p.relationship.founding, "$199");
  assert.equal(p.relationship.list, "$299");
  assert.equal(p.complete.founding, "$399");
  assert.equal(p.complete.list, "$499");
  assert.equal(p.elite.founding, "$2,500");
  assert.match(p.relationship.annual, /\$1,990.*\$2,990.*two months free/);
  assert.match(p.complete.annual, /\$3,990.*\$4,990.*two months free/);
  assert.match(p.elite.annual, /ONE Complete from day 90/);
  // trial on Relationship and Complete, never Elite
  assert.deepEqual(PACKAGES.filter((x) => x.trial).map((x) => x.id), ["relationship", "complete"]);
});

test("packages hold the right products; nothing is sold on its own", () => {
  const rel = PRODUCTS.filter((x) => x.in.includes("relationship")).map((x) => x.id);
  const comp = PRODUCTS.filter((x) => x.in.includes("complete")).map((x) => x.id);
  assert.deepEqual(rel, ["go", "move"]);
  assert.deepEqual(comp, ["go", "move", "marquee", "open", "showly"]);
  assert.ok(FAQ.some((f) => /packages/.test(f.a) && /on its own/.test(f.q)));
  assert.equal(JOIN, "https://vip50one.com/join");
});

test("honest copy: nothing posts without the agent, no loves, visitors never into the VIP-50", () => {
  const all = JSON.stringify({ PRODUCTS, PACKAGES, FAQ });
  assert.ok(!/\blove[sd]?\b/i.test(all));
  assert.ok(!/\bDean\b/.test(all));
  assert.match(JSON.stringify(PRODUCTS.find((x) => x.id === "marquee")), /Scheduled posting stays off until you turn it on/);
  assert.ok(FAQ.some((f) => /Never on their own/.test(f.a)));
});

test("testimonials: only shown with real content; ties disclosed", () => {
  assert.deepEqual(shownTestimonials([{ name: "A", role: "r" }]), []);
  assert.equal(shownTestimonials([{ name: "A", role: "r", quote: "Real words." }]).length, 1);
  // Parry, 1 Oct: Annette, Travis, Mark H. and Greg James work with him; Shellie C., Jara H. and T. Taylor do not.
  for (const n of ["Annette Judd", "Travis Evenden"]) assert.match(TESTIMONIALS.find((t) => t.name === n)!.tie ?? "", /with Parry/);
  for (const n of ["Mark H.", "Greg James"]) assert.match(TESTIMONIALS.find((t) => t.name === n)!.tie ?? "", /Parry's team/, n);
  for (const n of ["Shellie C.", "Jara H.", "T. Taylor"]) assert.equal(TESTIMONIALS.find((t) => t.name === n)!.tie, undefined, n);
  for (const t of TESTIMONIALS) assert.ok(!/\bDean\b/.test(t.quote ?? ""), t.name);
});

test("the ONE film on the page has its file, captions and poster", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  for (const f of ["public/home/one-film.mp4", "public/home/one-film.vtt", "public/home/one-film.jpg"]) assert.ok(existsSync(f), f);
  const vtt = readFileSync("public/home/one-film.vtt", "utf8");
  assert.match(vtt, /^WEBVTT/);
  assert.equal((vtt.match(/-->/g) ?? []).length, 28); // the voiced film's 28 lines
  assert.match(readFileSync("app/page.tsx", "utf8"), /src="\/home\/one-film\.mp4"/);
});

test("product tours are voiced files played on the page, never the silent /film pages", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const page = readFileSync("app/page.tsx", "utf8");
  assert.ok(!/href=\{?["'`]?\/film\//.test(page) && !/p\.film\}/.test(page.replace("film={p.film}", "")), "no links to /film pages");
  for (const p of PRODUCTS) if (p.film) {
    assert.match(p.film.src, /^\/home\/films\/.+\.mp4$/, p.id);
    assert.ok(existsSync(`public${p.film.src}`), `${p.id}: voiced file missing`);
  }
});

test("all nine testimonials show, word for word, with Parry's edits", () => {
  const shown = shownTestimonials();
  assert.equal(shown.length, 9);
  const t = (n: string) => TESTIMONIALS.find((x) => x.name === n)!;
  assert.match(t("Travis Evenden").quote!, /^I was on the verge of quitting the business entirely/);
  assert.match(t("Mark H.").quote!, /It makes me a better person\./); // typo fixed
  assert.match(t("Jara H.").quote!, /^Parry and Aaron/); // "Dean" -> "Parry"
  assert.equal(t("Annette Judd").video!.src, "/home/stories/annette-judd.mp4");
  for (const x of TESTIMONIALS) assert.ok(!/\bDean\b/.test(x.quote ?? ""), x.name);
});

test("the VIP50V50 code is never advertised on the public page (Parry, 1 Oct)", async () => {
  const { readFileSync } = await import("node:fs");
  assert.ok(!/VIP50V50/i.test(readFileSync("app/page.tsx", "utf8")));
  assert.ok(!/VIP50V50/i.test(JSON.stringify({ PRODUCTS, PACKAGES, FAQ, TESTIMONIALS })));
});

test("every product's voiced tour is on the page, with sound (never muted), posters and captions", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  for (const p of PRODUCTS) {
    assert.ok(p.film, `${p.id} has no tour`);
    for (const f of [p.film!.src, p.film!.poster!, p.film!.captions!]) assert.ok(existsSync(`public${f}`), f);
    assert.match(readFileSync(`public${p.film!.captions}`, "utf8"), /^WEBVTT/);
  }
  for (const f of ["components/sales/InlineFilm.tsx", "app/page.tsx"]) assert.ok(!/\bmuted\b/.test(readFileSync(f, "utf8")), f);
  // testimonial photos are served by the site itself
  for (const t of TESTIMONIALS) if (t.photo) { assert.match(t.photo, /^\/home\/stories\//, t.name); assert.ok(existsSync(`public${t.photo}`), t.photo); }
});

test("founder photos: Parry is the portrait in glasses, Aaron the plaid shirt (Parry, 1 Oct)", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  for (const f of ["parry-and-aaron", "parry-ward", "aaron-pehrson"]) assert.ok(existsSync(`public/home/founders/${f}.jpg`), f);
  const page = readFileSync("app/page.tsx", "utf8");
  assert.ok(page.indexOf('src="/home/founders/parry-ward.jpg"') < page.indexOf("<h3>Parry Ward</h3>"));
  assert.ok(page.indexOf('src="/home/founders/aaron-pehrson.jpg"') < page.indexOf("<h3>Aaron Pehrson</h3>"));
  assert.ok(page.indexOf('src="/home/founders/aaron-pehrson.jpg"') > page.indexOf("<h3>Parry Ward</h3>"));
});

test("each package button opens checkout with that package selected (CHECKOUT.md §4 1a)", async () => {
  const { readFileSync } = await import("node:fs");
  assert.equal(joinFor("relationship"), "https://vip50one.com/join?package=relationship&interval=month");
  assert.equal(joinFor("complete"), "https://vip50one.com/join?package=complete&interval=month");
  assert.equal(joinFor("complete", "year"), "https://vip50one.com/join?package=complete&interval=year");
  assert.equal(joinFor("elite"), "https://vip50one.com/join?package=elite");
  assert.match(readFileSync("app/page.tsx", "utf8"), /href=\{joinFor\(p\.id\)\}/);
  for (const p of PACKAGES) assert.ok(!/code=/i.test(joinFor(p.id)), "never a code in the link");
});
