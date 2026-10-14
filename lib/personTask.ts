// "Who is this? Pick the right person" only for a task that names a person (audit stage 2, Parry 14 Oct: never for tasks
// like "Agent Attraction 1"). A task names a person when it starts with a touch verb, or reads "... with <Name>".

const TOUCH = /^(call|text|video text|email|send (a )?(note|card|text|email)( to)?|follow[- ]up( with)?|face[- ]to[- ]face|drop[- ]by|lunch|coffee|meet|thank|note to|handwritten note|social touch)\b/i;
const NOT_PEOPLE = /^(agent attraction|set ?up|newsletter|mixer|market report|weekly|daily|plan|review|approve|launch|open house)\b/i;

export function namesPerson(title: string | null | undefined): boolean {
  const t = (title ?? "").trim();
  if (!t || NOT_PEOPLE.test(t)) return false;
  if (TOUCH.test(t)) return true;
  return /\b(with|to|for)\s+[A-Z][a-z]+/.test(t);
}
