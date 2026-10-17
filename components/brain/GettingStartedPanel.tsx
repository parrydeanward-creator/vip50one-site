"use client";

import { badgeLine, buttonWords, minutesWords, shownSteps, type Start, type StartPlace, type StartStep } from "@/lib/gettingStarted.ts";

// The Getting started orb's side panel (GETTING-STARTED.md): every step that fits the agent's package, in Parry's order,
// each with why it matters, about how long it takes and one button straight to the place. The tick is never a button:
// ONE ticks a step itself when it sees it done. The next step is highlighted; the website step shows its sub-steps.
export default function GettingStartedPanel({ s, placeOf, onOpen, onFilm }: {
  s: Start;
  placeOf: (step: StartStep) => StartPlace | null;
  onOpen: (place: StartPlace, step: StartStep) => void;
  onFilm: (film: "a" | "b") => void;
}) {
  const steps = shownSteps(s);
  const badge = badgeLine(s);
  return (
    <section className="gs-panel" aria-label="Getting started steps">
      {badge ? (
        <p className="gs-badge" role="status">
          <b>{badge}</b> Every step done: your Launched badge is on the Scoreboard.
        </p>
      ) : (
        <p className="gs-intro">
          <b>{s.done} of {s.of} done.</b> Each step ticks itself when ONE sees it done. Finish them all for the <b>{s.badge.name}</b> badge, +{s.badge.xp} XP.
        </p>
      )}
      <ol className="gs-steps">
        {steps.map((step) => {
          const place = placeOf(step);
          const isNext = step.key === s.next && !step.done;
          const mins = minutesWords(step.minutes);
          return (
            <li key={step.key} className={`${step.done ? "done" : ""}${isNext ? " next" : ""}`} aria-current={isNext ? "step" : undefined}>
              <span className="gs-tick" aria-hidden="true">{step.done ? "✓" : step.n}</span>
              <div className="gs-body">
                <b>
                  {step.label}
                  {isNext ? <em className="gs-next">Next</em> : null}
                  <span className="sr-only">{step.done ? ", done" : ", not done yet"}</span>
                </b>
                {step.why ? <p>{step.why}</p> : null}
                {step.line ? <p className="gs-line">{step.line}</p> : null}
                {step.subs.length ? (
                  <ul className="gs-subs" aria-label={`${step.label}: its parts`}>
                    {step.subs.map((x) => (
                      <li key={x.key} className={x.done ? "done" : undefined}>
                        <span aria-hidden="true">{x.done ? "✓" : "○"}</span> {x.label}
                        <small>{x.needed ? "needed" : "not needed for the badge"}</small>
                        <span className="sr-only">{x.done ? ", done" : ", not done yet"}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="gs-foot">
                  {mins ? <small>{mins}</small> : null}
                  {place?.kind === "films" ? (
                    <span className="gs-btns">
                      <button type="button" className={`chip-btn${isNext ? " primary" : ""}`} onClick={() => onFilm("a")}>What everything means</button>
                      <button type="button" className={`chip-btn${isNext ? " primary" : ""}`} onClick={() => onFilm("b")}>Watch the ONE GO tour</button>
                    </span>
                  ) : place ? (
                    <button type="button" className={`chip-btn${isNext ? " primary" : ""}`} onClick={() => onOpen(place, step)}>
                      {step.done ? "Open again" : buttonWords(place)}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <small className="pf-sub">Folds into the menu (Getting started) once every step is done, or after your first 30 days.</small>
    </section>
  );
}
