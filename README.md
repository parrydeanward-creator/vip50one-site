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
