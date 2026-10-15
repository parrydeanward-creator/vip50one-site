// Film A: the full tour of ONE on the desktop (Parry, 15 Oct; outline vip50-ecosystem research/films/full-tour-outlines.md,
// approved "build them"). One spoken line a moment, in "you" form, naming only what is on screen. The example agent is
// Sarah Bennett; every person and address is invented. Recorded by scripts/record-tour.mjs.

const BASE = process.env.BASE || "http://localhost:3102";
const TOUR = `${BASE}/dashboard?demo=1&walk=1&slow=${process.env.SLOW || 3}`;

// Open a tool inside an orb: centre on ONE, open the orb from the rail, then the tool from its panel.
const openTool = async (T, orb, tool) => {
  await T.home();
  await T.click(T.rail(orb));
  await T.click(T.inside(tool));
};
// The tool's own full screen, from the "Open …" button in its panel.
const openFull = async (T, label) => {
  await T.click(T.inside(label));
  await T.wait(1500);
};
const closeAny = async (T) => {
  const x = T.p.locator('[aria-label="Close"], .pi-close, button:has-text("Back to the map"), button:has-text("← Back")').first();
  if (await x.count()) await T.click(x).catch(() => {});
  await T.p.keyboard.press("Escape").catch(() => {});
  await T.wait(600);
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
      { say: "Round it sit your five products: ONE YOU, ONE MOVE, Marquee, Showly and ONE Open.", do: async (T) => { await T.hover('[aria-label^="ONE YOU"]'); } },
      { say: "Every orb tells you how it's doing. Pulsing red means something needs you right now. Yellow means today. A still green ring means all good." },
      { say: "The number on an orb is how many things inside it need you. Follow the pulse and it leads you straight to the person." },
      { say: "Click any orb and it comes to the middle, with its panel open on the right.", do: async (T) => { await T.click(T.rail("ONE MOVE")); } },
      { say: "The back arrow takes you back to the whole map.", do: async (T) => { await T.back(); } },
      { say: "Zoom in and out here, and the circle brings you back to ONE.", do: async (T) => { await T.click('[aria-label="Zoom in"]'); await T.click('[aria-label="Zoom out"]'); await T.home(); } },
      { say: "And the gold question mark opens the key to every light and colour, any time you need it.", do: async (T) => { await T.click('[aria-label="What everything means"]'); await T.wait(2500); } },
      { say: "Every colour and ring is written out here, with a two minute film below if you want it.", do: async (T) => { await T.wait(2000); await closeAny(T); } },
    ],
  },
  {
    title: "Morning Pulse",
    moments: [
      { say: "Each morning Pulse writes you a short note: the three things that matter most today.", do: async (T) => { await T.home(); } },
      { say: "Tap Listen and Pulse reads it to you, so you can hear your day while you get ready.", do: async (T) => { await T.hover(T.inside("Listen")); } },
      { say: "The gold pill at the top always tells you what to do right now, and when your day starts.", do: async (T) => { await T.hover(".next-pill"); } },
      { say: "Click the gold ONE in the middle to meet Pulse: what it is doing for you now, and what is coming next.", do: async (T) => { await T.click('[aria-label^="ONE, Your business"]').catch(() => {}); await T.wait(2500); } },
      { say: "Close it, and you are back on your map.", do: async (T) => { await closeAny(T); await T.home(); } },
    ],
  },
  {
    title: "Your day",
    moments: [
      { say: "Pulse plans your day round your calendar. Here is Plan my day.", do: async (T) => { await T.click(T.inside("Plan my day")); await T.wait(2000); } },
      { say: "Every block has a time and a reason: your calls, your VIP touches, your follow-ups, fitted round your appointments.", do: async (T) => { await T.scrollDrawer(500); } },
      { say: "Look it over and tap Looks good. Your plan is set, and it goes to ONE GO on your phone.", do: async (T) => { const b = T.p.locator("button", { hasText: "Looks good" }); if (await b.count()) await T.click(b); } },
      { say: "Through the day, tick Done as you go. Anything you miss moves to the next open time by itself, and your fixed appointments never move.", do: async (T) => { const d = T.p.locator("button", { hasText: "Done" }); if (await d.count()) await T.click(d); } },
      { say: "The Day Clock shows the same day round a clock. Every colour is a kind of work: calls gold, texts pink, face to face green.", do: async (T) => { await closeAny(T); await openTool(T, "ONE YOU", "Today"); } },
      { say: "And Power Hour lines up your best calls with call prep for each one, a countdown, and what got done at the end.", do: async (T) => { await openTool(T, "ONE YOU", "Power Hour"); await openFull(T, "Start a Power Hour"); } },
      { say: "Each call shows who it is, why now, and what to say. Pulse prepares it; you make the call.", do: async (T) => { await T.wait(2500); await closeAny(T); } },
    ],
  },
  {
    title: "ONE YOU",
    intro: "Chapter five. ONE YOU: your own place to plan your week and review how you're doing.",
    moments: [
      { say: "ONE YOU holds your scores at a glance: today's points, your weekly score toward 100, your streak and where you are on the leaderboard.", do: async (T) => { await T.home(); await T.click(T.rail("ONE YOU")); } },
      { say: "This week holds your commitments. Set up to five each Monday, check in on Friday, and add weekend and daily commitments too.", do: async (T) => { await T.click(T.inside("This week")); } },
      { say: "Your keep rate sits beside your weekly score. Only you and your coach see it.", do: async (T) => { await T.wait(1500); } },
      { say: "Weekly Review puts your week in one place: your score, your VIP touches, who you haven't reached, and three things for next week.", do: async (T) => { await openTool(T, "ONE YOU", "Weekly Review"); await openFull(T, "Open Weekly Review"); } },
      { say: "Goals keeps your closings, referrals and income goals for your own goal year, counted from your start date.", do: async (T) => { await closeAny(T); await openTool(T, "ONE YOU", "Goals"); } },
      { say: "The Income Map works your income goal back to the week: closings to go, conversations and VIP touches each week to stay on pace.", do: async (T) => { await openTool(T, "ONE YOU", "Income Map"); await openFull(T, "Open the Income Map"); } },
      { say: "The Daily Tracker and Weekly Tracker count your points. A hundred a week is the standard.", do: async (T) => { await closeAny(T); await openTool(T, "ONE YOU", "Scoreboard"); } },
      { say: "Badges are earned, never given. Hit the number in a week and the badge unlocks within minutes.", do: async (T) => { await T.wait(1500); } },
      { say: "Habits are your morning habits as one ring. Tick them here and they tick on your Daily Tracker.", do: async (T) => { await openTool(T, "ONE YOU", "Habits"); await openFull(T, "Open your Habits"); } },
      { say: "Energy asks how you're feeling, so Pulse can plan a lighter day when you need one.", do: async (T) => { await closeAny(T); await openTool(T, "ONE YOU", "Energy"); } },
      { say: "Time off: tell Pulse when you're away, and it shows who covers what while you're gone.", do: async (T) => { await openTool(T, "ONE YOU", "Time off"); } },
      { say: "Wins keeps the good things that happened, so you can see them on a hard day.", do: async (T) => { await openTool(T, "ONE YOU", "Wins"); } },
      { say: "Referrals is your scoreboard: who sent you business, who to thank, and who is likely to refer next.", do: async (T) => { await openTool(T, "ONE YOU", "Referrals"); await openFull(T, "Open the Referral Scoreboard"); } },
      { say: "Partners are the lenders and businesses you work with, and what they're waiting on.", do: async (T) => { await closeAny(T); await openTool(T, "ONE YOU", "Partners"); } },
      { say: "The income forecast shows what's likely to close in the next three months.", do: async (T) => { await openTool(T, "ONE YOU", "Income forecast"); } },
      { say: "Pulse Coach reads your week: what's rising, what's slipping, your best day, and one focus for next week.", do: async (T) => { await openTool(T, "ONE YOU", "Pulse Coach"); await openFull(T, "Open Pulse Coach"); } },
      { say: "The 90-Day Challenge tracks your day and your level.", do: async (T) => { await closeAny(T); await openTool(T, "ONE YOU", "90-Day"); } },
      { say: "Onboarding shows what's left to set up, step by step.", do: async (T) => { await openTool(T, "ONE YOU", "Onboarding"); } },
      { say: "And reZEN brings in your revenue share and your network, only what you choose to let through.", do: async (T) => { await openTool(T, "ONE YOU", "reZEN"); } },
    ],
  },
  {
    title: "ONE MOVE",
    intro: "Chapter six. ONE MOVE: everyone you know, and everything you promised them.",
    moments: [
      { say: "Open ONE MOVE and its menu runs down the left, just like the classic screens. Its live items sit on the right.", do: async (T) => { await T.home(); await T.click(T.rail("ONE MOVE")); } },
      { say: "Follow-ups are first: who is overdue and who is due today.", do: async (T) => { await T.click(T.inside("Follow-ups")); } },
      { say: "Contacts holds everyone, in groups. Click a group and the people in it gather round.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.rail("Contacts")); await T.wait(2500); } },
      { say: "Click a person and their whole story opens: family, favourites, your history together, and what Pulse suggests saying.", do: async (T) => { const t = T.text("Tom Miller"); if (await t.count()) await T.click(t); await T.wait(2000); } },
      { say: "Say or type what happened, and Pulse turns it into the right notes and tasks. You keep what's right.", do: async (T) => { await T.scrollDrawer(600); } },
      { say: "VIP Management shows your VIP-50 and VIP-100 in rings round you. Each face's ring is their touches this month, and a red glow means overdue.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.rail("VIP Management")); await T.wait(2500); } },
      { say: "Every VIP gets a call, a video text, a social touch, the newsletter and a mixer invite each month, and three face to face touches each quarter.", do: async (T) => { await T.wait(1500); } },
      { say: "The Touch Audit shows how fully your VIPs are touched this month, and who is missing what.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.rail("Touch Audit")); await T.wait(2500); } },
      { say: "Hot, Warm and Cold sorts every piece of business coming: Hot within three months, Warm three to twelve, Cold beyond. Each pulses until you've worked it today.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.rail("Hot/Warm/Cold")); await T.wait(2500); } },
      { say: "New to sort holds new people waiting for a group, and Looks Hot asks you to decide on people Pulse thinks are ready.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.inside("Looks Hot")); } },
      { say: "Hot on your website shows people you know who came back to your site, looked hard at a home, or asked what theirs is worth.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.inside("Hot on your website")); } },
      { say: "New leads today pulse red until each one is reached.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.inside("New leads today")); } },
      { say: "Likely to move finds past clients who may be ready to buy or sell again.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.inside("Likely to move")); } },
      { say: "Life events catches the big moments, a new baby or a new job, so you can reach out at the right time.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.inside("Life events")); } },
      { say: "Deals tracks what's under contract and the dates that matter.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.inside("Deals")); } },
      { say: "Market Pulse drafts a market report for each of your VIPs. You check it and send it.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.inside("Market Pulse")); } },
      { say: "The Business Rolodex holds the businesses you recommend. Share one with every VIP-50 agent if you like; your notes always stay yours.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.rail("Business Rolodex")); await T.wait(2500); } },
      { say: "Your Trackers live here too: the Daily Tracker and the Weekly Tracker.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.rail("Trackers")); await T.click(T.rail("Daily Tracker")); await T.wait(2500); } },
      { say: "Tick a box and the points add up toward your weekly score.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.rail("Trackers")); await T.click(T.rail("Weekly Tracker")); await T.wait(2500); } },
      { say: "Events holds your calendar, your VIP events and the mixer. Outreach holds your newsletter, landing pages and action plans.", do: async (T) => { await T.click(T.rail("ONE MOVE")); await T.click(T.rail("Events")); await T.wait(800); await T.click(T.rail("Outreach")); } },
      { say: "An action plan's texts and emails never go out on their own. They wait as ready tasks until you switch them on.", do: async (T) => { await T.click(T.inside("Action Plans")).catch(() => {}); } },
      { say: "And Learn holds the video library, VIP docs and The Vault.", do: async (T) => { await T.click(T.rail("Learn")); } },
    ],
  },
  {
    title: "Marquee",
    intro: "Chapter seven. Marquee: every listing's marketing, from the first presentation to the weekly seller report.",
    moments: [
      { say: "Open Marquee and your listings appear as homes: what needs you this week, and each listing's campaign.", do: async (T) => { await T.home(); await T.click(T.rail("MARQUEE")); } },
      { say: "This listing has five posts waiting for your approval. Nothing goes out until you approve it and press publish.", do: async (T) => { await T.click(T.inside("1482 Maple Ridge Dr")); } },
      { say: "Start a new listing, see your seller reports due, and where posting stands with Instagram and Facebook.", do: async (T) => { await T.click(T.rail("MARQUEE")); await T.click(T.inside("Start a new listing")); } },
    ],
  },
  {
    title: "Showly",
    intro: "Chapter eight. Showly: buyer tours, with your clients answering yes, maybe or no on every home.",
    moments: [
      { say: "Your tours are here, with what came back since you sent them.", do: async (T) => { await T.home(); await T.click(T.rail("SHOWLY")); } },
      { say: "The Millers answered on four homes. Each answer shows which homes to see again.", do: async (T) => { await T.click(T.inside("The Millers")); } },
      { say: "Pre-approval letters and your lender sit here too, with sharing switched on.", do: async (T) => { await T.click(T.rail("SHOWLY")); await T.click(T.inside("Pre-approval letters")); } },
    ],
  },
  {
    title: "ONE Open",
    intro: "Chapter nine. ONE Open: the open house, from the plan to the last follow-up.",
    moments: [
      { say: "Every open house runs in four phases: Plan, Prepare, Host and Follow Up.", do: async (T) => { await T.home(); await T.click(T.rail("ONE OPEN")); } },
      { say: "Prepare shows the tasks left before Sunday.", do: async (T) => { await T.click(T.inside("Prepare")); } },
      { say: "After the open house, every visitor goes to ONE MOVE, tagged with where they came from. Pulse suggests the follow-up; you choose.", do: async (T) => { await T.click(T.rail("ONE OPEN")); await T.click(T.inside("Follow Up")); } },
      { say: "And your scorecard keeps your streak.", do: async (T) => { await T.click(T.rail("ONE OPEN")); await T.click(T.inside("Scorecard")); } },
    ],
  },
  {
    title: "Ask Pulse",
    moments: [
      { say: "The bar at the top is Ask Pulse. Ask anything about your business, in your own words.", do: async (T) => { await T.home(); await T.type(".ask-field input, .ask-field textarea", "Who haven't I called in 60 days?"); } },
      { say: "Pulse looks through your real records and answers, and the people come up as orbs, with a call button for each.", do: async (T) => { await T.p.keyboard.press("Enter"); await T.wait(4000); } },
      { say: "Ask about your pipeline, your birthdays this month, your open house visitors, or how your week is going.", do: async (T) => { await T.wait(2500); } },
      { say: "Clear it, and you're back on your map.", do: async (T) => { const c = T.p.locator('[aria-label^="Clear the question"]'); if (await c.count()) await T.click(c); await T.home(); } },
    ],
  },
  {
    title: "The timeline",
    moments: [
      { say: "Along the bottom is the timeline. Slide it left to look back.", do: async (T) => { const s = T.p.locator('input[aria-label="Timeline"]'); await T.hover(s); await s.focus(); for (let i = 0; i < 21; i++) { await T.p.keyboard.press("ArrowLeft"); await T.wait(80); } } },
      { say: "You see what really happened, week by week: touches you logged, closings, new people and referrals.", do: async (T) => { await T.wait(2500); } },
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
      { say: "Your photo, top right, opens My Profile: one profile for the whole system.", do: async (T) => { await closeAny(T); await T.home(); await T.click(".me-btn"); await T.wait(2500); } },
      { say: "Your details sit in two columns, used by every product, so you only type them once.", do: async (T) => { await T.wait(1500); } },
      { say: "Connections links Google for your contacts' photos and your calendar, and reZEN for your revenue share.", do: async (T) => { const t = T.p.locator("button", { hasText: "Connections" }); if (await t.count()) await T.click(t); } },
      { say: "Badges shows every badge, earned and still to earn.", do: async (T) => { const t = T.p.locator("button", { hasText: "Badges" }); if (await t.count()) await T.click(t); } },
      { say: "In Pulse, you choose how each Pulse worker runs: Off, Ask me, where Pulse drafts and you tap send, or Autopilot. Every one starts Off.", do: async (T) => { const t = T.p.locator("button", { hasText: "Pulse" }).last(); if (await t.count()) await T.click(t); } },
      { say: "And Settings holds your notifications and your plan and billing.", do: async (T) => { const t = T.p.locator("button", { hasText: "Settings" }); if (await t.count()) await T.click(t); } },
    ],
  },
  {
    title: "The menu",
    moments: [
      { say: "Next to your photo is your menu.", do: async (T) => { await T.home(); await T.click(".me-menu"); await T.wait(1500); } },
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
