import type { DashboardData, PackageId, ProductSummary } from "./types.ts";

// A made-up agent with plausible numbers, so the dashboard can be designed,
// reviewed and photographed before any product answers the vip_summary
// contract. Every name and address here is invented.

export const DEMO_TIME_ZONE = "America/Denver";

export function localDate(timeZone: string, now = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface DemoOptions {
  pkg?: PackageId;
  offline?: boolean; // Showly unreachable, to show that state
  now?: Date;
}

export function demoData(opts: DemoOptions = {}): DashboardData {
  const pkg = opts.pkg ?? "complete";
  const today = localDate(DEMO_TIME_ZONE, opts.now);
  const d = (n: number) => addDays(today, n);

  const products: ProductSummary[] = [
    {
      product: "go",
      reachable: true,
      stats: [
        { label: "Touches due today", value: "6" },
        { label: "Streak", value: "12 days" },
      ],
      statusLine: "On pace for 400 touches this month",
      items: [
        {
          id: "go-touches",
          product: "go",
          kind: "vip_touch",
          title: "6 VIP touches due today",
          detail: "Two calls, three texts, one handwritten card",
          due: d(0),
          urgency: "today",
          action: { label: "Open GO", href: "#go" },
        },
        {
          id: "go-bday-jen",
          product: "go",
          kind: "birthday",
          title: "Jen Alvarez's birthday is tomorrow",
          detail: "VIP-50 · last touch 19 days ago",
          due: d(1),
          urgency: "soon",
          action: { label: "Open GO", href: "#go" },
        },
        {
          id: "go-dropby",
          product: "go",
          kind: "drop_by",
          title: "2 drop-bys on today's route",
          detail: "The Parkers and Dave Kim, both in Draper",
          due: d(0),
          urgency: "soon",
          action: { label: "Open GO", href: "#go" },
        },
      ],
    },
    {
      product: "move",
      reachable: true,
      stats: [
        { label: "Follow-ups due", value: "4" },
        { label: "New contacts to sort", value: "3" },
      ],
      statusLine: "1,284 contacts · 3 new from Saturday's open house",
      items: [
        {
          id: "move-followups",
          product: "move",
          kind: "follow_up",
          title: "4 follow-ups are overdue",
          detail: "Oldest: Marcus Lee, due Friday",
          due: d(-2),
          urgency: "today",
          action: { label: "Open MOVE", href: "https://move.vip50one.com" },
        },
        {
          id: "move-sort",
          product: "move",
          kind: "new_contacts",
          title: "3 new contacts from Saturday's open house",
          detail: "Tagged Open House · 1482 Maple Ridge Dr",
          due: d(0),
          urgency: "soon",
          action: { label: "Sort them", href: "https://move.vip50one.com" },
        },
      ],
    },
    {
      product: "marquee",
      reachable: true,
      stats: [
        { label: "Waiting for approval", value: "5" },
        { label: "Active listings", value: "2" },
      ],
      statusLine: "Scheduled publishing is off",
      items: [
        {
          id: "mq-approve",
          product: "marquee",
          kind: "approval",
          title: "5 pieces waiting for your approval",
          detail: "1482 Maple Ridge Dr · first goes out Thursday",
          due: d(1),
          urgency: "today",
          action: { label: "Review", href: "https://marquee.vip-50.com" },
        },
        {
          id: "mq-report",
          product: "marquee",
          kind: "report",
          title: "Weekly seller report due Friday",
          detail: "The Hendersons · 1482 Maple Ridge Dr",
          due: d(3),
          urgency: "soon",
          action: { label: "Open Marquee", href: "https://marquee.vip-50.com" },
        },
      ],
    },
    {
      product: "open",
      reachable: true,
      stats: [
        { label: "Next open house", value: "Sun 1-3pm" },
        { label: "Prep tasks left", value: "3" },
      ],
      statusLine: "Prepare phase · 2 visitors to rate",
      items: [
        {
          id: "open-rate",
          product: "open",
          kind: "follow_up",
          title: "2 visitors from Saturday not yet rated",
          detail: "Rate them so the Day 1 call goes to the right people",
          due: d(0),
          urgency: "today",
          action: { label: "Rate visitors", href: "https://open.vip-50.com" },
        },
        {
          id: "open-prep",
          product: "open",
          kind: "prep",
          title: "Sunday's open house: 3 prep tasks left",
          detail: "Neighbour invites, signs, lender co-host",
          due: d(2),
          urgency: "soon",
          action: { label: "Open ONE Open", href: "https://open.vip-50.com" },
        },
      ],
    },
    {
      product: "showly",
      reachable: !opts.offline,
      stats: [
        { label: "New buyer reactions", value: "4" },
        { label: "Tours this week", value: "2" },
      ],
      statusLine: "The Millers reacted to 4 homes",
      items: [
        {
          id: "showly-millers",
          product: "showly",
          kind: "reaction",
          title: "The Millers reacted to 4 homes from yesterday's tour",
          detail: "Two Yes, one Maybe, one No",
          due: d(0),
          urgency: "today",
          action: { label: "See reactions", href: "https://showly.net" },
        },
      ],
    },
  ];

  return {
    agent: {
      firstName: "Sarah",
      lastName: "Bennett",
      email: "sarah.bennett@example.com",
      package: pkg,
      founding: true,
      timeZone: DEMO_TIME_ZONE,
    },
    today,
    scoreboard: {
      touchesThisMonth: 286,
      touchGoal: 400,
      vipCount: 47,
      vipGoal: 50,
      streakDays: 12,
      referralsThisYear: 9,
      closingsThisYear: 14,
      closingsGoal: 25,
    },
    products,
    coaching:
      pkg === "elite"
        ? {
            day: 23,
            length: 90,
            nextSessions: [
              { label: "Morning Brief", when: "Weekdays · 9:00am MT" },
              { label: "Tech call", when: "Friday · 12:00pm MT" },
              { label: "Accountability Zoom", when: "Friday" },
              { label: "Teaching Zoom", when: "Monday" },
            ],
          }
        : null,
  };
}
