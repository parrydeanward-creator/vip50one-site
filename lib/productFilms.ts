import type { BusinessGraph, GraphEdge, GraphNode, ProductKey } from "./graph/types.ts";
import { demoGraph } from "./graph/demo.ts";
import { indexGraph, childrenOf } from "./graph/model.ts";
import type { WatchStep } from "./watch.ts";

// One short film per product (Parry, 30 Sep): the product at the centre, its
// real areas appearing one by one (from the same in-depth model the dashboard
// draws), a closer look where it matters, then "Part of ONE". Captions use
// each app's own words. Example agent; invented people.

export type FilmProduct = Exclude<ProductKey, "one">;

interface Beat {
  area: string; // area node id (level 2 under the product)
  kids?: boolean; // open it: its children fan out around it
  kicker?: string;
  title: string;
  line?: string;
  ms?: number;
}

interface Script {
  tagline: string; // intro title
  intro: string; // intro line
  beats: Beat[];
  outro: string; // "ONE GO. Your day, in points. Part of ONE."
}

export const SCRIPTS: Record<FilmProduct, Script> = {
  go: {
    tagline: "Your day, in points.",
    intro: "The phone app that runs the VIP-50 method.",
    beats: [
      { area: "go-today", kicker: "Today", title: "Open it and know what to do.", line: "Your VIP-50 tasks, face-to-face this week, special dates, the next event." },
      { area: "go-daily", kids: true, kicker: "Daily Tracker", title: "Every call, text and note counts.", line: "26 points a day. Check them off as you go." },
      { area: "go-weekly", kicker: "Weekly score", title: "Daily points, plus the bigger plays.", line: "Drop-bys, open houses, agent attraction. 100 meets the week." },
      { area: "go-contacts", kicker: "VIP contacts", title: "Your VIP-50, always in front of you.", line: "Value touches, the touch audit, what you know about each person." },
      { area: "go-map", kicker: "Drop-By Map", title: "Who is near you, and who is due.", line: "Plan the route. Birthdays first." },
      { area: "go-score", kids: true, kicker: "Scoreboard", title: "Streaks, badges and the weekly leaderboard.", line: "Win the week. Take the crown." },
      { area: "go-challenge", kicker: "90-Day Challenge", title: "Body, spirit, relationships, business, legacy.", line: "Ninety days that change your year." },
    ],
    outro: "ONE GO. Your day, in points. Part of ONE.",
  },
  move: {
    tagline: "Every relationship you have.",
    intro: "Your whole book of business, in one place.",
    beats: [
      { area: "move-0", kids: true, kicker: "Contacts", title: "Everyone you know.", line: "VIP-50, VIP-100, past clients, new leads, and who you haven't talked to." },
      { area: "move-2", kicker: "VIP Management", title: "Choose your VIP-50.", line: "The most overdue come first." },
      { area: "move-1", kids: true, kicker: "Touch Audit", title: "Every VIP, touched every month.", line: "Call, video text, social, newsletter, mixer invite. Face-to-face, a note and a drop-by each quarter.", ms: 5400 },
      { area: "move-3", kicker: "Follow-ups", title: "Every promise you made, kept.", line: "Overdue ones rise to the top." },
      { area: "move-4", kids: true, kicker: "New to sort", title: "Open house visitors land here, tagged.", line: "Never dropped into your VIP-50. You decide." },
      { area: "move-5", kicker: "Mixer", title: "Invite your people. They RSVP.", line: "Yes, maybe or no, right from the invite." },
      { area: "move-6", kicker: "Newsletter", title: "Every month, to everyone who matters.", line: "See who got it. Resend to who didn't." },
      { area: "move-8", kicker: "Results", title: "Your relationships are producing.", line: "Referrals, closings and referral GCI, all in one place." },
    ],
    outro: "ONE MOVE. Every relationship you have. Part of ONE.",
  },
  marquee: {
    tagline: "Every listing, marketed.",
    intro: "Built for you. Approved by you.",
    beats: [
      { area: "marquee-2", kids: true, kicker: "Start a new listing", title: "Four kinds of campaign.", line: "Win the listing, launch it, relaunch it, or go after an expired one." },
      { area: "marquee-1", kicker: "Listing appointment", title: "Walk in with the presentation built.", line: "Review it, present it, then tell Marquee if you won." },
      { area: "marquee-3", kids: true, kicker: "1482 Maple Ridge Dr", title: "Every listing, step by step.", line: "Nine steps from the photos to closed. You always know the next one.", ms: 5400 },
      { area: "marquee-0", kicker: "This week", title: "What needs you, and how long it takes.", line: "Three things. About thirty-five minutes." },
      { area: "marquee-5", kicker: "Posting", title: "Nothing posts until you approve it.", line: "Scheduled posting stays off until you turn it on." },
      { area: "marquee-4", kicker: "Seller reports", title: "Six questions every Friday.", line: "Your seller always knows how it is going." },
    ],
    outro: "Marquee. Every listing, marketed. Part of ONE.",
  },
  open: {
    tagline: "From sign-in to signed.",
    intro: "Every open house, in four phases.",
    beats: [
      { area: "open-0", kids: true, kicker: "Plan", title: "Permission, the buyer profile, a lender co-host.", line: "Done before you print a thing." },
      { area: "open-1", kids: true, kicker: "Prepare", title: "Stories, ads, door knocks, the MLS, flyers, the kit.", line: "Each task on its own clock, counting down.", ms: 5000 },
      { area: "open-2", kids: true, kicker: "Host", title: "Signs out. Kiosk up. Safety check-in on.", line: "Then the Exclusive Neighborhood Tour in the first thirty minutes.", ms: 5000 },
      { area: "open-3", kids: true, kicker: "Follow Up", title: "A video text to every visitor, day zero.", line: "Rate them, finish your notes, send the reports.", ms: 5000 },
      { area: "open-4", kicker: "Needs you", title: "What slipped, before it costs you.", line: "A failed email, unrated visitors, neighbor RSVPs." },
      { area: "open-5", kicker: "Scorecard", title: "Your business-building machine.", line: "Visitors, conversations, clients. Week after week." },
    ],
    outro: "ONE Open. From sign-in to signed. Part of ONE.",
  },
  showly: {
    tagline: "Every buyer tour.",
    intro: "Capture every home. Send one recap.",
    beats: [
      { area: "showly-0", kids: true, kicker: "Your tours", title: "One tour per showing day.", line: "Photos, a voice note and what they said, home by home." },
      { area: "showly-2", kids: true, kicker: "What came back", title: "Yes, maybe or no, on every home.", line: "With their notes, the moment they answer." },
      { area: "showly-1", kicker: "Since you sent", title: "Who answered, and who hasn't opened it.", line: "So no buyer goes quiet on you." },
      { area: "showly-3", kids: true, kicker: "Your buyer", title: "What they're telling you, tour after tour.", line: "And what they're approved to." },
      { area: "showly-4", kicker: "Pre-approval letters", title: "Ask the lender, right from the home.", line: "See the moment it's ready." },
      { area: "showly-5", kicker: "Your lender", title: "On every recap you send.", line: "They never see your notes." },
    ],
    outro: "Showly. Every buyer tour. Part of ONE.",
  },
};

