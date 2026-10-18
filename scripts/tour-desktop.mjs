// Film A: the full tour of ONE on the desktop (Parry, 15 Oct; outline vip50-ecosystem research/films/full-tour-outlines.md,
// approved "build them"). One spoken line a moment, in "you" form, naming only what is on screen. The example agent is
// Sarah Bennett; every person and address is invented. Recorded by scripts/record-tour.mjs.

const BASE = process.env.BASE || "http://localhost:3102";
const TOUR = `${BASE}/dashboard?demo=1&walk=1&slow=${process.env.SLOW || 3}`;

// One step back (Parry, 16 Oct, on Film A: "it should jsut back up on step instead of going all the way to dashboard";
// "one step"): inside a product, its name in the path line at the top goes back one level to that product's orbs. Only
// when the chapter moves to another product does the film go back to the main map first.
const toProduct = async (T, orb) => {
  const path = (await T.p.locator("nav.crumbs").first().innerText().catch(() => "")).toUpperCase();
  if (path.includes(orb.toUpperCase())) {
    const up = T.p.locator("nav.crumbs button").filter({ hasText: new RegExp(`^${orb}$`, "i") });
    if (await up.count()) await T.click(up); // in a tool: one step up; already on the product: stay
    return;
  }
  if (process.env.TRACE) console.log(`MAINMAP for ${orb} (path was "${path.replace(/\s+/g, " ").trim()}")`);
  await T.home();
  await T.click(T.rail(orb));
};
// Open a tool inside an orb: the product's orbs (one step back if already inside it), then the tool from its panel.
const openTool = async (T, orb, tool) => {
  await toProduct(T, orb);
  // Products list their tools down the left (the rail); older panels list them in the drawer.
  const r = T.rail(tool).first();
  if (await r.isVisible().catch(() => false)) await T.click(r);
  else await T.click(T.inside(tool));
};
// The tool's own full screen, from the "Open …" button in its panel.
const openFull = async (T, label) => {
  await T.click(T.inside(label));
  await T.wait(700);
};
// A product's own item: Marquee, Showly and ONE Open list them down the left (the rail).
const openItem = async (T, orb, item) => {
  await toProduct(T, orb);
  await T.click(T.rail(item));
  await T.wait(1200);
};
// A ONE MOVE page: its menu down the left in folding groups (People, Trackers, Events, Outreach, Learn); the live items
// (Looks Hot, New leads today ...) are on the right.
const MOVE_GROUP = { "Follow-ups": "People", Contacts: "People", "VIP Management": "People", "Touch Audit": "People", "Drop-By Map": "People", "Hot/Warm/Cold": "People", "Business Rolodex": "People", "Referral Network": "People", "Buyer Needs": "People", "Life Events": "People", Deals: "People", "New leads": "People", "Looks Hot": "People", "Likely to move": "People", "Daily Tracker": "Trackers", "Weekly Tracker": "Trackers" };
const movePage = async (T, page, group = MOVE_GROUP[page]) => {
  await backToBrain(T);
  await toProduct(T, "ONE MOVE");
  const item = () => T.p.locator(".rail button").filter({ hasText: new RegExp(`^\\s*${page.replace(/[/()]/g, "\\$&")}`) }).first();
  if (group && !(await item().isVisible().catch(() => false))) await T.click(T.p.locator(".rail button").filter({ hasText: new RegExp(`^\\s*${group}`) }).first());
  await T.click(item());
  await T.wait(900);
};
const moveLive = async (T, item) => {
  await toProduct(T, "ONE MOVE");
  await T.click(T.inside(item));
  await T.wait(1200);
};
// Out of a full-screen tool (the Day Clock, Weekly Review ...) back to the map.
const backToBrain = async (T) => {
  const b = T.p.locator('[aria-label="Back to the Brain"]').first();
  if (await b.isVisible().catch(() => false)) await T.click(b);
};
// This week's commitments open from the This week orb itself.
const openWeek = async (T) => {
  await T.p.locator('[aria-label^="This week,"]').first().evaluate((b) => b.click());
  await T.wait(1500);
};
// The example agent's "OK" notes ("in your account this ...") close after they are read.
const closeOk = async (T) => {
  const ok = T.p.getByRole("button", { name: /^OK$/ });
  if (await ok.count()) await ok.first().click({ timeout: 2000 }).catch(() => {});
};
const closeAny = async (T) => {
  const x = T.p.locator('[aria-label="Close"], .pi-close, button:has-text("Back to the map"), button:has-text("← Back")').first();
  if (await x.count()) await T.click(x).catch(() => {});
  await T.p.keyboard.press("Escape").catch(() => {});
  await T.wait(300);
};

