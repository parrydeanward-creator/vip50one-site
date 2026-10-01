// The vip50one.com sales page content (CLAUDE.md §3 "Layout and domains":
// visitors see the sales letter, all five products, the packages, buy ->
// checkout). Prices are ECOSYSTEM.md §7 / CHECKOUT.md, final. Feature lines
// are what each live app does (read 30 Sep for the showcase films); anything
// not built yet says so. Testimonials: Parry confirmed all for reuse in full
// (1 Oct); anyone with a business tie to Parry carries a disclosure line.

export const JOIN = "https://vip50one.com/join";

export interface SalesProduct {
  id: "go" | "move" | "marquee" | "open" | "showly";
  name: string;
  where: string; // what it runs on
  line: string;
  points: string[];
  image: string;
  device: "phone" | "laptop";
  film: string;
  in: ("relationship" | "complete")[];
}

export const PRODUCTS: SalesProduct[] = [
  {
    id: "go",
    name: "ONE GO",
    where: "The phone app",
    line: "Your day, decided. Open it and do the work.",
    points: [
      "A task list built for you every morning: who to call, text, write to and visit, and why",
      "Calls and video texts made from the app check themselves off",
      "Time blocks, the Business Rolodex and one-touch referrals",
      "Hot / Warm / Cold, the drop-by map and the Lounge",
      "A daily score and a weekly score, so you know where you stand",
    ],
    image: "/home/go.jpg",
    device: "phone",
    film: "/film/go",
    in: ["relationship", "complete"],
  },
  {
    id: "move",
    name: "ONE MOVE",
    where: "On your computer",
    line: "Everyone you know, and what you promised them.",
    points: [
      "A morning brief written for you, and \"What's my next move?\" with the words drafted",
      "Move people up from New Connection to VIP-50 and beyond",
      "The Touch Audit: every VIP's touches for the month at a glance",
      "Mixer invites designed with AI, newsletters in minutes, landing pages that bring leads",
      "Action plans and a monthly market report for each client's neighborhood",
    ],
    image: "/home/move.jpg",
    device: "laptop",
    film: "/film/move",
    in: ["relationship", "complete"],
  },
  {
    id: "marquee",
    name: "Marquee",
    where: "On your computer and phone",
    line: "Every listing, marketed like a luxury listing.",
    points: [
      "Walk into the appointment with the presentation and your own comparable sales",
      "Add the address and photos; Marquee builds the whole campaign",
      "Packet, flyer, open house kit, social posts, a reel and a publishing calendar",
      "You approve every piece. Scheduled posting stays off until you turn it on",
      "Let your seller watch the open house live, and send a weekly report from six quick answers",
    ],
    image: "/home/marquee.jpg",
    device: "laptop",
    film: "/film/marquee",
    in: ["complete"],
  },
  {
    id: "open",
    name: "ONE Open",
    where: "Phone and tablet",
    line: "Every open house, from sign-in to signed.",
    points: [
      "Plan, Prepare, Host and Follow Up, with every task on its own clock",
      "Invite the neighbors first with the Exclusive Neighborhood Tour",
      "Kiosk sign-in at the door, and a live view while you host, with a safety check-in",
      "Rate every visitor; the follow-up plan is already written",
      "Send the seller the report in one tap",
    ],
    image: "/home/open.jpg",
    device: "phone",
    film: "/film/open",
    in: ["complete"],
  },
  {
    id: "showly",
    name: "Showly",
    where: "The phone, on tour",
    line: "Every buyer tour, captured.",
    points: [
      "Snap the listing sheet and Showly fills in the details",
      "Talk as you walk through; Showly drafts the write-up for you to read",
      "One recap for the whole tour, sent by text",
      "Your buyer answers every home: Yes, Maybe or No, with a note",
      "Ask the lender for a pre-approval letter right from the home",
    ],
    image: "/home/showly.jpg",
    device: "phone",
    film: "/film/showly",
    in: ["complete"],
  },
];

