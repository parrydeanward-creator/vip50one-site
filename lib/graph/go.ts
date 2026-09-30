import type { GraphEdge, GraphNode, NodeStatus, NodeType, ProductKey, Recommendation, Stat } from "./types.ts";

// ONE GO in depth, modelled on the live phone app (VIP50-app, read 29 Sep):
// the areas, labels, point values and rules are the app's own; the numbers are
// a made-up agent's. Where the app has nothing (no closings goal, no reports),
// the Brain shows nothing.

type Add = (n: Omit<GraphNode, "importance"> & { importance?: number }) => void;
type Link = (source: string, target: string, rel: GraphEdge["relationshipType"], strength?: number) => void;

interface Spec {
  id: string;
  label: string;
  sub?: string;
  type?: NodeType;
  product?: ProductKey;
  status?: NodeStatus;
  summary?: string;
  stats?: Stat[];
  recs?: Recommendation[];
  kids?: Spec[];
}

function tree(add: Add, parentId: string, specs: Spec[]) {
  specs.forEach((s, i) => {
    add({
      id: s.id,
      type: s.type ?? (s.kids?.length ? "category" : "feature"),
      label: s.label,
      secondaryLabel: s.sub,
      parentId,
      product: s.product ?? "go",
      importance: 1 - i * 0.03,
      status: s.status,
      summary: s.summary,
      stats: s.stats,
      recommendations: s.recs,
    });
    if (s.kids) tree(add, s.id, s.kids);
  });
}

const done = (id: string, label: string, sub = "Done"): Spec => ({ id, label, sub, status: "healthy" });
const todo = (id: string, label: string, sub = "Not yet"): Spec => ({ id, label, sub });

