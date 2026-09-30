// The navigation controller: which node is focused, and the Brain's own back
// history (not the browser's). ONE -> MARQUEE -> WIN -> ... and back again.

export interface NavState {
  focusId: string;
  history: string[]; // previous focuses, most recent last
}

export function start(rootId: string): NavState {
  return { focusId: rootId, history: [] };
}

export function go(s: NavState, id: string): NavState {
  if (id === s.focusId) return s;
  return { focusId: id, history: [...s.history, s.focusId].slice(-50) };
}

export function back(s: NavState): NavState {
  if (!s.history.length) return s;
  const history = s.history.slice(0, -1);
  return { focusId: s.history[s.history.length - 1], history };
}

// Reset keeps the way back to where the agent was.
export function reset(s: NavState, rootId: string): NavState {
  return go(s, rootId);
}
