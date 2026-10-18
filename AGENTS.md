# Instructions for ChatGPT / Codex (Parry, 18 Oct)

You are working in a VIP-50 repo that a Claude bot owns and deploys. Before any change:

1. Read `CLAUDE.md` (or `bots/<bot>.md`), `PROTOCOL.md` and `PROJECT_RULES.md` in parrydeanward-creator/vip50-ecosystem,
   and this repo's own `PROJECT_RULES.md` (vip50one-site: the ecosystem bot owns it). Parry's hard rules and settled decisions there override anything else.
2. **Never push to `main`.** Pushing to main deploys to live users at once. Always work on a branch and open a pull
   request; the repo's own bot reviews, tests and merges it (anything touching money waits for Parry).
3. Use invented example data only. Never put a client's or agent's personal details, or any secret or key, in code,
   commits, pull requests or prompts.
4. Never change anything that sends, posts or publishes for an agent without the agent's own tap, and never change
   billing, sign-in or the GitHub Actions workflows unless Parry asked for that exact change.
5. Say in the pull request what Parry asked for, in his words, and what you changed.
