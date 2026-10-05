// Follow the pulse inside the pages drawn in SVG (Contacts, Hot/Warm/Cold, VIP rings): the same
// signal as the orbs on the map (scene.ts). Red "now" is overdue or an alert, yellow "today" is due
// today, a still green ring is all good. Under reduced motion the rings stand still (globals.css).

export type PulseLevel = "now" | "today" | "good";

export const PULSE_COLOR: Record<PulseLevel, string> = { now: "#e4574a", today: "#e5b83a", good: "#3fbf7f" };

export default function PulseRing({ r, level, x = 0, y = 0 }: { r: number; level: PulseLevel; x?: number; y?: number }) {
  const c = PULSE_COLOR[level];
  if (level === "good") return <circle cx={x} cy={y} r={r * 1.08} fill="none" stroke={c} strokeWidth={Math.max(2, r * 0.04)} opacity={0.85} pointerEvents="none" />;
  const w = Math.max(2.5, r * 0.06);
  const cls = `pr-ring${level === "now" ? " pr-now" : ""}`;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <circle className={`pr-glow${level === "now" ? " pr-now" : ""}`} cx={x} cy={y} r={r * 1.3} fill={c} />
      <circle className={cls} cx={x} cy={y} r={r * 1.06} fill="none" stroke={c} strokeWidth={w} />
      <circle className={`${cls} pr-late`} cx={x} cy={y} r={r * 1.06} fill="none" stroke={c} strokeWidth={w} />
      <circle cx={x} cy={y} r={r * 1.05} fill="none" stroke={c} strokeWidth={w * 0.7} opacity={0.9} />
    </g>
  );
}

/** The level for a count of things that need the agent: red if any is overdue. */
export function levelOf(needs: number, now = 0): PulseLevel {
  return now > 0 ? "now" : needs > 0 ? "today" : "good";
}
