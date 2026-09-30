"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

// A product showcase film: the product's own screens on the device it runs on
// (phone, tablet or laptop), ONE Brain stills on a laptop, and the caption
// beside it. Plain HTML and CSS, so every word is real text. `slow` stretches
// every timer and animation for smooth recording (scripts/record-watch.mjs).

import type { ShowStep } from "@/lib/showcase.ts";

export type { ShowStep };

export interface ShowcaseProps {
  name: string; // "ONE Open"
  accent: string; // the product's colour
  steps: ShowStep[];
  outro: string[]; // closing lines; the last is in the accent colour
  render: (step: ShowStep) => ReactNode; // the product's screen for a step
  tabs?: string[]; // phone tab bar labels
  tabFor?: (screen: string) => number;
  record?: boolean;
  slow?: number;
}

const NOTE = "Example agent; people, businesses and addresses are invented.";

export default function Showcase({ name, accent, steps, outro, render, tabs, tabFor, record = false, slow = 1 }: ShowcaseProps) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const step = steps[i];
  const last = i === steps.length - 1;

  useEffect(() => {
    if (!playing || last) return;
    const t = setTimeout(() => setI((n) => n + 1), step.ms * slow);
    return () => clearTimeout(t);
  }, [i, playing, last, step, slow]);

  const screenKey = `${step.device}-${step.screen.split(":")[0]}`;

  return (
    <div className="ga" style={{ ["--s" as string]: String(slow), ["--acc" as string]: accent } as CSSProperties}>
      <header className="bar">
        <a className="brand" href="/dashboard" aria-label="VIP-50 ONE, your dashboard" style={{ color: "var(--text)", textDecoration: "none" }}>
          VIP-50 <b>ONE</b>
        </a>
        <span className="crumbs" style={{ color: "var(--text)", fontWeight: 600 }}>{name}</span>
      </header>
      <div className="ga-stage">
        {step.device === "brain" && step.image ? (
          <div className="ga-laptop" aria-hidden="true" key={step.id}>
            <div className="ga-lid">
              <img src={step.image} alt="" />
            </div>
            <div className="ga-base" />
          </div>
        ) : step.device === "laptop" ? (
          <div className="ga-laptop" aria-hidden="true">
            <div className="ga-lid">
              <div className="sc-web">
                <div className="sc-webbar">
                  <i />
                  <i />
                  <i />
                  <span>{name.toLowerCase().replace(/\s+/g, "")}</span>
                </div>
                <div className="sc-webbody" key={screenKey}>{render(step)}</div>
              </div>
            </div>
            <div className="ga-base" />
          </div>
        ) : step.device === "tablet" ? (
          <div className="sc-tablet" aria-hidden="true">
            <div className="sc-tabscreen" key={screenKey}>{render(step)}</div>
          </div>
        ) : (
          <div className="ga-phone" aria-hidden="true">
            <div className="ga-notch" />
            <div className="ga-screen">
              <div className="ga-status">
                <span>9:41</span>
                <span className="ga-status-r">5G · 100%</span>
              </div>
              <div className="ga-body" key={screenKey}>{render(step)}</div>
              {tabs && step.screen !== "splash" && (
                <nav className="ga-tabs">
                  {tabs.map((t, k) => (
                    <span key={t} className={tabFor?.(step.screen) === k ? "on sc-on" : undefined}>
                      <i />
                      {t}
                    </span>
                  ))}
                </nav>
              )}
            </div>
          </div>
        )}

        <div className="ga-side" role="status" aria-live="polite">
          {!last ? (
            <div className="ga-cap pop" key={step.id} style={{ animationDuration: `${420 * slow}ms` }}>
              {(step.kicker || step.coming) && (
                <p className="ga-kicker sc-kicker">
                  {step.kicker}
                  {step.coming && <span className="watch-coming">Coming</span>}
                </p>
              )}
              <p className="ga-title">{step.title}</p>
              {step.line && <p className="ga-line">{step.line}</p>}
            </div>
          ) : (
            <div className="ga-cap ga-end pop" style={{ animationDuration: `${420 * slow}ms` }}>
              <p className="ga-tag">
                {outro.map((l, k) => (
                  <span key={k}>
                    {k === outro.length - 1 ? <b className="sc-acc">{l}</b> : l}
                    {k < outro.length - 1 && <br />}
                  </span>
                ))}
              </p>
              {!record && (
                <div className="watch-end-actions">
                  <button onClick={() => setI(0)}>↺ Watch again</button>
                  <a href="/dashboard">Explore my business</a>
                </div>
              )}
            </div>
          )}
          {!record && !last && (
            <div className="ga-ctl">
              <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
              <button onClick={() => setI(0)} aria-label="Start again">↺</button>
            </div>
          )}
          <p className="ga-note">{NOTE}</p>
        </div>
      </div>
    </div>
  );
}