// Short names on screen for tasks whose full wording is a sentence (the
// dashboard keeps the app's full wording).
const SHORT: Record<string, string> = {
  "op-p1": "Permission", "op-p2": "Verify the Buyer Profile", "op-p3": "Lender co-host",
  "op-r1": "Daily prep stories", "op-r2": "Paid social ads", "op-r3": "Door knock", "op-r4": "Confirm it's live in the MLS",
  "op-r5": "3 alternate homes", "op-r6": "Flyers and QR sign-in", "op-r7": "Load the kit",
  "op-h1": "Signs and balloons", "op-h2": "Kiosk and sign-in notice", "op-h3": "Safety check-in", "op-h4": "Neighborhood Tour", "op-h5": "Pick up every sign",
  "op-f1": "Video text every visitor", "op-f2": "Rate every attendee", "op-f3": "Seller report", "op-f4": "Buyer reports", "op-f5": "60-second debrief",
  "mq-s-live": "Tell Marquee it's live",
};

const LABEL: Record<FilmProduct, string> = { go: "ONE GO", move: "ONE MOVE", marquee: "Marquee", open: "ONE Open", showly: "Showly" };

export interface ProductFilm {
  graph: BusinessGraph;
  steps: WatchStep[];
  spots: Record<string, [number, number]>;
  center: string;
  keep: string[];
}