export interface Package {
  id: "relationship" | "complete" | "elite";
  name: string;
  tag: string;
  founding: string; // first 50 members
  list: string;
  annual: string; // founding / list per year
  includes: string[];
  trial: boolean;
  featured?: boolean;
}

export const PACKAGES: Package[] = [
  {
    id: "relationship",
    name: "ONE Relationship",
    tag: "The VIP-50 method, run every day",
    founding: "$199",
    list: "$299",
    annual: "or $1,990 a year founding ($2,990 list): two months free",
    includes: ["ONE GO", "ONE MOVE", "ONE Brain, your dashboard"],
    trial: true,
  },
  {
    id: "complete",
    name: "ONE Complete",
    tag: "Your whole business, one place",
    founding: "$399",
    list: "$499",
    annual: "or $3,990 a year founding ($4,990 list): two months free",
    includes: ["ONE GO", "ONE MOVE", "Marquee", "ONE Open", "Showly (agent)", "ONE Brain, your dashboard"],
    trial: true,
    featured: true,
  },
  {
    id: "elite",
    name: "Elite",
    tag: "90 days of coaching with Parry and Aaron",
    founding: "$2,500",
    list: "",
    annual: "one payment for 90 days, then ONE Complete from day 90",
    includes: ["Everything in ONE Complete", "90 days of coaching with Parry and Aaron"],
    trial: false,
  },
];

export interface Testimonial {
  name: string;
  role: string; // title, brokerage, city
  quote?: string; // written: the full quote, word for word
  video?: { src: string; poster?: string; captions?: string }; // web copy, hosted with the site
  tie?: string; // disclosure line for anyone with a business tie to Parry
}

// Filled from research/TESTIMONIALS.md as the full wording and web video
// copies arrive. Only entries with a quote or a video are shown.
export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Annette Judd",
    role: "Broker, West Point, Utah",
    tie: "Annette leads a team with Parry at The Luxury Agency.",
    // video: web copy of "Annette's Testimonial (Short)" from Zach, pending
  },
  { name: "Travis Evenden", role: "Team lead, Idaho", tie: "Travis leads a team with Parry at The Luxury Agency." },
  { name: "Brian Irby", role: "Loan Officer, Phoenix, Arizona" },
  { name: "Holly Lane, M.S.", role: "Realtor" },
  { name: "Greg James", role: "Real Estate Advisor" },
  { name: "Femi Collaku", role: "Exit Realty" },
];

export const shownTestimonials = (list = TESTIMONIALS) => list.filter((t) => (t.quote && t.quote.trim()) || t.video?.src);

export const FAQ: { q: string; a: string }[] = [
  { q: "Is there a free trial?", a: "Yes. ONE Relationship and ONE Complete start with 7 days free, one trial per person. You add a card at checkout and can cancel before the trial ends. Elite is paid up front." },
  { q: "What is founding pricing?", a: "The first 50 members pay $199 a month for ONE Relationship or $399 for ONE Complete, instead of $299 and $499, for as long as they stay a member. When the 50 spots are gone, the page shows list prices." },
  { q: "Is there an annual plan?", a: "Yes. Paying for a year gets you two months free." },
  { q: "I have a VIP50V50 code.", a: "VIP50V50 takes 50% off your first month as a new agent. It can't be combined with founding pricing; checkout uses whichever you choose." },
  { q: "Can I buy one product on its own?", a: "No. ONE comes as packages, because the products work together: what happens in one shows up in the others and in ONE Brain." },
  { q: "Does anything post or send without me?", a: "No. Nothing publishes on your behalf unless you approved that exact piece and either pressed publish or switched on scheduled posting for that listing yourself. It is off until you do." },
  { q: "Do open house visitors go into my VIP-50?", a: "Never on their own. Visitors and tour buyers are kept with their source; ONE suggests the follow-up and you decide." },
  { q: "I'm a loan officer.", a: "Showly's lender side is $150 a month and works alongside the agents you partner with." },
  { q: "I'm already a member.", a: "Sign in at the top of the page with the same email and password as ONE GO and ONE MOVE." },
];
