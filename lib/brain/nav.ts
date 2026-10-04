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

/**
 * Back is one step up the path shown at the top (ONE / ONE MOVE / People /
 * VIP Management), not the way the agent came (Parry, 4 Oct). `path` is that
 * breadcrumb, root first. At the root, back stays put.
 */
export function up(s: NavState, path: { id: string }[]): NavState {
  const parent = path.length > 1 ? path[path.length - 2].id : null;
  return parent ? go(s, parent) : s;
}
