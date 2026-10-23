// The example agent's site activity (VIP-SUMMARY §3ar), in ONE MOVE's own answer shapes, so "On your site", "Who is on
// my site" and "Team sites this week" draw filled with ?demo=1. Every name, address and number is invented; the people
// are the example store's (lib/examples/move2.ts), so Open lands on a real example contact. Nothing leaves the browser.

import type { Range } from "../siteActivity.ts";

const MIN = 60_000;
const DAY = 86_400_000;

/** A time today, `ago` minutes back, never before 6:00 this morning (so "Today" stays today). */
function todayAt(now: number, ago: number): string {
  const d = new Date(now);
  const six = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 0, 0).getTime();
  const t = now - ago * MIN;
  if (t >= six || now <= six) return new Date(t >= six ? t : now - ago * 1000).toISOString();
  // early in the day: keep the order, squeezed between 6:00 and now
  return new Date(Math.min(now - MIN, six + Math.max(1, 600 - ago) * 1000)).toISOString();
}
const daysAgo = (now: number, n: number) => new Date(now - n * DAY).toISOString();
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);
const perDay = (now: number, visits: number[]) => visits.map((v, i) => ({ date: ymd(now - (visits.length - 1 - i) * DAY), visits: v }));

interface Featured {
  visits7: number; visits30: number; homes7: number; homes30: number; s30: number; sPrev: number; lastMin: number; device: "phone" | "computer";
  spark: number[];
  homes: [string, number, number, number, boolean, string | null][]; // address, price, times, seconds, saved, note
  today: [number, "page" | "home" | "search" | "signed_in" | "saved", string][]; // minutes ago, kind, text
  account: { website: number | null; app: string | null; roomInvited: number | null; roomOpened: number | null; emails: [string, number] | null };
  pulse: [string, "call" | "text" | "showing"] | null;
}

// Five example people with a story on the site; everyone else in the example has none yet.
const FEATURED: Record<string, Featured> = {
  "Miles Avery": {
    visits7: 6, visits30: 14, homes7: 9, homes30: 23, s30: 6120, sPrev: 2280, lastMin: 120, device: "phone",
    spark: [0, 1, 0, 2, 1, 0, 3, 2, 4, 1, 3, 5, 4, 6],
    homes: [
      ["2876 W Oak Hollow Ln, Bountiful", 624_900, 4, 660, true, "Saved · price drop Oct 21"],
      ["4521 Haven Ridge Ct, Centerville", 659_000, 3, 420, false, "Tour booked Sat"],
      ["1148 Copper Creek Dr, Farmington", 689_000, 2, 300, false, "Above his cap"],
    ],
    today: [
      [126, "home", "Viewed 2876 W Oak Hollow Ln for 4 minutes, opened the photos and the school info"],
      [131, "saved", "Saved a search: 4+ beds, Bountiful, under $650k"],
      [138, "signed_in", "Signed in on the ONE Home app"],
      [425, "page", "Read \"Moving to Bountiful\" and \"Cash to close\""],
    ],
    account: { website: 120, app: "iPhone", roomInvited: 3, roomOpened: null, emails: ["daily", 0.8] },
    pulse: ["He opened 2876 W Oak Hollow Ln 4 times since Tuesday, 11 minutes in all, and saved it after the price drop. Ask if he wants a second showing before the weekend.", "call"],
  },
  "Leah Brennan": {
    visits7: 3, visits30: 5, homes7: 1, homes30: 2, s30: 1260, sPrev: 0, lastMin: 300, device: "computer",
    spark: [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 2],
    homes: [["388 Maple Bend Way, Bountiful", 512_000, 3, 540, false, "Her own home: value checked 3 times"]],
    today: [
      [300, "page", "Checked her home value and read \"Selling in winter\""],
      [305, "signed_in", "Signed in on your site"],
    ],
    account: { website: 300, app: null, roomInvited: null, roomOpened: null, emails: ["monthly", 0.55] },
    pulse: ["Leah checked her own home's value 3 times this week and read \"Selling in winter\". Call to ask what is on her mind.", "call"],
  },
  "Ruby Callahan": {
    visits7: 1, visits30: 1, homes7: 6, homes30: 6, s30: 1080, sPrev: 0, lastMin: 45, device: "phone",
    spark: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    homes: [
      ["77 Sunridge Cir, Woods Cross", 469_900, 2, 260, true, "Saved"],
      ["915 Ivy Glen Dr, Kaysville", 489_000, 1, 180, false, null],
    ],
    today: [
      [45, "home", "Looked at 6 homes in Woods Cross and Kaysville under $500k"],
      [62, "signed_in", "Made an account on your site"],
    ],
    account: { website: 62, app: null, roomInvited: null, roomOpened: null, emails: ["daily", 1] },
    pulse: ["New on your site today: 6 homes under $500k in 18 minutes. A text now, while she is looking, gets the best answer.", "text"],
  },
  "Jen Alvarez": {
    visits7: 2, visits30: 2, homes7: 0, homes30: 0, s30: 420, sPrev: 0, lastMin: 1500, device: "computer",
    spark: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    homes: [],
    today: [],
    account: { website: 1500, app: null, roomInvited: null, roomOpened: null, emails: null },
    pulse: ["Back on your site after 4 months, reading \"Moving to Utah\". Worth a text.", "text"],
  },
  "Stella Moreno": {
    visits7: 4, visits30: 9, homes7: 3, homes30: 8, s30: 2400, sPrev: 1800, lastMin: 200, device: "phone",
    spark: [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1],
    homes: [["240 Orchard Row, Centerville", 575_000, 3, 480, true, "Saved"]],
    today: [[200, "home", "Viewed 240 Orchard Row again, 8 minutes"]],
    account: { website: 200, app: "Android", roomInvited: 10, roomOpened: 8, emails: ["weekly", 0.6] },
    pulse: null,
  },
};

