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
