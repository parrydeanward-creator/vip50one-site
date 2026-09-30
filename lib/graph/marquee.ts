import { done, todo, tree, type Add, type Link } from "./go.ts";

// Marquee in depth, modelled on marquee-app main (read 30 Sep): the listing
// path and appointment path from app/lib/steps.js, the Marquee Next rules
// (app/lib/next.js) and This week (app/lib/week.js). Scheduled posting is off
// by default; nothing posts unless the agent approved the piece and switched
// it on (ECOSYSTEM.md §9.8). Numbers are a made-up agent's.

export function addMarquee(add: Add, link: Link) {
  tree(
    add,
    "marquee",
    [
      {
        id: "marquee-0",
        label: "This week",
        sub: "3 things need you · 35 min",
        status: "attention",
        summary: "Today, this week and later across every listing, with how long each takes.",
        stats: [{ label: "Need you this week", value: "3" }, { label: "Minutes", value: "35" }],
        kids: [
          { id: "mq-w-approve", label: "Approve 5 pieces", sub: "1482 Maple Ridge Dr · by Wed", status: "action", summary: "Due two days before the first posting day. About 15 minutes." },
          { id: "mq-w-review", label: "Review the finished work", sub: "88 Aspen Ct · today", status: "attention", summary: "The listing presentation is built. About 15 minutes." },
          { id: "mq-w-six", label: "Answer this week's six questions", sub: "1482 Maple Ridge Dr · Fri", summary: "The weekly seller report starts once the listing is on the market. About 3 minutes." },
        ],
      },
      {
        id: "marquee-3",
        label: "1482 Maple Ridge Dr",
        sub: "5 to approve",
        type: "property",
        status: "action",
        summary: "Launch a new listing. The campaign is built; five pieces wait for your approval before they can post.",
        stats: [{ label: "Waiting for approval", value: "5" }, { label: "Pieces", value: "24" }, { label: "Posting", value: "You post these yourself" }],
        recs: [{ title: "Approve the 5 pieces", why: ["Five pieces are awaiting your approval.", "The first posting day is Thursday.", "Nothing posts until you approve it."], targetId: "mq-s-review" }],
        kids: [
          done("mq-s-add", "Add the listing"),
          done("mq-s-photos", "Upload the photos"),
          done("mq-s-build", "Build the campaign"),
          { id: "mq-s-review", label: "Review and approve", sub: "Now · 5 pieces", status: "action" },
          todo("mq-s-live", "Tell Marquee it is on the market", "Next"),
          todo("mq-s-posting", "Choose how it posts", "Scheduled posting is off"),
          todo("mq-s-weekly", "Every Friday: six questions"),
          todo("mq-s-contract", "Under contract"),
          todo("mq-s-closed", "Closed"),
        ],
      },
      {
        id: "marquee-1",
        label: "88 Aspen Ct",
        sub: "Listing appointment Thu",
        type: "property",
        status: "attention",
        summary: "Win the listing. The presentation is built and ready for you to read.",
        kids: [
          done("mq-a-add", "Add the property"),
          done("mq-a-photos", "Add photos, if you have them"),
          done("mq-a-build", "Build the presentation"),
          { id: "mq-a-review", label: "Review it", sub: "Now", status: "attention" },
          todo("mq-a-won", "Present it, then tell us if you won", "Thu"),
        ],
      },
      {
        id: "marquee-2",
        label: "Start a new listing",
        sub: "Four kinds of campaign",
        summary: "Add the address and your photos; Marquee builds it in about an hour; you read it and approve it.",
        kids: [
          { id: "mq-k-win", label: "Win the listing", sub: "Listing appointment" },
          { id: "mq-k-launch", label: "Launch a new listing", sub: "Full campaign" },
          { id: "mq-k-relaunch", label: "Relaunch one that is not moving", sub: "Fresh campaign" },
          { id: "mq-k-expired", label: "Go after an expired listing", sub: "Listing appointment" },
        ],
      },
      {
        id: "marquee-4",
        label: "Seller reports",
        sub: "Due Friday",
        summary: "Every week: six questions, then send your seller the report.",
        kids: [{ id: "mq-r-maple", label: "1482 Maple Ridge Dr", sub: "Starts when it is on the market" }],
      },
      {
        id: "marquee-5",
        label: "Posting",
        sub: "Instagram and Facebook connected",
        status: "healthy",
        summary: "Scheduled posting is off for every campaign until you switch it on. You post approved pieces yourself; a piece that misses its day is never posted late.",
        kids: [
          { id: "mq-p-ig", label: "Instagram", sub: "Connected", status: "healthy" },
          { id: "mq-p-fb", label: "Facebook Page", sub: "Connected", status: "healthy" },
        ],
      },
    ],
    "marquee",
  );
  link("marquee-3", "open", "related_to");
}
