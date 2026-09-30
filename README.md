# vip50one-site

vip50one.com: the main dashboard (first), then the sales page and sign-in.
Built by the ecosystem bot; every change is a PR Parry approves.

Design: `vip50-ecosystem/research/DESIGN-BRIEF.md` (look) and
`research/DASHBOARD-BRIEF.md` (what the dashboard does).

## Run

```bash
npm install
npm test          # ranking, packages, AI note guards
npm run build
npm start         # http://localhost:3000/dashboard
```

Demo states: `/dashboard?package=relationship`, `?package=elite`, `?offline=1`.

## Environment

- `ANTHROPIC_API_KEY` (Parry sets it in the Vercel project). Without it the
  morning note is written by the plain rules instead of the AI; nothing breaks.

## Where the data comes from

Today: `lib/demo.ts`, a made-up agent. Next: sign-in with MASTER and one
`vip_summary` call per product (contract in vip50-ecosystem).

## Ask ONE

The bar over the map ("Ask ONE anything about your business…", or press `/`).
`POST /api/ask {question, package}` returns `{answer, results[{id, reasons}], source}`:
Claude (`lib/askAI.ts`) when `ANTHROPIC_API_KEY` is set, plain rules otherwise
(`lib/ask.ts`). Every id is checked against the graph, every result carries its
WHY, and an answer that claims anything was sent, published or scheduled for the
agent is thrown away. The map re-lays itself around the answer
(`answerSet` in `lib/ask.ts`); tapping ONE, ✕ or Back returns to the map.

## Morning fly-through and Since you were last here

On the first visit of the agent's day (America/Denver), the camera shows ONE
and today's top three (`morningTop` in `lib/morning.ts`: ONE's own
recommendations first, then what needs the agent most), then visits each with
a caption, then settles. Any tap, scroll or key skips it; it never runs under
reduced motion. `?tour=1` forces it; "Replay my morning" on ONE's card replays
it. The last visit is kept in the browser (`one.lastVisit`).

ONE's card lists what changed since the last visit (`graph.changes`; demo data
now, the products' unseen VIP-SUMMARY items later), and each product with a
change rings once on the map (`scene.ping`).

## Live signals

When something new arrives in a product, a light travels from that product's
orb into ONE, ONE rings, a small card says what arrived (with Go to), the
numbers on the card tick, and the item joins Since you were last here.

- Logic: `lib/signals.ts` (what changed, the new numbers, where the light
  starts). Drawing: `BrainScene.signal` in `components/brain/scene.ts`.
- Demo: a timer plays one example per product the agent has, the first about
  9 s after load, then every 40 s. Paused during the morning fly-through, while
  an answer is up and while the tab is hidden. `?signals=fast` for a quick
  look (every 7 s), `?signals=off` to stop them.
- Real data: poll each product's `vip_summary` every few minutes and pass the
  two answers to `diffSummaries`; new items become signals. Waits on the
  `one-brain` secret (VIP-SUMMARY.md §8).
- Reduced motion: no light; the card and the numbers still update.

## Watch ONE Work

`/watch`: a 27-second story over the same engine. One person, Mark Davis,
moves through all five products (open house sign-in in ONE Open, into ONE
MOVE tagged by source, a follow-up ONE suggests in ONE GO, a Showly tour,
742 Willow Lane) and ONE ends with the next thing to do, with its WHY. Opened
from ONE's card ("Watch ONE Work"); ends with Watch again / Explore my
business. Pause, start again and skip are on screen; every caption is read
out (the canvas is decoration).

- Story: `lib/watch.ts` (steps, hand-placed positions). Page:
  `components/brain/Watch.tsx`.
- Honesty (ONE-BRAIN.md §7): example agent and invented people, said on
  screen. The hand-offs between products are marked **Coming** until the
  event contract is built.
- Video for the sales page: `?record=1` hides the controls;
  `node scripts/record-watch.mjs 1920x1080 4 <ffmpeg>` records it in slow
  motion (so a machine without a GPU draws every frame) and speeds it back up
  to a 30 fps MP4 in `docs/`.

## Timeline

A slider under the map: PAST <- TODAY -> FUTURE, 30 days each way, one day a
step (arrow keys work; Escape or the date button returns to today). Drag back
and ONE is surrounded by what happened between then and today; drag forward
and by what is coming (birthdays, open houses, posts, reports, lunches,
events). Each item rings as it comes into view; the card lists them by day
with Go to. Live signals pause while you look.

- Logic: `lib/timeline.ts` (Mountain-time days, the window, labels). Demo
  dates: `dated` in `lib/graph/demo.ts`. Real data: VIP-SUMMARY items' `due`
  and each product's dated history.
- On a phone the zoom buttons give way to the timeline (pinch zooms).

## The five products, in depth

Each product's part of the map is modelled on its live app (read 30 Sep), in
the app's own words; the numbers are a made-up agent's until `vip_summary`
feeds real ones.

- ONE GO: `lib/graph/go.ts` (Today, Daily Tracker, Weekly Bonus, Score, VIP contacts).
- ONE MOVE: `lib/graph/move.ts` (Follow-ups, New to sort, Touch Audit on Parry's
  five monthly touches, Contacts, VIP Management, Mixer RSVPs, Newsletter,
  Action Plans, referrals, Hot/Warm/Cold).
- Marquee: `lib/graph/marquee.ts` (This week, each listing's nine-step path,
  the listing-appointment path, the four campaign kinds, seller reports,
  posting, which stays off until the agent switches it on).
- ONE Open: `lib/graph/open.ts` (Plan, Prepare, Host, Follow Up with the app's
  own tasks, Needs you, Scorecard).
- Showly: `lib/graph/showly.ts` (tours, Since you sent, what came back as
  Yes / Maybe / No, the buyer, pre-approval letters, the lender).

## Your day

ONE's card opens with **Your day**: today's work from all five products, in
order, each with a time and how long it takes (people first while they pick
up; approvals before posting time; lunch at lunch; admin in the afternoon;
follow-ups to close the day). Tick an item, or let ONE tick it: when a product
reports the work (a live signal, e.g. the call with Jen logged in ONE GO), the
item turns done by itself. From 5 pm (Mountain), or once everything is done,
ONE compiles the day: done, VIP touches, what moves to tomorrow. "Show my day
on the map" lays today around ONE.

- Logic: `lib/day.ts` (plan, recap, which signal completes which item).
  Demo items: `today` in `lib/graph/demo.ts`. Real data: VIP-SUMMARY items due
  today, completed by their product's own record.
- Done items are remembered for the day in this browser. `?day=evening` shows
  the recap at any hour.