export function addGo(add: Add, link: Link) {
  tree(add, "go", [
    {
      id: "go-today",
      label: "Today",
      sub: "14 of 25 points",
      status: "attention",
      summary: "You have 14 of today's 25 points and Today's Execution is at 52%: Building Momentum. Six VIP-50 tasks are left, and two people matter most this week.",
      stats: [
        { label: "Daily score", value: "14 / 25" },
        { label: "Execution", value: "52%" },
        { label: "VIP-50 tasks left", value: "6 of 11" },
        { label: "Streak", value: "12 days" },
      ],
      recs: [
        { title: "Call Jen Alvarez before her birthday tomorrow", targetId: "p-jen",
          why: ["Jen is on your VIP-50.", "Her birthday is tomorrow (Special Dates).", "Your last call was 34 days ago; the call cooldown is 30 days, so she is due.", "A call earns a daily point and credits Call #3."] },
        { title: "Face-to-face with Marcus Lee this week", targetId: "p-marcus",
          why: ["Face-to-Face This Week: 1 of 2 set up.", "Marcus is your most overdue in-person visit (no face-to-face in 90+ days).", "Set up adds a task and a calendar block."] },
      ],
      kids: [
        {
          id: "go-tasks-today",
          label: "VIP-50 Daily Tasks",
          sub: "6 left today",
          status: "attention",
          summary: "Generated each weekday from your VIPs: today 3 calls, 3 texts, 3 social touches and 2 notes. One non-social touch per person per day; unfinished tasks roll forward up to 2 days.",
          stats: [{ label: "Done", value: "5 of 11" }, { label: "Rolled over", value: "1" }],
          kids: [
            { id: "p-jen", type: "person", product: "move", label: "Call Jen Alvarez", sub: "Birthday tomorrow", status: "opportunity",
              summary: "VIP-50. Referred the Parkers last spring. Last call 34 days ago.",
              stats: [{ label: "Last touch", value: "19 days" }, { label: "Referrals", value: "1" }],
              recs: [{ title: "Call Jen today", why: ["Birthday tomorrow.", "Last call 34 days ago (cooldown 30).", "She has referred business before."] }],
              kids: [
                { id: "jen-family", label: "Family", sub: "Mike, Emma", product: "move", summary: "Spouse: Mike (birthday 3 Mar). Children: Emma. Pets: Biscuit (dog). Anniversary 14 May." },
                { id: "jen-about", label: "About Jen", sub: "Coffee: oat latte", product: "move", summary: "Hometown: Boise. Hobbies: trail running, pottery. Favourite restaurant: Tsunami. Dream vacation: Amalfi Coast. How can I serve you: introductions to good contractors." },
                { id: "jen-home", label: "Home", sub: "Bought 2019", product: "move", summary: "12788 Canyon Vista Dr, Draper. Purchased 2019, 4 bed, 3 bath, 2,860 sq ft." },
                { id: "jen-touches", label: "Value touches", sub: "6 of 10 this cycle", product: "move", status: "attention", summary: "Done: Call, Text, Personal Note, Newsletter, Market Report, Social Media. Missing: Email, Drop-by Gift, Mixer, Face to Face." },
                { id: "jen-notes", label: "Notes", sub: "3 notes", product: "move", summary: "Emma starts at Juan Diego this fall. Asked about refinancing in spring. Loved the pie drop-by last year." },
              ] },
            { id: "p-marcus", type: "person", product: "move", label: "Face-to-face: Marcus Lee", sub: "Most overdue visit", status: "action",
              summary: "Open house visitor, Saturday at 1482 Maple Ridge Dr. Buying in 3 to 6 months.",
              recs: [{ title: "Set up a coffee with Marcus", why: ["No face-to-face in 90+ days.", "Visited Saturday's open house.", "Said 3 to 6 months."] }] },
            { id: "p-millers", type: "person", product: "move", label: "Text the Millers", sub: "Loved 2 homes", status: "opportunity",
              summary: "Active buyers. Reacted to 4 homes from yesterday's Showly tour: two loves, one maybe, one no." },
            { id: "p-dave", type: "person", product: "move", label: "Send note to Dave Kim", sub: "Personal note", summary: "VIP-50. Last handwritten note 94 days ago (note cooldown 90 days)." },
            { id: "p-parkers", type: "person", product: "move", label: "Social touch: the Parkers", sub: "Comment on their post", status: "healthy", summary: "Past clients. Social touches have no cooldown." },
            { id: "p-amy", type: "person", product: "move", label: "Call Amy Chen", sub: "Rolled over from Monday", status: "attention", summary: "VIP-100. Rolled over once; drops off after 2 days." },
          ],
        },
        { id: "go-execution", label: "Today's Execution", sub: "52% · Building Momentum", status: "attention",
          summary: "14 of 27 tracker boxes checked. 40% or more is Building Momentum; 80% or more is Locked In." },
        { id: "go-f2f", label: "Face-to-Face This Week", sub: "1 of 2 set up", status: "attention",
          summary: "Your most overdue in-person visits. Set up adds a task and a calendar block, max 2 a week." },
        { id: "go-dates", label: "Special Dates", sub: "3 in the next 30 days",
          summary: "Jen Alvarez birthday tomorrow. The Parkers' anniversary in 9 days. Dave Kim's spouse Lisa, birthday in 22 days." },
        { id: "go-event", label: "Next Event", sub: "Fall Client Mixer · Oct 16",
          summary: "Upcoming Power Event. Why this matters: a mixer is a face-to-face touch for every VIP who comes. Plan a Client Event, Schedule a VIP Touch, or Set a Power Hour." },
        { id: "go-tip", label: "Today's Tip", sub: "11 VIPs need a drop-by",
          summary: "Eleven of your VIPs still need a drop-by gift. Two are within 5 miles of your 2:00 appointment." },
      ],
    },
    {
      id: "go-daily",
      label: "Daily Tracker",
      sub: "14 / 25 points",
      status: "attention",
      summary: "One point per box, two for Lunch / Face to Face, plus your custom activities.",
      stats: [{ label: "Points today", value: "14 / 25" }, { label: "30-day active", value: "87%" }],
      kids: [
        { id: "dt-habits", label: "Daily Habits", sub: "4 of 6", kids: [
          done("dt-bed", "Made Bed"), done("dt-affirm", "Affirmations"), done("dt-grat", "Gratitudes"),
          todo("dt-ex", "Exercise"), done("dt-macros", "Tracked Macros"), todo("dt-read", "Positive Reading"),
        ] },
        { id: "dt-contacts", label: "Contacts", sub: "2 of 3", kids: [done("dt-hot", "Hot Contact"), done("dt-warm", "Warm Contact"), todo("dt-cold", "Cold Contact")] },
        { id: "dt-calls", label: "Calls", sub: "2 of 5", status: "attention", kids: [
          done("dt-c1", "Call #1", "Amy Chen"), done("dt-c2", "Call #2", "Tom Reyes"), todo("dt-c3", "Call #3", "Jen Alvarez is due"), todo("dt-c4", "Call #4"), todo("dt-c5", "Call #5"),
        ] },
        { id: "dt-video", label: "Video Texts", sub: "3 of 5", kids: [done("dt-v1", "Video Text #1"), done("dt-v2", "Video Text #2"), done("dt-v3", "Video Text #3"), todo("dt-v4", "Video Text #4"), todo("dt-v5", "Video Text #5")] },
        { id: "dt-other", label: "Other Activities", sub: "3 of 6", kids: [
          done("dt-s1", "Social Post #1"), todo("dt-s2", "Social Post #2"), done("dt-med", "Meditation / Visualization"),
          todo("dt-f2f", "Lunch / Face to Face", "2 points"), done("dt-n1", "Handwritten Note #1"), todo("dt-n2", "Handwritten Note #2"),
        ] },
        { id: "dt-custom", label: "Custom Activities", sub: "Up to 3, your points", summary: "Three custom activities with the points you choose." },
        { id: "dt-history", label: "30-Day Progress", sub: "87% active", summary: "Great 18+, Good 14-17, OK 10-13, Needs Work under 10. 26 of the last 30 days active." },
      ],
    },
    {
      id: "go-weekly",
      label: "Weekly Bonus",
      sub: "95 of 150 minimum",
      status: "attention",
      summary: "Bonus points for the bigger plays. 150 meets the minimum standard. Weeks run Monday to Sunday.",
      stats: [{ label: "Weekly total", value: "95" }, { label: "Minimum standard", value: "150" }],
      kids: [
        { id: "wk-plays", label: "Bonus activities", sub: "45 points so far", kids: [
          done("wk-lead", "Lead Gen / CRM / Drip", "+5"), todo("wk-mixer", "Mixer Participation", "+5"), done("wk-listing", "Listing - Buyer Activity", "+5"),
          done("wk-ff1", "Lunch/Coffee F/F 1", "+5"), todo("wk-ff2", "Lunch/Coffee F/F 2", "+5"), done("wk-aa1", "Agent Attraction 1", "+10"),
          todo("wk-aa2", "Agent Attraction 2", "+10"), done("wk-oh", "Open Houses", "+10"), todo("wk-show", "Meet Client - Show Homes", "+5"), todo("wk-edu", "Education", "+5"),
        ] },
        { id: "wk-dropby", label: "Drop-Bys", sub: "2 of 4 · +25 at 4", status: "attention", kids: [done("wk-d1", "Drop-By 1", "+5"), done("wk-d2", "Drop-By 2", "+5"), todo("wk-d3", "Drop-By 3", "+5"), todo("wk-d4", "Drop-By 4", "+5")] },
        { id: "wk-custom", label: "Custom activities", sub: "40 points", summary: "Up to five custom activities with your own points." },
        { id: "wk-mindset", label: "Mindset", sub: "Morning win set", summary: "Morning Win Statement: \"Book two listing appointments.\" Evening Reflection: not yet." },
        { id: "wk-review", label: "Rate Your Week", sub: "Friday", summary: "Energy, Inner Peace, Partner/Spouse, Family, VIP50 Mission, Business, 1 to 10. One word for the week. Momentum Audit." },
      ],
    },
    {
      id: "go-score",
      label: "Scoreboard",
      sub: "#2 this week",
      status: "opportunity",
      summary: "Your points, XP, streak and where you stand on this week's leaderboard. It resets Monday.",
      stats: [
        { label: "Daily", value: "14" },
        { label: "Weekly", value: "95" },
        { label: "XP this week", value: "310" },
        { label: "Behind the Crown", value: "35 XP" },
      ],
      recs: [{ title: "Take the Crown this week", why: ["You are #2, 35 XP behind the Weekly Market Leader.", "Finishing all of today's VIP-50 tasks is +50 XP.", "Completing the Daily Tracker is +25 XP."] }],
      kids: [
        { id: "sc-leader", label: "Weekly Market Leader", sub: "You: #2", status: "opportunity", summary: "#1 Dana Ruiz, 345 XP. #2 you, 310 XP. #3 Kyle Moss, 260 XP. Last week's champion: Dana Ruiz." },
        { id: "sc-mission", label: "Mission Control", sub: "4 of 7 on track", kids: [
          { id: "mc-aa", label: "Agent Attraction", sub: "1 of 2 · +25 XP each" },
          { id: "mc-oh", label: "Set Up Open House", sub: "Done · +50 XP", status: "healthy" },
          { id: "mc-daily", label: "Complete Daily Tracker", sub: "3 of 5 days" },
          { id: "mc-touch", label: "VIP-50 Touches", sub: "17 of 25", status: "attention" },
          { id: "mc-tasks", label: "Scheduled Tasks", sub: "14 of 20" },
          { id: "mc-checkin", label: "App Check-In Streak", sub: "3 of 5 · +10 XP each" },
          { id: "mc-momentum", label: "Relationship Momentum", sub: "310 of 100 XP", status: "healthy" },
        ] },
        { id: "sc-badges", label: "Badges this week", sub: "3 earned", kids: [
          { id: "bd-titan", label: "Touch Titan", sub: "25 VIP-50 touches · 17 so far" },
          { id: "bd-crusher", label: "Task Crusher", sub: "20 tasks · 14 so far" },
          { id: "bd-king", label: "Consistency King", sub: "Earned", status: "healthy" },
          { id: "bd-spark", label: "Social Spark", sub: "Earned", status: "healthy" },
          { id: "bd-ninja", label: "Note Ninja", sub: "5 notes · 3 so far" },
          { id: "bd-builder", label: "Relationship Builder", sub: "4 visits · 2 so far" },
          { id: "bd-maker", label: "Momentum Maker", sub: "Earned", status: "healthy" },
          { id: "bd-mayor", label: "Market Mayor", sub: "#1 on the leaderboard" },
        ] },
        { id: "sc-streak", label: "Streak", sub: "12 days", status: "healthy", summary: "Twelve days in a row with the app open. +10 XP each check-in." },
        { id: "sc-xp", label: "XP", sub: "310 this week · 4,860 total", summary: "Daily Tracker +25, all VIP-50 tasks +50, check-in +10, weekly minimum +100, open house +50, agent attraction +25 each." },
      ],
    },
    {
      id: "go-contacts",
      label: "VIP Contacts",
      sub: "47 VIP-50 · 38 VIP-100",
      status: "attention",
      summary: "Your chosen VIPs, 85 of 150. Everyone else lives in ONE MOVE. Tags keep ONE GO and ONE MOVE in step.",
      stats: [{ label: "VIP-50", value: "47 / 50" }, { label: "VIP limit", value: "85 / 150" }],
      kids: [
        { id: "vc-50", label: "VIP-50", sub: "47 of 50", status: "attention", summary: "Three spots left. The build banner shows until you reach 50." },
        { id: "vc-100", label: "VIP-100", sub: "38", summary: "Your next circle." },
        { id: "vc-touches", label: "Value Touches", sub: "10 kinds", summary: "Call, Text, Email, Personal Note, Drop-by Gift, Mixer, Newsletter, Market Report, Social Media Engagement, Face to Face, plus your own." },
        { id: "vc-audit", label: "Touch Audit", sub: "12 VIPs missing touches", status: "attention", summary: "Contacts missing any of the nine standard touches, with a plain-English summary." },
        { id: "vc-memory", label: "Relationship memory", sub: "Family, home, favourites", summary: "Family (spouse, children, pets, anniversary), home, 'Tell us about you' (hometown, hobbies, favourite restaurant, coffee, dream vacation, how can I serve you), business, notes." },
        { id: "vc-import", label: "Import", sub: "CSV or phone contacts", summary: "Import CSV (template provided), export, or import from your phone." },
      ],
    },
    {
      id: "go-map",
      label: "Drop-By Map",
      sub: "11 still need a drop-by",
      status: "attention",
      summary: "Your VIPs on a map, closest first. Red needs a drop-by; gold is done. Birthdays within 14 days are marked.",
      stats: [{ label: "Need a drop-by", value: "11" }, { label: "Done", value: "36" }],
      kids: [
        { id: "map-near", label: "Within 5 miles", sub: "4 VIPs", summary: "Dave Kim, the Parkers, Rosa Diaz, Ben Holt." },
        { id: "map-bday", label: "Birthdays soon", sub: "Jen Alvarez", status: "opportunity", summary: "Jen Alvarez, birthday tomorrow, 2.1 miles away." },
        { id: "map-route", label: "Plan Route", sub: "Up to 8 stops", summary: "Pick stops, Optimize & Go, then Start Route in Google Maps." },
      ],
    },
    {
      id: "go-tasks",
      label: "Tasks",
      sub: "6 due today",
      status: "action",
      summary: "Due today and the next 7 days. Add a task with priority and repeat.",
      stats: [{ label: "Due today", value: "6" }, { label: "Next 7 days", value: "9" }],
      kids: [
        { id: "task-followups", type: "task", product: "move", label: "Overdue follow-ups", sub: "4 in ONE MOVE", status: "action" },
        { id: "task-approve", type: "task", product: "marquee", label: "Approve posts", sub: "Maple Ridge, 5 pieces", status: "attention" },
        { id: "task-rate", type: "task", product: "open", label: "Rate visitors", sub: "2 from Saturday", status: "attention" },
        { id: "task-aa", type: "task", label: "Agent attraction", sub: "Weekly, 1 of 2" },
        { id: "task-report", type: "task", product: "marquee", label: "Seller report", sub: "Due Friday" },
      ],
    },
    {
      id: "go-calendar",
      label: "Calendar",
      sub: "2 today",
      summary: "Day, week and month. Time blocks for calls, texts, drop-bys and meetings, synced to your phone's calendar.",
      kids: [
        { id: "cal-power", type: "appointment", label: "Power Hour", sub: "9:00am · calls" },
        { id: "cal-1", type: "appointment", label: "Listing appointment", sub: "Today 2:00pm" },
        { id: "cal-2", type: "appointment", label: "Coffee with Dave", sub: "Today 4:30pm" },
        { id: "cal-oh", type: "event", product: "open", label: "Open house", sub: "Sun 1-3pm" },
      ],
    },
    {
      id: "go-challenge",
      label: "90-Day Challenge",
      sub: "Day 23 · Gold",
      status: "healthy",
      summary: "Five arenas, 20 points each, 100 a day. Average 70+ is Gold, 90+ Platinum.",
      stats: [{ label: "Today", value: "65 / 100" }, { label: "Average", value: "74 · Gold" }, { label: "Days logged", value: "21 of 23" }],
      kids: [
        { id: "ch-body", label: "Body", sub: "15 / 20", summary: "Workout 45+ min, nutrition on plan, 100 oz water, 7+ hours sleep." },
        { id: "ch-spirit", label: "Spirit", sub: "15 / 20", summary: "Prayer or meditation 10+ min, journal, read 10+ pages, gratitude." },
        { id: "ch-rel", label: "Relationships", sub: "10 / 20", status: "attention", summary: "5 meaningful conversations, 1 gratitude message, 1 introduction, quality time with family." },
        { id: "ch-biz", label: "Business", sub: "15 / 20", summary: "10 real conversations, followed up with everyone promised, 1 piece of marketing, planned tomorrow." },
        { id: "ch-legacy", label: "Legacy", sub: "10 / 20", summary: "Who is better because I showed up today? Mentored an agent, celebrated a client milestone, served with no expectation." },
        { id: "ch-commit", label: "My Commitments", sub: "Who I am becoming", summary: "The Identity Shift, who you are doing this for, the enemy list, arena goals, and the letter you open on Day 90." },
        { id: "ch-group", label: "Group Challenge", sub: "Group streak 6", summary: "Team last 7 days, group chat, buddy pairs, accountability partner." },
      ],
    },
    {
      id: "go-hwc",
      label: "Hot / Warm / Cold",
      sub: "4 hot · 9 warm · 15 cold",
      summary: "Your pipeline by timing: Hot 1-3 months, Warm 3-12 months, Cold 12+ months.",
      kids: [
        { id: "hwc-hot", label: "Hot", sub: "1-3 months · 4", status: "opportunity" },
        { id: "hwc-warm", label: "Warm", sub: "3-12 months · 9" },
        { id: "hwc-cold", label: "Cold", sub: "12+ months · 15" },
      ],
    },
    {
      id: "go-lounge",
      label: "The Lounge",
      sub: "3 unread",
      summary: "Share wins, ask questions, and build momentum.",
      kids: [
        { id: "lg-calls", label: "Live Coaching Calls", sub: "Monday 11:00am MT", summary: "Daily Morning Brief. Monday Coaching Call, 11:00am Mountain. Friday Coaching Q&A, 11:00am Mountain." },
        { id: "lg-feed", label: "Feed", sub: "Wins, questions", summary: "Posts by category: Win, Question, Motivation, Accountability, Event, General." },
        { id: "lg-dm", label: "Messages", sub: "3 unread" },
        { id: "lg-dir", label: "Directory", sub: "Members" },
      ],
    },
    {
      id: "go-rolodex",
      label: "Business Rolodex",
      sub: "18 businesses",
      summary: "Lenders, inspectors, title and the trades you refer. Request Info texts a business a link to fill in its own details.",
      kids: [
        { id: "rx-lender", label: "Lenders", sub: "3" },
        { id: "rx-inspect", label: "Inspectors", sub: "2" },
        { id: "rx-title", label: "Title", sub: "2" },
        { id: "rx-trades", label: "Trades", sub: "11" },
      ],
    },
    {
      id: "go-tools",
      label: "Tools",
      sub: "Signs, videos, assets",
      kids: [
        { id: "tl-signs", label: "Sign Tracker", sub: "Open house signs", summary: "Drop a pin for each open house sign; get a route to pick them all up." },
        { id: "tl-video", label: "Video Library", sub: "Training, coaching", summary: "Power Agent, Training, System, Coaching, Having Fun." },
        { id: "tl-assets", label: "VIP-50 Assets", sub: "Scripts and resources", summary: "VIP-50 Assets and VIP-50 Scripts." },
        { id: "tl-remind", label: "Reminders", sub: "7am · 1pm · 9pm", summary: "Good Morning, Midday Check-In and End of Day nudges, task and time block alerts, quiet hours." },
      ],
    },
  ]);

  link("p-marcus", "open", "attended");
  link("p-millers", "showly", "showed");
  link("p-jen", "move", "connected_to");
  link("go-contacts", "move", "connected_to");
  link("task-followups", "move", "requires_action");
  link("task-approve", "marquee", "requires_action");
  link("task-rate", "open", "requires_action");
  link("cal-oh", "open", "scheduled_for");
  link("mc-oh", "open", "related_to");
  link("wk-oh", "open", "related_to");
}