/** ONE MOVE's `GET people/:id/site` for one example person (zeros for someone with no story). */
export function exampleSiteBody(name: string, now: number) {
  const f = FEATURED[name];
  if (!f) return { visits_7: 0, visits_30: 0, homes_viewed_7: 0, homes_viewed_30: 0, seconds_30: 0, seconds_prev_30: 0, last_visit_at: null, last_device: null, per_day: perDay(now, new Array(14).fill(0)), homes: [], today: [], account: { website: null, app: null, room: null, emails: null }, pulse: null };
  const a = f.account;
  return {
    visits_7: f.visits7,
    visits_30: f.visits30,
    homes_viewed_7: f.homes7,
    homes_viewed_30: f.homes30,
    seconds_30: f.s30,
    seconds_prev_30: f.sPrev,
    last_visit_at: new Date(now - f.lastMin * MIN).toISOString(),
    last_device: f.device,
    per_day: perDay(now, f.spark),
    homes: f.homes.map(([address, price, times, seconds, saved, note], i) => ({ property_key: `example-${i}-${address.split(" ")[0]}`, address, price, times, seconds, saved, note })),
    today: f.today.map(([ago, kind, text]) => ({ at: todayAt(now, ago), kind, text })),
    account: {
      website: a.website != null ? { signed_in_at: new Date(now - a.website * MIN).toISOString() } : null,
      app: a.app ? { platform: a.app, last_at: new Date(now - f.lastMin * MIN).toISOString() } : null,
      room: a.roomInvited != null ? { invited_at: daysAgo(now, a.roomInvited), opened_at: a.roomOpened != null ? daysAgo(now, a.roomOpened) : null } : null,
      emails: a.emails ? { cadence: a.emails[0], open_rate: a.emails[1] } : null,
    },
    pulse: f.pulse ? { line: f.pulse[0], action: f.pulse[1] } : null,
  };
}

