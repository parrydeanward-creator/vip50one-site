"use client";

import type { Tone } from "@/lib/examples/marquee.ts";
import "../../../app/marquee-views.css";

// A drawn stand-in for a listing photo (Marquee's example): a home against the sky in the piece's colours. Listing
// pictures only ever sit on property cards, never as a person's face.
export function MqPhoto({ tone, label, size = "md" }: { tone: Tone; label?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div className={`mqv-photo mqv-${tone} mqv-${size}`} role="img" aria-label={label ? `Example photo: ${label}` : "Example photo"}>
      <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <circle cx="94" cy="20" r="9" className="mqv-sun" />
        <path d="M0 62 L22 50 L44 58 L70 46 L96 56 L120 48 L120 80 L0 80 Z" className="mqv-hill" />
        <path d="M34 60 L60 40 L86 60 Z" className="mqv-roof" />
        <rect x="40" y="58" width="40" height="22" className="mqv-wall" />
        <rect x="56" y="66" width="8" height="14" className="mqv-door" />
        <rect x="45" y="63" width="7" height="6" className="mqv-win" />
        <rect x="68" y="63" width="7" height="6" className="mqv-win" />
      </svg>
      {label ? <span className="mqv-photo-l">{label}</span> : null}
    </div>
  );
}

export function MqExample() {
  return <span className="mqv-ex">Example</span>;
}
