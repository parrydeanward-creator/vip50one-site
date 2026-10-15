// Which Claude answers an Ask Pulse question (Parry, 9 Oct: "yes on Haiku, with stronger bot for harder tasks"): Haiku
// for a quick lookup, Sonnet when the question asks for reasoning, a plan, a comparison or several things at once.
export const QUICK_MODEL = "claude-haiku-5-5";
export const STRONG_MODEL = "claude-sonnet-5-5";

const HARD = /\b(why|should|plan|compare|versus|vs\.?|best|strategy|prioriti[sz]e|recommend|advice|improve|what if|explain|trend|on (pace|track)|tracking|behind|ahead|and also|as well as)\b/i;

export function pickModel(question: string): string {
  const q = question.trim();
  if (HARD.test(q)) return STRONG_MODEL;
  // two questions in one, or a long one
  if ((q.match(/\?/g) ?? []).length > 1 || q.split(/\s+/).length > 22) return STRONG_MODEL;
  return QUICK_MODEL;
}