const AREA_R = 300;
const KID_R = 240;

export function productFilm(p: FilmProduct): ProductFilm {
  const ix = indexGraph(demoGraph("complete"));
  const script = SCRIPTS[p];
  const areas = script.beats.map((b) => b.area);
  const nodes: GraphNode[] = [{ ...ix.byId.get(p)!, parentId: null, status: undefined }];
  const spots: Record<string, [number, number]> = {};
  const edges: GraphEdge[] = [];
  const kidsOf: Record<string, string[]> = {};

  areas.forEach((a, i) => {
    const n = ix.byId.get(a)!;
    nodes.push(n);
    edges.push({ id: `${p}>${a}`, source: p, target: a, relationshipType: "belongs_to", strength: 1 });
    const deg = -90 + (i * 360) / areas.length;
    spots[a] = [deg, AREA_R];
    const beat = script.beats[i];
    if (!beat.kids) return;
    const kids = childrenOf(ix, a);
    kidsOf[a] = kids.map((k) => k.id);
    // Fan the children out beyond their area, on the side away from the
    // centre. Big groups alternate between two rings so labels don't collide.
    const two = kids.length > 5;
    const span = two ? 170 : Math.min(62 * (kids.length - 1), 170);
    const step = kids.length > 1 ? span / (kids.length - 1) : 0;
    const ax = Math.cos((deg * Math.PI) / 180) * AREA_R, ay = Math.sin((deg * Math.PI) / 180) * AREA_R;
    kids.forEach((k, j) => {
      const kd = deg - span / 2 + j * step;
      const r = two && j % 2 ? KID_R + 150 : KID_R;
      const kx = ax + Math.cos((kd * Math.PI) / 180) * r, ky = ay + Math.sin((kd * Math.PI) / 180) * r;
      spots[k.id] = [(Math.atan2(ky, kx) * 180) / Math.PI, Math.hypot(kx, ky)];
      nodes.push({ ...k, label: SHORT[k.id] ?? k.label });
      edges.push({ id: `${a}>${k.id}`, source: a, target: k.id, relationshipType: "belongs_to", strength: 1 });
    });
  });

  const steps: WatchStep[] = [
    { id: `${p}-intro`, show: [p], focus: [p], product: p, kicker: LABEL[p], title: script.tagline, line: script.intro, ms: 4000 },
  ];
  script.beats.forEach((b, i) => {
    const kids = kidsOf[b.area] ?? [];
    const shownAreas = areas.slice(0, i + 1);
    // Opening an area: the others step aside so its detail has the room;
    // otherwise every area so far stays on screen.
    steps.push({
      id: `${p}-${b.area}`,
      clear: true,
      show: kids.length ? [b.area, ...kids] : shownAreas,
      focus: kids.length ? [p, b.area, ...kids] : [p, ...shownAreas],
      flight: [p, b.area],
      product: p,
      kicker: b.kicker ?? ix.byId.get(b.area)!.label,
      title: b.title,
      line: b.line ?? "",
      ms: b.ms ?? (kids.length ? 4800 : 4200),
    });
  });
  steps.push({ id: "outro", clear: true, show: areas, focus: [p, ...areas], product: p, kicker: "", title: script.outro, line: "", ms: 5000 });
  return { graph: { nodes, edges, rootId: p }, steps, spots, center: p, keep: [p] };
}

export const FILM_PRODUCTS: FilmProduct[] = ["go", "move", "marquee", "open", "showly"];
