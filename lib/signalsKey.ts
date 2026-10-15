// What everything means, written (walker audit 02; Parry, 15 Oct: "yes, 1-4 better"): readable in 20 seconds, the same
// on desktop and phone, above the film. The colours and words are the settled follow-the-pulse rules (Parry, 5 Oct).

export interface KeyRow {
  mark: "red" | "yellow" | "green" | "gold-dot" | "gold-glow" | "ring" | "count" | "click";
  name: string;
  means: string;
}

export const SIGNALS_KEY: KeyRow[] = [
  { mark: "red", name: "Red pulse", means: "Right now: overdue or an alert." },
  { mark: "yellow", name: "Yellow pulse", means: "Today: needs you before the day ends." },
  { mark: "green", name: "Still green ring", means: "All good." },
  { mark: "gold-dot", name: "Gold dot", means: "An opportunity." },
  { mark: "gold-glow", name: "Gold glow", means: "A special day: a birthday or an anniversary." },
  { mark: "ring", name: "A ring that spreads once", means: "Changed since you were last here." },
  { mark: "count", name: "Number on an orb", means: "How many things inside it need you." },
  { mark: "click", name: "Click an orb", means: "It comes to the middle and its panel opens; ← goes back." },
];