export const CHAPTERS = [
  {
    title: "The front door",
    intro: "Welcome to ONE. This is a full tour of everything on your desktop, from the front door to the last setting.",
    moments: [
      { say: "This is vip50one.com. It's where new agents meet ONE: the five products, how they connect, and the packages.", do: async (T) => { await T.p.goto(`${BASE}/`, { waitUntil: "networkidle" }); await T.wait(1500); } },
      { say: "Scroll down and you see each product in turn, and what ONE does for your relationships, your listings and your buyers.", do: async (T) => { await T.p.mouse.wheel(0, 1400); await T.wait(1500); await T.p.mouse.wheel(0, 1400); } },
      { say: "The packages are here: ONE Relationship, ONE Complete and Elite, with ONE Growth for leads.", do: async (T) => { await T.p.goto(`${BASE}/#packages`, { waitUntil: "networkidle" }); } },
      { say: "Signed in, vip50one.com always takes you straight to your Brain. That's where we'll spend the rest of this tour.", do: async (T) => { await T.p.goto(TOUR, { waitUntil: "networkidle" }); await T.wait(2500); } },
    ],
  },
  {
    title: "The Brain at a glance",
    moments: [
      { say: "This is your Brain: your whole business on one map. Gold ONE in the middle is Pulse, the A I that watches it all." },
      { say: "Round it sit ONE YOU, your Team, ONE MOVE, Marquee, Showly, ONE Open and ONE Growth. They're listed down the left too.", do: async (T) => { await T.hover(T.rail("ONE YOU")); await T.wait(600); await T.hover(T.rail("ONE GROWTH")); } },
      { say: "Every orb tells you how it's doing. Pulsing red means something needs you right now. Yellow means today. A still green ring means all good.", do: async (T) => { await T.hover('[aria-label^="ONE MOVE"]').catch(() => {}); } },
      { say: "The number on an orb is how many things inside it need you. Follow the pulse and it leads you straight to the person.", do: async (T) => { await T.hover('[aria-label^="ONE YOU"]').catch(() => {}); } },
      { say: "Click any orb and it comes to the middle, with its panel open on the right.", do: async (T) => { await T.click(T.rail("ONE MOVE")); } },
      { say: "The ONE in the path line at the top takes you back to the whole map.", do: async (T) => { await T.home(); } },
      { say: "Zoom in and out with these buttons, to the right of the map on every screen. The circle brings you back to ONE.", do: async (T) => { await T.click('[aria-label="Zoom in"]'); await T.click('[aria-label="Zoom out"]'); await T.click('[aria-label="Centre on ONE"]').catch(() => {}); } },
      { say: "And the gold question mark opens the key to every light and colour, any time you need it.", do: async (T) => { await T.click('[aria-label="What everything means"]'); await T.wait(2500); } },
      { say: "Every colour and ring is written out here, with a two minute film below if you want it.", do: async (T) => { await T.wait(1500); await closeAny(T); await T.home(); } },
    ],
  },
  {
    title: "ONE Growth",
    intro: "Chapter three. ONE Growth: leads from your own ads, at cost, with no per-lead fees.",
    moments: [
      { say: "ONE Growth is the lead side of ONE. Open it and its tools sit round it.", do: async (T) => { await T.click(T.rail("ONE GROWTH")); await T.wait(1200); } },
      { say: "Pulse Ads writes your ads and runs them on your own Meta and Google accounts. You approve and publish, and you pay the ad spend at cost.", do: async (T) => { await T.click(T.rail("Pulse Ads")); } },
      { say: "Farm areas gives each area you choose its own page, its ads and a monthly market note.", do: async (T) => { await toProduct(T, "ONE GROWTH"); await T.click(T.rail("Farm areas")); } },
      { say: "Speed to lead: Pulse answers a new lead in seconds, in the mode you pick. Off, Ask me, or Autopilot.", do: async (T) => { await toProduct(T, "ONE GROWTH"); await T.click(T.rail("Speed to lead")); } },
      { say: "Seller signals shows people who may sell soon, with the reasons, for you only.", do: async (T) => { await toProduct(T, "ONE GROWTH"); await T.click(T.rail("Seller signals")); } },
      { say: "The lead inbox turns your Zillow, Realtor dot com and Homes dot com lead emails into contacts.", do: async (T) => { await toProduct(T, "ONE GROWTH"); await T.click(T.rail("Lead inbox")); } },
      { say: "Results shows your spend, leads, appointments and closings by source. And team leads approve their agents' ad requests here.", do: async (T) => { await toProduct(T, "ONE GROWTH"); await T.click(T.rail("Results")); await T.wait(1500); await toProduct(T, "ONE GROWTH"); await T.click(T.rail("Ad requests")); } },
      { say: "Every lead from your ads lands in ONE MOVE, under Opportunities, and pulses red until you reach them.", do: async (T) => { await T.home(); } },
    ],
  },
  {
    title: "Morning Pulse",
    moments: [
      { say: "Each morning Pulse greets you on the right: the three things that matter most today, and your whole day below.", do: async (T) => { await T.home(); await T.hover(".drawer h2, .drawer h1"); } },
      { say: "Press Play Morning Pulse and Pulse walks you through your morning. Since yesterday, two new leads came in, Rosa and Ken, and Pulse takes you straight to them.", do: async (T) => { await T.click(T.p.getByRole("button", { name: /Play Morning Pulse/ })); await T.wait(1500); await T.click('[aria-label="Pause Morning Pulse"]'); } },
      { say: "A deal deadline is coming up too, for Ken. Each part takes you to the right place in your Brain.", do: async (T) => { await T.click('[aria-label="Skip to the next part"]'); await T.wait(2500); } },
      { say: "Then what matters today: the three most important things, and why.", do: async (T) => { await T.click('[aria-label="Skip to the next part"]'); await T.wait(2500); } },
      { say: "Pause, skip, or turn the voice off any time. Close it and you're back on your map.", do: async (T) => { await T.hover('[aria-label="Skip to the next part"]'); await T.wait(1200); await T.click('[aria-label="Close Morning Pulse"]'); await T.home(); } },
      { say: "The gold pill at the top always tells you what to do right now, and until when.", do: async (T) => { await T.hover(".next-pill"); } },
      { say: "Click the gold ONE in the middle to meet Pulse: what it is doing for you now, and what is coming next.", do: async (T) => { await T.click('[aria-label^="ONE, Your business"]').catch(() => {}); await T.wait(2500); } },
      { say: "Close it, and you are back on your map.", do: async (T) => { await closeAny(T); await T.home(); } },
    ],
  },
  {
    title: "Your day",
    moments: [
      { say: "Pulse plans your day round your calendar. Open ONE YOU, then Plan my day.", do: async (T) => { await T.click(T.rail("ONE YOU")); await T.click(T.rail("Plan my day")); } },
      { say: "This is the Day Clock: today round a clock. Every colour is a kind of work. Calls gold, texts pink, face to face green, appointments blue.", do: async (T) => { await T.click(T.inside("Plan my day")); await T.wait(2000); } },
      { say: "On the right, every block has a time and a reason, fitted round your two appointments.", do: async (T) => { await T.scrollPlan(380); } },
      { say: "Your VIP touches are in it every day: the calls in your Power Hour, and one sitting for your texts, video texts and social touches.", do: async (T) => { await T.scrollPlan(420); await T.hover(T.text("Texts, video texts and social touches")); } },
      { say: "Look it over and tap Looks good. Your plan is set, and it goes to ONE GO on your phone.", do: async (T) => { await T.scrollPlan(-2000); await T.click(T.p.getByRole("button", { name: /^Looks good$/ })); await T.wait(1500); await closeOk(T); } },
      { say: "Through the day, tick each block done as you go. The Power Hour, done.", do: async (T) => { await T.click(T.p.getByRole("button", { name: /^Mark done/ }).first()); await T.wait(1500); } },
      { say: "And the next one, done. The count goes up, and the clock fills in.", do: async (T) => { await T.click(T.p.getByRole("button", { name: /^Mark done/ }).first()); await T.wait(1200); await closeOk(T); await T.hover(".dayclock, svg").catch(() => {}); } },
      { say: "Now say the morning runs away from you, and you miss a block.", do: async (T) => { await T.hover(T.text(/Rate the 2 visitors/)).catch(() => {}); await T.advance(100); } },
      { say: "Pulse moves it to the next open time by itself, and tells you, right here. Your fixed appointments never move.", do: async (T) => { await T.waitText(/^Moved /, 30000).catch(() => {}); await T.hover(T.text(/^Moved /)).catch(() => {}); } },
      { say: "Your calls happen in the Power Hour. Here it is, from ONE YOU.", do: async (T) => { await T.click('[aria-label="Back to the Brain"]').catch(() => {}); await toProduct(T, "ONE YOU"); await T.click(T.rail("Power Hour")); } },
      { say: "Your best calls are lined up, most urgent first, each with why now: a birthday tomorrow, a thank you for a referral, a ninety day call.", do: async (T) => { await T.click(T.inside("Start a Power Hour")); await T.wait(1500); } },
      { say: "Pick how long, and start. The countdown runs while you call.", do: async (T) => { await T.click(T.p.getByRole("button", { name: /^60 min$/ })); await T.click(T.p.getByRole("button", { name: /^Start Power Hour$/i })); await T.wait(1500); } },
      { say: "Jen first. You talked, so tap Talked. The call is logged in ONE MOVE, and Amy is next.", do: async (T) => { await T.click(T.p.getByRole("button", { name: /^Talked$/i })); await T.wait(1200); await closeOk(T); } },
      { say: "Amy didn't pick up. Left a message, and on to Nina. You make every call; Pulse never dials or sends anything for you.", do: async (T) => { await T.click(T.p.getByRole("button", { name: /^Left a message$/i })); await T.wait(1200); await closeOk(T); } },
    ],
  },
  {
    title: "ONE YOU",
    intro: "Chapter six. ONE YOU: your own place to plan your week and see how you're doing.",
    moments: [
      { say: "ONE YOU's tools sit round it, and down the left. Each one shows you its own state before you open it.", do: async (T) => { await backToBrain(T); await toProduct(T, "ONE YOU"); } },
      { say: "Getting started walks a new agent through the first days, one step at a time. Each step ticks itself when ONE sees it done.", do: async (T) => { await T.click(T.rail("Getting started")); await T.wait(800); await T.scrollDrawer(420); } },
      { say: "This week holds your commitments: up to five set on Monday and checked in on Friday, your daily ones, and your weekend ones.", do: async (T) => { await openTool(T, "ONE YOU", "This week"); await openWeek(T); } },
      { say: "Each one is marked Kept, Partly or Missed when you check in. Only you and your coach see them, and your keep rate sits beside your weekly score.", do: async (T) => { await T.scrollPlan(380); } },
      { say: "Weekly Review puts your week in one place: your score, your VIP touches, who you haven't reached, your commitments and your goals.", do: async (T) => { await backToBrain(T); await openTool(T, "ONE YOU", "Weekly Review"); await openFull(T, "Open Weekly Review"); } },
      { say: "Pulse reads your last eight weeks, then gives you three things for the rest of this week. Make any of them a commitment with one tap.", do: async (T) => { await T.scrollPlan(900); await T.click(T.p.getByRole("button", { name: /^Make it a commitment$/ }).first()); await T.wait(1000); await closeOk(T); } },
      { say: "Today's VIP touches is your score for today, fourteen of twenty six points, and the people who matter most this week.", do: async (T) => { await backToBrain(T); await openTool(T, "ONE YOU", "Today's VIP touches"); await T.wait(800); await T.scrollDrawer(380); } },
      { say: "Referrals shows who sent you business, who to thank, and who is likely to refer next.", do: async (T) => { await openTool(T, "ONE YOU", "Referrals"); await openFull(T, "Open the Referral Scoreboard"); } },
      { say: "David sent you a referral and you thanked him in person. Log the thank-you. Ann hasn't heard from you in fifty eight days: add a task to ask her. ONE sends nothing.", do: async (T) => { await T.click('[aria-label="Log a thank-you to David"]'); await T.wait(1000); await closeOk(T); await T.click('[aria-label="Add ask task for Ann"]'); await T.wait(1000); await closeOk(T); } },
      { say: "Habits are your morning habits as one ring. Tick Exercise here, and it ticks on your Daily Tracker too.", do: async (T) => { await backToBrain(T); await openTool(T, "ONE YOU", "Habits"); await openFull(T, "Open your Habits"); await T.click('[aria-label="Exercise done today"]'); await T.wait(1000); await closeOk(T); } },
      { say: "Scoreboard shows this week's missions, the leaderboard, and your accountability partners. It resets every Monday.", do: async (T) => { await backToBrain(T); await openTool(T, "ONE YOU", "Scoreboard"); await T.wait(800); await T.scrollDrawer(450); } },
      { say: "Goals runs your own goal year: what you've closed so far against each goal, and whether you're ahead or behind pace.", do: async (T) => { await openTool(T, "ONE YOU", "Goals"); await openFull(T, "Open Goals"); } },
      { say: "Below it, the next three months, with the people likely to close in each one, and what to do each week to close the gap.", do: async (T) => { await T.scrollPlan(800); await T.wait(800); await T.scrollPlan(700); } },
      { say: "reZEN brings in your revenue share and your network, only what you choose to let through in My Profile.", do: async (T) => { await backToBrain(T); await openTool(T, "ONE YOU", "reZEN"); } },
      { say: "Coaching shows the agents you coach: who set their week, who checked in, how many they keep. The ones who need a word from you come first.", do: async (T) => { await openTool(T, "ONE YOU", "Coaching"); await openFull(T, "Open coaching"); } },
      { say: "The 90-Day Challenge scores your day in five arenas, twenty points each: body, spirit, relationships, business and legacy.", do: async (T) => { await backToBrain(T); await openTool(T, "ONE YOU", "90-Day Challenge"); await T.wait(800); await T.scrollDrawer(400); } },
      { say: "And once a month, Ask AI about you checks whether ChatGPT, Perplexity and Google name you when clients ask for an agent.", do: async (T) => { await openTool(T, "ONE YOU", "Ask AI about you"); await openFull(T, "Open Ask AI about you"); } },
    ],
  },
  {
    title: "ONE MOVE",
    intro: "Chapter seven. ONE MOVE: everyone you know, and everything you promised them.",
    moments: [
      { say: "Open ONE MOVE and its tools sit round it, with its menu down the left. People, Trackers, Events, Outreach and Learn each fold open.", do: async (T) => { await backToBrain(T); await toProduct(T, "ONE MOVE"); } },
      { say: "Follow-ups come first: every promise you made, overdue, due today, and the next seven days.", do: async (T) => { await movePage(T, "Follow-ups"); } },
      { say: "Call Rosa back, then log the touch. The task closes itself.", do: async (T) => { await T.click(T.p.getByRole("button", { name: /log the touch/i }).first()); await T.wait(1200); await closeOk(T); } },
      { say: "People holds everyone you know. Contacts gathers them in groups round you.", do: async (T) => { await movePage(T, "Contacts"); } },
      { say: "Click a group and its people gather round. Click a person and their whole story opens: family, favourites, your history, and what Pulse suggests saying.", do: async (T) => { const g = T.p.locator('.vr-svg [aria-label*=" people"]').first(); if (await g.count()) await T.click(g); await T.wait(1800); const pp = T.p.locator('.vr-svg [aria-label]').filter({ hasNotText: "" }).nth(1); const person = T.p.locator('.vr-svg g[aria-label]:not([aria-label*="people"]):not([aria-label*="back to"])').first(); if (await person.count()) await T.click(person); await T.wait(1800); } },
      { say: "VIP Management shows your VIP-50 in the inner ring and your VIP-100 round it. Each face's ring is its touches this month.", do: async (T) => { await movePage(T, "VIP Management"); } },
      { say: "Move someone up from the VIP one hundred in one tap, or swap them for someone in the VIP-50. Nobody is lost: they move to the outer ring.", do: async (T) => { const m = T.p.locator('[aria-label^="Move "][aria-label$="to your VIP-50"]').first(); if (await m.count()) { await T.click(m); await T.wait(1000); } const y = T.p.getByRole("button", { name: /^Yes, move them$/ }).first(); if (await y.count()) await T.click(y); await T.wait(1500); await closeOk(T); } },
      { say: "Every VIP gets a call, a video text, a social touch, the newsletter and a mixer invite each month, and face to face, a note and a drop-by each quarter. The Touch Audit shows who is missing what.", do: async (T) => { await movePage(T, "Touch Audit"); } },
      { say: "See it as a ring or as a grid of every VIP and every touch.", do: async (T) => { const g = T.p.getByRole("button", { name: /^Grid$/ }).first(); if (await g.count()) await T.click(g); await T.wait(1500); } },
      { say: "Hot, Warm and Cold sorts every piece of business coming: Hot within three months, Warm three to twelve, Cold beyond. Each pulses until you've worked it today.", do: async (T) => { await movePage(T, "Hot/Warm/Cold"); } },
      { say: "Opportunities gathers everything new that could become business. New to Sort holds new people waiting for a group.", do: async (T) => { await movePage(T, "Opportunities", null); await T.wait(600); const n = T.inside("New to Sort"); if (await n.count()) await T.click(n); await T.wait(1200); } },
      { say: "Looks Hot puts people Pulse thinks are ready in front of you, including people you know who came back to your website. Move them to Hot, or Not yet.", do: async (T) => { await movePage(T, "Looks Hot"); const h = T.p.getByRole("button", { name: /^Move to Hot$/ }).first(); if (await h.count()) await T.click(h); await T.wait(1200); await closeOk(T); } },
      { say: "New leads from your website, portals, ads and open houses stay red until you've reached each one.", do: async (T) => { await movePage(T, "New leads"); } },
      { say: "Likely to move finds past clients who may be ready to buy or sell again, with the reasons.", do: async (T) => { await movePage(T, "Likely to move"); } },
      { say: "Life events catches the big moments, a birthday, a new baby, a new job, with the touch Pulse suggests.", do: async (T) => { await movePage(T, "Life Events"); } },
      { say: "Deals tracks every deal under contract and every REPC deadline, with the days left. Upload the signed REPC and Pulse fills in the dates for you to check.", do: async (T) => { await movePage(T, "Deals"); } },
      { say: "The Business Rolodex holds the businesses you recommend. Share one with every VIP-50 agent if you like; your notes stay yours.", do: async (T) => { await movePage(T, "Business Rolodex"); } },
      { say: "Your trackers live here too. Tick a box on the Daily Tracker and the points add up toward your weekly hundred.", do: async (T) => { await movePage(T, "Daily Tracker"); const box = T.p.locator('[aria-label$="points"], [aria-label$="point"]').first(); if (await box.count()) await T.click(box); await T.wait(1200); } },
      { say: "Outreach holds your newsletter, market reports, action plans and landing pages, each with what it is doing now.", do: async (T) => { await backToBrain(T); await toProduct(T, "ONE MOVE"); await T.click(T.inside("Outreach")); await T.wait(1500); } },
      { say: "An action plan's texts and emails never go out on their own. They wait as ready tasks until you switch them on.", do: async (T) => { const a = T.p.locator('[aria-label="Action Plans now"]').first(); if (await a.count()) await T.click(a); await T.wait(1500); } },
      { say: "And Learn holds the video library, VIP docs and The Vault, searchable in one box.", do: async (T) => { await backToBrain(T); await toProduct(T, "ONE MOVE"); await T.click(T.inside("Learn")); await T.wait(1500); } },
    ],
  },
  {
    title: "Marquee",
    intro: "Chapter seven. Marquee: every listing's marketing, from the first presentation to the weekly seller report.",
    moments: [
      { say: "Open Marquee and your listings appear as homes: what needs you this week, and each listing's campaign.", do: async (T) => { await T.home(); await T.click(T.rail("MARQUEE")); } },
      { say: "This listing has five posts waiting for your approval. Nothing goes out until you approve it and press publish.", do: async (T) => { await openItem(T, "MARQUEE", "1482 Maple Ridge Dr"); } },
      { say: "Start a new listing, see your seller reports due, and where posting stands with Instagram and Facebook.", do: async (T) => { await openItem(T, "MARQUEE", "Start a new listing"); } },
    ],
  },
  {
    title: "Showly",
    intro: "Chapter eight. Showly: buyer tours, with your clients answering yes, maybe or no on every home.",
    moments: [
      { say: "Your tours are here, with what came back since you sent them.", do: async (T) => { await T.home(); await T.click(T.rail("SHOWLY")); } },
      { say: "The Millers answered on four homes. Each answer shows which homes to see again.", do: async (T) => { await openItem(T, "SHOWLY", "The Millers"); } },
      { say: "Pre-approval letters and your lender sit here too, with sharing switched on.", do: async (T) => { await openItem(T, "SHOWLY", "Pre-approval letters"); } },
    ],
  },
  {
    title: "ONE Open",
    intro: "Chapter nine. ONE Open: the open house, from the plan to the last follow-up.",
    moments: [
      { say: "Every open house runs in four phases: Plan, Prepare, Host and Follow Up.", do: async (T) => { await T.home(); await T.click(T.rail("ONE OPEN")); } },
      { say: "Prepare shows the tasks left before Sunday.", do: async (T) => { await openItem(T, "ONE OPEN", "Prepare"); } },
      { say: "After the open house, every visitor goes to ONE MOVE, tagged with where they came from. Pulse suggests the follow-up; you choose.", do: async (T) => { await openItem(T, "ONE OPEN", "Follow Up"); } },
      { say: "And your scorecard keeps your streak.", do: async (T) => { await openItem(T, "ONE OPEN", "Scorecard"); } },
    ],
  },
  {
    title: "Ask Pulse",
    moments: [
      { say: "The bar at the top is Ask Pulse. Ask anything about your business, in your own words.", do: async (T) => { await T.home(); await T.type(".ask-field input, .ask-field textarea", "Who haven't I called in 60 days?"); } },
      { say: "Pulse looks through your real records and answers, and the people come up as orbs, with a call button for each.", do: async (T) => { await T.p.keyboard.press("Enter"); await T.wait(4000); } },
      { say: "Ask about your pipeline, your birthdays this month, your open house visitors, or how your week is going." },
      { say: "Clear it, and you're back on your map.", do: async (T) => { const c = T.p.locator('[aria-label^="Clear the question"]'); if (await c.count()) await T.click(c); await T.home(); } },
    ],
  },
  {
    title: "The timeline",
    moments: [
      { say: "Along the bottom is the timeline. Slide it left to look back.", do: async (T) => { const s = T.p.locator('input[aria-label="Timeline"]'); await T.hover(s); await s.focus(); for (let i = 0; i < 21; i++) { await T.p.keyboard.press("ArrowLeft"); await T.wait(80); } } },
      { say: "You see what really happened, week by week: touches you logged, closings, new people and referrals." },
      { say: "Slide right to look ahead: birthdays, anniversaries, open houses and follow-ups coming due.", do: async (T) => { const s = T.p.locator('input[aria-label="Timeline"]'); await s.focus(); for (let i = 0; i < 42; i++) { await T.p.keyboard.press("ArrowRight"); await T.wait(60); } } },
      { say: "Tap Today and you're back to now.", do: async (T) => { await T.click('[aria-label="Back to today"]'); } },
    ],
  },
  {
    title: "Watch Pulse work",
    moments: [
      { say: "Watch Pulse work plays your own day as a short film: what Pulse lined up, and why.", do: async (T) => { const w = T.p.locator("button, a", { hasText: "Watch" }).first(); if (await w.count()) await T.hover(w); } },
    ],
  },
  {
    title: "Team",
    intro: "Chapter thirteen. Team: for team leads, everything to run your team from one place.",
    moments: [
      { say: "Your team sits inside ONE YOU, with this week's standings.", do: async (T) => { await openTool(T, "ONE YOU", "Team"); } },
      { say: "The war room shows the team's leads as they come in: who has each one, and how fast they were reached.", do: async (T) => { await openTool(T, "ONE YOU", "War room"); } },
      { say: "Coaching shows the agents you coach: who set their week, who checked in, and what's left to set up.", do: async (T) => { await openTool(T, "ONE YOU", "Coaching"); await openFull(T, "Open coaching"); } },
      { say: "From the team screen, add a member and everything turns on for them at once: their seat, their products, their site and their team page.", do: async (T) => { await closeAny(T); await openTool(T, "ONE YOU", "Team"); const o = T.p.locator("button", { hasText: /Open (the )?team/i }); if (await o.count()) await T.click(o); await T.wait(2000); } },
      { say: "Share one invite link for several people joining at once, add a seat when you need one, and remove or put back a member.", do: async (T) => { await T.scrollDrawer(700); } },
    ],
  },
  {
    title: "My Profile",
    moments: [
      { say: "Your photo, top right, opens My Profile: one profile for the whole system.", do: async (T) => { await closeAny(T); await T.home(); await T.click(".me-menu"); await T.click(T.menu("My Profile")); await T.wait(2500); } },
      { say: "Your details sit in two columns, used by every product, so you only type them once." },
      { say: "Connections links Google for your contacts' photos and your calendar, and reZEN for your revenue share.", do: async (T) => { const t = T.p.locator("button", { hasText: "Connections" }); if (await t.count()) await T.click(t); } },
      { say: "Badges shows every badge, earned and still to earn.", do: async (T) => { const t = T.p.locator("button", { hasText: "Badges" }); if (await t.count()) await T.click(t); } },
      { say: "In Pulse, you choose how each Pulse worker runs: Off, Ask me, where Pulse drafts and you tap send, or Autopilot. Every one starts Off.", do: async (T) => { const t = T.p.locator("button", { hasText: "Pulse" }).last(); if (await t.count()) await T.click(t); } },
      { say: "And Settings holds your notifications and your plan and billing.", do: async (T) => { const t = T.p.locator("button", { hasText: "Settings" }); if (await t.count()) await T.click(t); } },
    ],
  },
  {
    title: "The menu",
    moments: [
      { say: "Next to your photo is your menu.", do: async (T) => { await closeAny(T); await T.home(); await T.click(".me-menu"); await T.wait(1500); } },
      { say: "My website opens your site and its builder. Growth results shows the leads, appointments and closings from your ads.", do: async (T) => { await T.hover(T.menu("My website")); } },
      { say: "Team leads see the team website and the ad requests from their agents.", do: async (T) => { await T.hover(T.menu("Ad requests")); } },
      { say: "My plan and billing, the help key, and Classic view for ONE MOVE's older screens.", do: async (T) => { await T.hover(T.menu("My plan and billing")); } },
    ],
  },
  {
    title: "Follow the pulse",
    intro: "That's ONE.",
    moments: [
      { say: "Plan on the desktop, do on your phone, and let Pulse watch the rest.", do: async (T) => { await closeAny(T); await T.home(); } },
      { say: "Red, now. Yellow, today. Green, all good. Follow the pulse.", hold: 2500 },
    ],
  },
];
