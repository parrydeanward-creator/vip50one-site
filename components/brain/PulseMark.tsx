// Pulse, the AI inside VIP-50 ONE (Parry, 4 Oct: "I want the ai to be called
// Pulse"). Its mark: a gold heartbeat line and the name. The line runs while
// Pulse is working (thinking, writing the morning note).

export default function PulseMark({ beating = false, label = true }: { beating?: boolean; label?: boolean }) {
  return (
    <span className={`pulse-mark${beating ? " beating" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 40 16" width="34" height="14">
        <path className="pulse-line" d="M0 8 H11 L14 3 L18 13 L22 1 L26 15 L29 8 H40" />
      </svg>
      {label && <b>PULSE</b>}
    </span>
  );
}
