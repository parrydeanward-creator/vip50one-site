# vip50one-site -- project rules

vip50one.com: the sales page, sign-in and ONE Brain (the signed-in dashboard). Built and merged by the ecosystem bot.
Standing rules: vip50-ecosystem CLAUDE.md §2-3 and PROTOCOL.md (incl. "Efficiency").

## Architecture
- Next.js 15 app router. The Brain is an SVG/D3 graph with an accessible button overlay (`components/brain/`,
  `Brain.tsx`); data from MASTER and ONE MOVE's `/api/brain/*` routes; `?demo=1` runs on `lib/demo*` with no network.
- Sign-in against MASTER auth; ONE MOVE calls carry a same-origin bearer (`/api/session-token`, `lib/moveAuth.ts`,
  `components/MoveBearer.tsx`). Any page that can receive `?code=` hands it to `/auth/confirm`.
- Pulse (`/api/ask`, morning note) uses Claude when `ANTHROPIC_API_KEY` is set, plain rules otherwise.

## Must keep
- One sign-in: never link into a product that lands on its sign-in page.
- Orbs: a click centres the orb and opens its side panel; again returns to the whole view.
- Follow the pulse: red now, yellow today, still green ring all good; parents carry the count.
- Every agent feature also in ONE MOVE Classic, same words. My Profile items on both, two columns on desktop.
- Nothing is sent or published for an agent unless the agent chose it; Autopilot only by the agent.
- Pulse never proposes a home's value; a CMA range is the agent's.
- Dark look per vip50-ecosystem research/DESIGN-BRIEF.md. No emojis.

## Security
- Secrets only in Vercel env, never in code or chat. Session-token route refuses cross-site requests (403).

## Checks before every merge
`npx tsc --noEmit`, `npm test`, `npx next build`, and a Playwright screen check (desktop 1440 and phone 390) of what
changed, on a live-shaped graph where it matters. Money changes wait for Parry.
