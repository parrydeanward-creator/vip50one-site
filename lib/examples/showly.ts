// Showly's four tools, shown in the Brain with example data (Parry, 18 Oct: "there are still many features that when it
// shows them the side information is blank"). Everything here is invented and labelled "Example": the buyers are first
// names with an initial, the homes are made-up streets, and no action sends anything. The lender sees no financial
// details (no amounts, no income, no credit). Pure: no fetching, no secrets.

export type Answer = "yes" | "maybe" | "no";

export interface TourHome {
  id: string;
  time: string; // "10:00 AM"
  street: string;
  city: string;
  beds: number;
  baths: number;
  sqft: number;
  hue: number; // the photo block's colour (no real listing photo in an example)
  answer: Answer | null;
  buyerNote: string | null;
  agentNote: string;
}

export interface Tour {
  id: string;
  buyer: string;
  day: string; // "Sat 18 Oct"
  homes: TourHome[];
}

export interface Recap {
  id: string;
  tourId: string;
  buyer: string;
  day: string;
  homes: number;
  photos: number;
  voiceNotes: number;
  intro: string;
}

export interface LenderRequest {
  id: string;
  buyer: string;
  street: string;
  asked: string; // "Sat 11:32 AM"
  state: "waiting" | "ready";
  back?: string; // "Sat 11:58 AM"
}

export interface Lender {
  name: string;
  company: string;
  phoneShown: string; // an example number (555 range)
  connectedSince: string;
  sees: string;
  never: string;
}

export const ANSWER_WORD: Record<Answer, string> = { yes: "Yes", maybe: "Maybe", no: "No" };

export const SHOWLY_TOURS: Tour[] = [
  {
    id: "tour-dana",
    buyer: "Dana W",
    day: "Sat 18 Oct",
    homes: [
      { id: "h1", time: "10:00 AM", street: "1482 Juniper Hollow Dr", city: "Sandy", beds: 4, baths: 3, sqft: 2860, hue: 32, answer: "yes", buyerNote: "Love the kitchen, and the yard is big enough for Bo.", agentNote: "Roof replaced 2022. Seller is flexible on closing date." },
      { id: "h2", time: "10:40 AM", street: "77 Copper Fox Ln", city: "Draper", beds: 3, baths: 2, sqft: 1940, hue: 200, answer: "maybe", buyerNote: "Great layout, but the street felt busy.", agentNote: "Backs onto the trail. Busier at school times." },
      { id: "h3", time: "11:20 AM", street: "2209 E Willow Bend Cir", city: "Sandy", beds: 4, baths: 3, sqft: 3120, hue: 140, answer: "yes", buyerNote: "This is the one. Can we see it again Sunday?", agentNote: "Quiet cul-de-sac. New furnace. Two offers expected." },
      { id: "h4", time: "12:00 PM", street: "315 Larkspur Ct", city: "Midvale", beds: 3, baths: 2, sqft: 1710, hue: 265, answer: "no", buyerNote: "Basement too dark and the stairs are steep.", agentNote: "Needs updating; priced for it." },
      { id: "h5", time: "12:40 PM", street: "960 Quiet Aspen Way", city: "Cottonwood Heights", beds: 4, baths: 2, sqft: 2280, hue: 10, answer: "maybe", buyerNote: "Nice, but smaller than it looked online.", agentNote: "Big lot. Kitchen is original." },
    ],
  },
  {
    id: "tour-marcus",
    buyer: "Marcus and Jo L",
    day: "Thu 16 Oct",
    homes: [
      { id: "m1", time: "4:00 PM", street: "41 Red Cliff Rd", city: "Herriman", beds: 5, baths: 3, sqft: 3400, hue: 18, answer: "yes", buyerNote: "Room for my mom downstairs. Yes.", agentNote: "Separate basement entrance." },
      { id: "m2", time: "4:45 PM", street: "8820 S Sparrow Hill Dr", city: "West Jordan", beds: 4, baths: 3, sqft: 2600, hue: 220, answer: "maybe", buyerNote: null, agentNote: "HOA covers snow removal." },
      { id: "m3", time: "5:30 PM", street: "12 Lantern Gate Ct", city: "Riverton", beds: 4, baths: 2, sqft: 2150, hue: 95, answer: null, buyerNote: null, agentNote: "Corner lot, new windows." },
    ],
  },
];

export const SHOWLY_RECAPS: Recap[] = [
  { id: "recap-dana", tourId: "tour-dana", buyer: "Dana W", day: "Sat 18 Oct", homes: 5, photos: 38, voiceNotes: 5, intro: "Here are the five homes we saw today, with my notes on each. Tap Yes, Maybe or No on every home and add a note if you like." },
  { id: "recap-marcus", tourId: "tour-marcus", buyer: "Marcus and Jo L", day: "Thu 16 Oct", homes: 3, photos: 21, voiceNotes: 3, intro: "Thanks for Thursday. All three homes are below with photos and what I noticed. Let me know your Yes, Maybe or No." },
];

export const SHOWLY_LENDER: Lender = {
  name: "Priya N",
  company: "Example Home Lending",
  phoneShown: "(801) 555-0142",
  connectedSince: "Connected since 2 Sep",
  sees: "Each home on a recap and your buyer's first name, so she can turn a letter round for that home.",
  never: "Your notes, the buyer's answers or anything else in your account.",
};

export const SHOWLY_LENDER_REQUESTS: LenderRequest[] = [
  { id: "lr1", buyer: "Dana W", street: "2209 E Willow Bend Cir", asked: "Sat 11:32 AM", state: "ready", back: "Sat 11:58 AM" },
  { id: "lr2", buyer: "Marcus and Jo L", street: "41 Red Cliff Rd", asked: "Today 9:10 AM", state: "waiting" },
];

/** How many homes on a tour got each answer, and how many are still unanswered. */
export function answerTally(homes: Pick<TourHome, "answer">[]): Record<Answer | "none", number> {
  const t = { yes: 0, maybe: 0, no: 0, none: 0 };
  for (const h of homes) t[h.answer ?? "none"]++;
  return t;
}

/** "2 Yes · 2 Maybe · 1 No" (only the answers given; "No answers yet" when none). */
export function tallyWords(homes: Pick<TourHome, "answer">[]): string {
  const t = answerTally(homes);
  const parts = (["yes", "maybe", "no"] as const).filter((k) => t[k]).map((k) => `${t[k]} ${ANSWER_WORD[k]}`);
  return parts.length ? parts.join(" · ") : "No answers yet";
}