const ACTIVITY: Record<Range, { signed_in: number; visits: number; new_leads: number; top: [number, number] }> = {
  today: { signed_in: 4, visits: 63, new_leads: 1, top: [7, 2] },
  "7d": { signed_in: 18, visits: 412, new_leads: 6, top: [38, 9] },
  "30d": { signed_in: 41, visits: 1690, new_leads: 19, top: [121, 24] },
};
const LINES: Record<string, [string, "hot" | "warm" | "new" | null, string, "call" | "text"]> = {
  "Miles Avery": ["Buyer", "hot", "Viewed 2876 W Oak Hollow Ln 4 times since Tue · saved it", "call"],
  "Leah Brennan": ["Past client", "warm", "Looked at her home value 3 times · read \"Selling in winter\"", "call"],
  "Ruby Callahan": ["New lead · your site", "new", "First visit: 6 homes in Woods Cross under $500k · 18 minutes", "text"],
  "Stella Moreno": ["Buyer", "warm", "Came back to 240 Orchard Row 3 times · saved it", "call"],
  "Jen Alvarez": ["VIP-50", null, "Came back after 4 months · read \"Moving to Utah\"", "text"],
};

/** ONE MOVE's `GET site/activity`; `people` are the example store's, so Open finds them. */
export function exampleActivityBody(range: Range, people: { id: string; name: string }[]) {
  const a = ACTIVITY[range];
  const order = range === "today" ? ["Ruby Callahan", "Miles Avery", "Stella Moreno", "Leah Brennan"] : ["Miles Avery", "Leah Brennan", "Ruby Callahan", "Stella Moreno", "Jen Alvarez"];
  const rows = order.flatMap((name) => {
    const p = people.find((x) => x.name === name);
    const l = LINES[name];
    return p && l ? [{ contact_id: p.id, name, kind: l[0], heat: l[1], line: l[2], action: l[3] }] : [];
  });
  return {
    signed_in: a.signed_in,
    visits: a.visits,
    new_leads: a.new_leads,
    top_home: { address: "2876 W Oak Hollow Ln", views: a.top[0], saves: a.top[1] },
    top_pages: ["Search", "Sell", "Moving to Utah"],
    top_area: "Bountiful",
    phone_share: 0.71,
    busiest: "Sun 7-9 pm",
    people: rows,
  };
}

/** The example team's `GET team/site?range=7d` (the example team, lib/teamPeople.ts demoPeople). */
export function exampleTeamSiteBody() {
  return {
    visits: 1154,
    signed_in: 44,
    new_leads: 16,
    avg_minutes_to_reach: 19,
    agents: [
      // the example team's people (lib/teamPeople.ts demoPeople), so Open lands on their orbs
      { user_id: "x1", name: "Jen (example)", visits: 412, signed_in: 18, new_leads: 6, minutes_to_reach: 4 },
      { user_id: "x2", name: "Marcus (example)", visits: 233, signed_in: 9, new_leads: 4, minutes_to_reach: 11 },
      { user_id: "x3", name: "Dave (example)", visits: 198, signed_in: 7, new_leads: 3, minutes_to_reach: 26 },
      { user_id: "x4", name: "Lisa (example)", visits: 141, signed_in: 5, new_leads: 2, minutes_to_reach: null },
      { user_id: "x5", name: "Angelina (example)", visits: 74, signed_in: 2, new_leads: 0, minutes_to_reach: null },
    ],
    to_route: [
      { contact_id: "00000000-0000-4000-8000-0000000009a1", name: "Brooke Kim (example)", line: "Viewed 5 Farmington homes · not assigned" },
      { contact_id: "00000000-0000-4000-8000-0000000009a2", name: "Luis Navarro (example)", line: "Home value check · Kaysville · in the lead pool" },
    ],
    top_homes: [
      { address: "2876 W Oak Hollow Ln, Bountiful", views: 38, saves: 9, agent: "Jen (example)" },
      { address: "1840 Sunridge Dr, Centerville", views: 31, saves: 12, agent: "Jen (example)" },
      { address: "7731 Granite Peak Way, Farmington", views: 22, saves: 4, agent: "Marcus (example)" },
    ],
  };
}
