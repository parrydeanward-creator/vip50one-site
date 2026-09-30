import { tree, type Add } from "./go.ts";

// Showly (agent side) in depth, modelled on showly main (read 30 Sep): tours,
// the recap, buyers answering Yes / Maybe / No per home with a note, "Since
// you sent", what the buyer is approved to, pre-approval letters and the
// lender card. Numbers and names are a made-up agent's.

export function addShowly(add: Add) {
  tree(
    add,
    "showly",
    [
      {
        id: "showly-0",
        label: "Your tours",
        sub: "3 buyers",
        summary: "One tour per showing day: capture each home, then build the recap and send it.",
        kids: [
          { id: "sh-t-millers", label: "The Millers · Tue", sub: "4 homes · Sent", status: "healthy" },
          { id: "sh-t-parkers", label: "The Parkers · today", sub: "3 homes · 1 with nothing said", status: "attention" },
          { id: "sh-t-rivera", label: "Alex Rivera · Sat", sub: "5 homes · Sent", status: "healthy" },
        ],
      },
      {
        id: "showly-1",
        label: "Since you sent",
        sub: "1 answer · 1 quiet",
        status: "attention",
        kids: [
          { id: "sh-s-millers", label: "The Millers answered", sub: "On 4 homes", status: "opportunity" },
          { id: "sh-s-rivera", label: "Alex Rivera hasn't opened Saturday's recap", sub: "Sent 3 days ago", status: "attention" },
        ],
      },
      {
        id: "showly-2",
        label: "What came back",
        sub: "4 new answers",
        status: "opportunity",
        summary: "The Millers' answers from Tuesday's recap. Yes, Maybe or No on each home, with a note.",
        kids: [
          { id: "sh-a-birch", label: "1180 Birch St", sub: "Yes · \"Great yard\"", type: "property", status: "opportunity" },
          { id: "sh-a-canyon", label: "56 Canyon Rd", sub: "Yes", type: "property", status: "opportunity" },
          { id: "sh-a-elm", label: "903 Elm Ct", sub: "Maybe · \"Busy road?\"", type: "property" },
          { id: "sh-a-ridge", label: "15 Ridge View", sub: "No", type: "property" },
        ],
      },
      {
        id: "showly-3",
        label: "The Millers",
        sub: "2nd tour Fri",
        type: "person",
        status: "opportunity",
        summary: "Active buyers. Two tours; the second is Friday.",
        kids: [
          { id: "sh-m-learn", label: "What they're telling you", sub: "Yard yes; busy roads no" },
          { id: "sh-m-approved", label: "What they're approved to", sub: "$650,000 · 1 home $25k over", status: "attention" },
        ],
      },
      {
        id: "showly-4",
        label: "Pre-approval letters",
        sub: "1 ready · 1 waiting",
        kids: [
          { id: "sh-l-birch", label: "Letter ready", sub: "1180 Birch St", status: "healthy" },
          { id: "sh-l-canyon", label: "Asked Tue", sub: "56 Canyon Rd · waiting on Dana" },
        ],
      },
      {
        id: "showly-5",
        label: "Your lender",
        sub: "Dana Ortiz · sharing on",
        type: "person",
        status: "healthy",
        summary: "They see the addresses, your buyer's first name and the date. Never your notes, your voice memo, or what anyone marked.",
      },
    ],
    "showly",
  );
}
