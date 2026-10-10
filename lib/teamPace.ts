import type { Mate, Team } from "./team.ts";

// Team and broker view (PULSE-ROADMAP #18): a team leader or broker, as coach, sees team pace and who needs help.
// Scores and badges only, from the Team screen route (§3u); never private notes, never contacts. Away weeks (§3x)
// never count against anyone.

export interface Pace {
  /** "82 this week · 3 of the last 4 at 100" */
  line: string;
  /** Plain words when the agent may need help, else null. */
  help: string | null;
}

/** One agent's pace from the Team screen numbers. */
export function paceOf(m: Mate, minimum: number): Pace {
  const weeks = m.last4.map((s, k) => ({ s, away: m.last4Away[k] ?? false })).filter((w) => !w.away);
  const under = weeks.filter((w) => w.s < minimum).length;
  const at = weeks.length - under;
  const line = m.away ? "Away this week" : `${m.score} this week${weeks.length ? ` · ${at} of the last ${weeks.length} at ${minimum}` : ""}`;
  let help: string | null = null;
  if (!m.away && weeks.length >= 3 && under >= 3) help = `Under ${minimum} ${under} of the last ${weeks.length} weeks`;
  else if (!m.away && weeks.length >= 2 && weeks.slice(-2).every((w) => w.s === 0)) help = "No points the last two weeks";
  return { line, help };
}

/** The team's pace: the average this week (away agents left out) and who may need help, most weeks under first. */
export function teamPace(t: Team, ids?: Set<string>): { average: number | null; atMinimum: number; counted: number; help: { mate: Mate; words: string }[] } {
  const mates = t.agents.filter((m) => !m.me && (!ids || ids.has(m.id)));
  const here = mates.filter((m) => !m.away);
  const average = here.length ? Math.round(here.reduce((s, m) => s + m.score, 0) / here.length) : null;
  const help = mates
    .map((mate) => ({ mate, words: paceOf(mate, t.minimum).help }))
    .filter((x): x is { mate: Mate; words: string } => !!x.words)
    .sort((a, b) => a.mate.score - b.mate.score || a.mate.name.localeCompare(b.mate.name));
  return { average, atMinimum: here.filter((m) => m.score >= t.minimum).length, counted: here.length, help };
}

/** The Team screen entry for a coached agent, by id. */
export const mateOf = (t: Team | null, id: string) => t?.agents.find((m) => m.id === id) ?? null;
