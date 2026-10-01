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
  // The voiced showcase film, played right on the page. Left out until the
  // voiced file is in public/home/films/ (the silent /film pages are not used).
  film?: { src: string; poster?: string; captions?: string };
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
    film: { src: "/home/films/go.mp4", poster: "/home/films/go.jpg", captions: "/home/films/go.vtt" },
    device: "phone",
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
    film: { src: "/home/films/move.mp4", poster: "/home/films/move.jpg", captions: "/home/films/move.vtt" },
    device: "laptop",
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
    film: { src: "/home/films/marquee.mp4", poster: "/home/films/marquee.jpg", captions: "/home/films/marquee.vtt" },
    device: "laptop",
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
    film: { src: "/home/films/open.mp4", poster: "/home/films/open.jpg", captions: "/home/films/open.vtt" },
    device: "phone",
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
    film: { src: "/home/films/showly.mp4", poster: "/home/films/showly.jpg", captions: "/home/films/showly.vtt" },
    device: "phone",
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
  role?: string; // title, brokerage, city, as the person's page shows it
  quote?: string; // written: the full quote, word for word
  video?: { src: string; poster?: string; captions?: string }; // web copy, hosted with the site
  photo?: string;
  tie?: string; // disclosure line for anyone with a business tie to Parry
}

// From research/TESTIMONIALS.md (ops chat, 1 Oct): word for word from the live
// pages with Parry's edits ("Dean" -> "Parry", one typo). Parry approved all,
// in full. Photos are the ones GHL showed beside each quote, copied here.

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Annette Judd",
    role: "Real Estate Broker, West Point, Utah",
    video: { src: "/home/stories/annette-judd.mp4", poster: "/home/stories/annette-judd-poster.jpg" },
    quote: "I added 11 transactions from my sphere after implementing VIP-50. This completely changed how I run my business.",
    photo: "/home/stories/annette-judd.jpg",
    tie: "Annette leads a team with Parry at The Luxury Agency.",
  },
  {
    name: "Travis Evenden",
    role: "Real Estate Agent / Luxury Agency Team Lead, Idaho",
    quote:
      "I was on the verge of quitting the business entirely and returning to a regular 9-to-5 job. But after joining VIP-50, everything changed. I'm now the team lead for Idaho with multiple transactions actively flowing through my pipeline—and this transformation happened in just a few short months.",
    photo: "/home/stories/travis-evenden.jpg",
    tie: "Travis leads a team with Parry at The Luxury Agency.",
  },
  {
    name: "Holly Lane",
    role: "M.S. Realtor",
    quote:
      "What I have enjoyed about the VIP50 program is the emphasis that's placed on something we're all starved for — genuine connection with others. The fact that I can prioritize my relationships with the people I care about as a facet of my business is a no brainer. It's also a great community of agents and likeminded people to come together and get support, advice, or just camaraderie; something that is incredibly valuable in this oftentimes isolating business.",
    photo: "/home/stories/holly-lane.jpg",
  },
  {
    name: "Greg James",
    role: "Real Estate Advisor",
    quote:
      "After more than 30 years in the real estate business, I've seen just about every coaching program out there—and very few truly move the needle. The VIP-50 program is different. It's not just theory; it's a clear, proven system that creates real momentum and measurable results. If you're serious about growth and operating at a higher level, VIP-50 is the real deal.",
    photo: "/home/stories/greg-james.jpg",
    tie: "Greg is an agent on Parry's team at The Luxury Agency.",
  },
  {
    name: "Femi Collaku",
    role: "Real Estate Agent, Exit Realty",
    quote:
      "VIP-50 is a great tool and training to scale your business to the next level. I have been working hard to differentiate myself using the VIP-50 to take my business much higher. My people are willing to help me achieve my goals especially with how much value I have been giving them using the VIP-50 system.",
    photo: "/home/stories/femi-collaku.jpg",
  },
  {
    name: "Shellie C.",
    quote:
      "The VIP-50 training was the professional intervention I didn't know I needed. The trainers politely (but firmly) pointed out that I've mostly been getting in my own way, and this program finally gave me the roadmap to step aside and let my business actually grow. I've traded my \"winging it\" strategy for a predictable, referral-heavy model that doesn't involve me spinning my wheels. If you're ready to stop being your own biggest bottleneck and start scaling with some actual clarity, this is it.",
    photo: "/home/stories/shellie-c.jpg",
  },
  {
    name: "Mark H.",
    quote:
      "VIP 50 has completely rewritten how I interact with my people. As an agent your people are your highest priority and this has made every conversation, text, and event have so much more meaning. These people are people I have chosen not only to pour into, but to accept help, feedback, and support from. The program doesn't just benefit me as an agent. It makes me a better person. I bend over backwards to help and protect my sphere and this has helped me take back my time and dive deeper into building up the people I'm closest with. Highly recommend it. If you jump all in with an open mind and fully effort you will never look back!",
    photo: "/home/stories/mark-h.jpg",
    tie: "Mark is an agent on Parry's team at The Luxury Agency.",
  },
  {
    name: "Jara H.",
    quote:
      "Parry and Aaron have completely changed my business model, The VIP 50 is brilliantly designed retraining the way your business SOI is built, and in turn has helped me truly connect with people and serve my clients better! I will be forever grateful for their mentorship and dedication to serve their people.",
    photo: "/home/stories/jara-h.jpg",
  },
  {
    name: "T. Taylor",
    quote:
      "I am a huge fan of the VIP 50 system that Parry & Aaron have taught me. This is the key to getting your SOI to actually go out of their way to use you as an agent, rather than hoping they do by your social media presence. Parry & Aaron are both very committed to showing up for you, so that you can show up better for your friends.",
  },
];

export const shownTestimonials = (list = TESTIMONIALS) => list.filter((t) => (t.quote && t.quote.trim()) || t.video?.src);

export const FAQ: { q: string; a: string }[] = [
  { q: "Is there a free trial?", a: "Yes. ONE Relationship and ONE Complete start with 7 days free, one trial per person. You add a card at checkout and can cancel before the trial ends. Elite is paid up front." },
  { q: "What is founding pricing?", a: "The first 50 members pay $199 a month for ONE Relationship or $399 for ONE Complete, instead of $299 and $499, for as long as they stay a member. When the 50 spots are gone, the page shows list prices." },
  { q: "Is there an annual plan?", a: "Yes. Paying for a year gets you two months free." },
  { q: "Can I buy one product on its own?", a: "No. ONE comes as packages, because the products work together: what happens in one shows up in the others and in ONE Brain." },
  { q: "Does anything post or send without me?", a: "No. Nothing publishes on your behalf unless you approved that exact piece and either pressed publish or switched on scheduled posting for that listing yourself. It is off until you do." },
  { q: "Do open house visitors go into my VIP-50?", a: "Never on their own. Visitors and tour buyers are kept with their source; ONE suggests the follow-up and you decide." },
  { q: "I'm a loan officer.", a: "Showly's lender side is $150 a month and works alongside the agents you partner with." },
  { q: "I'm already a member.", a: "Sign in at the top of the page with the same email and password as ONE GO and ONE MOVE." },
];
