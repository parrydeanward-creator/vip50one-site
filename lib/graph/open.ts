import { done, todo, tree, type Add } from "./go.ts";

// ONE Open in depth, modelled on vip-open main (read 30 Sep): the Open House
// Protocol's four phases with the app's own tasks (lib/tasks.ts), Home's
// "Needs you" rules and the Scorecard. Visitors are rated 1-5 stars with a
// separate Hot flag. Numbers are a made-up agent's.

export function addOpen(add: Add) {
  tree(
    add,
    "open",
    [
      {
        id: "open-0",
        label: "Plan",
        sub: "Done",
        status: "healthy",
        summary: "Sunday's open house at 1482 Maple Ridge Dr.",
        kids: [
          done("op-p1", "Get permission from the listing agent or owner"),
          done("op-p2", "Verify the Buyer Profile"),
          done("op-p3", "Invite a lender co-host"),
        ],
      },
      {
        id: "open-1",
        label: "Prepare",
        sub: "3 tasks left",
        status: "attention",
        summary: "Checklist 4 of 7 done. Next: confirm the open house is live in the MLS.",
        kids: [
          done("op-r1", "Start daily prep stories on Instagram and Facebook"),
          done("op-r2", "Launch paid social ads"),
          done("op-r3", "Door knock the neighborhood"),
          { id: "op-r4", label: "Confirm the open house is live in the MLS", sub: "72 hours before", status: "attention" },
          todo("op-r5", "Pull 3 alternate homes for same-day showings"),
          todo("op-r6", "Print flyers and the QR sign-in sheets"),
          done("op-r7", "Load the kit"),
        ],
      },
      {
        id: "open-2",
        label: "Host",
        sub: "Sun 1-3pm",
        summary: "Signs out, kiosk up, safety check-in on, then the Exclusive Neighborhood Tour in the first 30 minutes.",
        kids: [
          todo("op-h1", "Place signs and balloons at every entrance"),
          todo("op-h2", "Set up the kiosk and the security sign-in notice"),
          todo("op-h3", "Start your safety check-in"),
          todo("op-h4", "Run the Exclusive Neighborhood Tour", "First 30 minutes"),
          todo("op-h5", "Pick up every sign and balloon"),
        ],
      },
      {
        id: "open-3",
        label: "Follow Up",
        sub: "2 to rate",
        status: "attention",
        summary: "Saturday's open house: 14 visitors signed in. Five stars means call first.",
        stats: [{ label: "Visitors", value: "14" }, { label: "Hot", value: "2" }, { label: "Not rated", value: "2" }],
        kids: [
          done("op-f1", "Send a video text to every visitor", "Day 0 · done"),
          { id: "op-f2", label: "Rate every attendee and finish your notes", sub: "2 left", status: "attention" },
          done("op-f3", "Send the seller report to the listing agent"),
          todo("op-f4", "Send buyer reports and buyer-agent reports"),
          todo("op-f5", "60-second debrief and expenses"),
        ],
      },
      {
        id: "open-4",
        label: "Needs you",
        sub: "3 things",
        status: "action",
        summary: "What ONE Open's Home says needs you now.",
        kids: [
          { id: "op-n1", label: "A follow-up email did not go out", sub: "To Kim R. · won't be retried", status: "action" },
          { id: "op-n2", label: "2 visitors not rated yet", sub: "1482 Maple Ridge Dr", status: "attention" },
          { id: "op-n3", label: "3 new neighbor RSVPs", sub: "1 wants a home value", status: "opportunity" },
        ],
      },
      {
        id: "open-5",
        label: "Scorecard",
        sub: "6-week streak",
        status: "healthy",
        summary: "Your Business-Building Machine: open houses to conversations to relationships to clients.",
        stats: [{ label: "Week streak", value: "6" }, { label: "Visitors / open house", value: "11" }, { label: "Follow-up done", value: "86%" }, { label: "Contact → client", value: "9%" }],
      },
    ],
    "open",
  );
}
