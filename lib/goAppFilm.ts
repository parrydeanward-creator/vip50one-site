// The ONE GO app film (Parry, 30 Sep): the phone app itself, on a phone, with
// the features agents use every day. Every feature shown is in the live app
// (VIP50-app, read 30 Sep): generated VIP-50 daily tasks that check themselves
// off when the call or text is made from the app (DashboardTasksWindow),
// calendar time blocks, the Business Rolodex's share, Hot / Warm / Cold, the
// Drop-By Map and the Lounge. Example agent; invented people.

export type GoScreen = "brain" | "splash" | "home" | "call" | "text" | "calendar" | "rolodex" | "refer" | "hwc" | "map" | "lounge" | "score";

export interface GoStep {
  id: string;
  screen: GoScreen;
  done: string[]; // tasks checked off so far
  points: number; // daily score shown
  kicker: string;
  title: string;
  line: string;
  ms: number;
  image?: string; // brain scenes: a still of the ONE Brain dashboard, shown on a laptop
}

export interface GoTask {
  id: string;
  who: string;
  initials: string;
  kind: "Call" | "Video text" | "Note" | "Social" | "Drop-by";
  why: string;
  auto?: boolean; // made from the app, so it checks itself off
}

export const GO_TASKS: GoTask[] = [
  { id: "jen", who: "Jen Alvarez", initials: "JA", kind: "Call", why: "Birthday tomorrow", auto: true },
  { id: "marcus", who: "Marcus Lee", initials: "ML", kind: "Video text", why: "30 days since your last text", auto: true },
  { id: "dave", who: "Dave Kim", initials: "DK", kind: "Note", why: "Last note 94 days ago" },
  { id: "parkers", who: "The Parkers", initials: "TP", kind: "Social", why: "Posted their new kitchen" },
  { id: "amy", who: "Amy Chen", initials: "AC", kind: "Call", why: "Sent you a referral", auto: true },
  { id: "reyes", who: "The Reyes", initials: "TR", kind: "Drop-by", why: "Anniversary Friday" },
];

export const GO_STEPS: GoStep[] = [
  { id: "splash", screen: "splash", done: [], points: 14, kicker: "ONE GO", title: "Your whole business, in the palm of your hand.", line: "The VIP-50 method, as an app on your phone.", ms: 4200 },
  { id: "brain", screen: "brain", image: "/film/brain-go.png", done: [], points: 14, kicker: "ONE Brain", title: "On your desktop, ONE GO lives inside ONE Brain.", line: "Your points, your tasks and your week, next to the other four products.", ms: 5200 },
  { id: "tasks", screen: "home", done: [], points: 14, kicker: "Today", title: "ONE builds your task list every morning.", line: "Who to call, text, write to and visit, and why. You don't have to think about it.", ms: 5400 },
  { id: "call", screen: "call", done: [], points: 14, kicker: "Call", title: "Tap call. Make the call.", line: "Jen's birthday is tomorrow.", ms: 4200 },
  { id: "called", screen: "home", done: ["jen"], points: 15, kicker: "Done", title: "It checks itself off.", line: "Calls and texts made from the app are logged for you. 15 of 26.", ms: 4200 },
  { id: "text", screen: "text", done: ["jen"], points: 15, kicker: "Video text", title: "Same with a video text.", line: "Record it, send it. Done.", ms: 4000 },
  { id: "ticks", screen: "home", done: ["jen", "marcus", "dave", "parkers"], points: 18, kicker: "Everything else", title: "Do the task. Check the box.", line: "A handwritten note, a social touch. Your score climbs as you go.", ms: 4600 },
  { id: "calendar", screen: "calendar", done: [], points: 18, kicker: "Calendar", title: "Time-block your day.", line: "Power Hour first. Protect the time that makes you money.", ms: 5400 },
  { id: "rolodex", screen: "rolodex", done: [], points: 18, kicker: "Business Rolodex", title: "Every business you trust, in one place.", line: "Lenders, inspectors, title, trades, and their offers for your clients.", ms: 4600 },
  { id: "refer", screen: "refer", done: [], points: 18, kicker: "Refer", title: "Refer a business with one touch.", line: "Their card goes to your client by text, photo and all.", ms: 4600 },
  { id: "hwc", screen: "hwc", done: [], points: 18, kicker: "Hot / Warm / Cold", title: "Never miss a deal.", line: "Everyone who might move, and when. Kim just moved to Hot.", ms: 5000 },
  { id: "map", screen: "map", done: [], points: 18, kicker: "Drop-By Map", title: "See where your people are.", line: "Four VIPs within five miles. Plan the route and serve them better.", ms: 5200 },
  { id: "lounge", screen: "lounge", done: [], points: 18, kicker: "The Lounge", title: "See what's working for other agents.", line: "Posts, messages and live coaching calls.", ms: 5000 },
  { id: "brainall", screen: "brain", image: "/film/brain-home.png", done: [], points: 18, kicker: "Connected", title: "Everything you do in ONE GO lights up ONE.", line: "Your score, your people and your day, connected to ONE MOVE, Marquee, ONE Open and Showly.", ms: 5000 },
  { id: "score", screen: "score", done: [], points: 26, kicker: "Scoreboard", title: "Do the work. Win the week.", line: "26 of 26 today. A 13-day streak. First on the leaderboard.", ms: 4600 },
  { id: "outro", screen: "score", done: [], points: 26, kicker: "", title: "ONE GO. Everything in the palm of your hand. Part of ONE.", line: "", ms: 5200 },
];

export const GO_MS = GO_STEPS.reduce((t, s) => t + s.ms, 0);
