"use client";

import { useState } from "react";
import type { OnbMember } from "@/lib/onboarding.ts";

// One new member on the Onboarding board (TEAM-ONBOARDING §2.3): their six steps, ready for leads, and the Nudge,
// which opens the lead's own Messages (ONE sends nothing) or is copied on a computer.
export default function OnboardingPanel({ m }: { m: OnbMember }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="ob-panel" aria-label={`${m.name}'s setup`}>
      <ol className="ob-steps">
        {m.steps.map((s) => (
          <li key={s.key} className={s.done ? "done" : undefined}>
            <span aria-hidden="true">{s.done ? "✓" : "○"}</span> {s.label}
            <span className="sr-only">{s.done ? " done" : " not done yet"}</span>
          </li>
        ))}
      </ol>
      <p className="ob-ready">
        {m.readyForLeads ? "Ready for leads: profile and ONE GO are set up." : "Not ready for leads yet: needs a profile and ONE GO on their phone."}
        {m.inRotation ? " In lead rotation." : ""}
      </p>
      {m.nudge ? (
        <div className="ob-nudge">
          <b>Nudge</b>
          <p>{m.nudge}</p>
          <div className="decide-btns">
            {m.nudgeSms ? <a className="chip-btn primary" href={m.nudgeSms}>Text from my phone</a> : null}
            <button
              type="button"
              className="chip-btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(m.nudge!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {}
              }}
            >
              {copied ? "Copied" : "Copy the note"}
            </button>
          </div>
          <small className="pf-sub">ONE sends nothing. You send it, or don&apos;t.</small>
        </div>
      ) : null}
    </section>
  );
}
