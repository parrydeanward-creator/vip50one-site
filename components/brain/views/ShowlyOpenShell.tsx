"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "@/app/showly-open-views.css";

// The full view for a Showly or ONE Open tool, inside the Brain (Parry, 18 Oct): a dark sheet over the graph with the
// product's tools as tabs. Escape or Back returns to the graph, where the orb is still in the middle.

export interface ShellTab {
  key: string;
  label: string;
  /** A link-only tool: opens the product's own page (through the sign-in hop) in a new tab instead of a view here. */
  href?: string;
}

export default function ShowlyOpenShell({ product, color, title, tabs, tab, onTab, example, onClose, children }: {
  product: string;
  color: string;
  title: string;
  tabs: ShellTab[];
  tab: string;
  onTab: (k: string) => void;
  example: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;
  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeFn.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  useEffect(() => {
    if (mounted) closeRef.current?.focus();
  }, [mounted]);
  const tabsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // the open tab stays in sight on a phone, where the tabs scroll sideways
    tabsRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab, mounted]);

  const view = (
    <div className="pm-full pop pso-full" role="dialog" aria-modal="true" aria-labelledby="pso-title" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="pso-shell">
        <header className="pso-top">
          <button ref={closeRef} type="button" className="chip-btn" onClick={onClose} aria-label={`Close ${title}`}>← Back</button>
          <div className="pso-top-t">
            <p className="pso-kicker" style={{ color }}>{product}</p>
            <h1 className="d-title" id="pso-title">{title}</h1>
          </div>
          {example ? <span className="pso-ex">Example</span> : null}
        </header>
        <nav ref={tabsRef} className="pso-tabs" aria-label={`${product} tools`}>
          {tabs.map((t) => (t.href ? (
            <a key={t.key} className="chip-btn" href={t.href} target="_blank" rel="noopener noreferrer">
              {t.label} ↗
            </a>
          ) : (
            <button key={t.key} type="button" className="chip-btn" aria-pressed={t.key === tab} onClick={() => onTab(t.key)}>
              {t.label}
            </button>
          )))}
        </nav>
        {children}
      </div>
    </div>
  );
  return mounted ? createPortal(view, document.body) : null;
}

/** A listing photo stand-in on a property card (an example has no real photo). Never used for a person. */
export function HomeBlock({ hue, label, small }: { hue: number; label: string; small?: boolean }) {
  return (
    <div className={`pso-photo${small ? " sm" : ""}`} style={{ background: `linear-gradient(160deg, hsl(${hue} 45% 42%), hsl(${(hue + 30) % 360} 40% 18%))` }} role="img" aria-label={`Example photo: ${label}`}>
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <path d="M8 38V20L32 4l24 16v18z" fill="rgba(255,255,255,0.16)" />
        <path d="M26 38V26h12v12z" fill="rgba(0,0,0,0.25)" />
        <path d="M14 24h7v6h-7zM43 24h7v6h-7z" fill="rgba(255,240,200,0.45)" />
      </svg>
    </div>
  );
}

/** The "Open <tool>" button at the top of a tool's side panel. */
export function OpenToolButton({ label, line, onOpen }: { label: string; line: string; onOpen: () => void }) {
  return (
    <button className="pi-film pm-open pso-openbtn" onClick={onOpen}>
      <span className="pi-play" aria-hidden="true">▶</span>
      <span>
        <b>{`Open ${label}`}</b>
        <span>{line}</span>
      </span>
    </button>
  );
}

/** Real rows from the product (live mode), shown the same way as the example. */
export function RealRows({ rows, empty }: { rows: { id: string; label: string; sub?: string }[]; empty: string }) {
  if (!rows.length) return <p className="pso-muted">{empty}</p>;
  return (
    <ul className="pso-list">
      {rows.map((r) => (
        <li key={r.id} className="pso-row">
          <span className="pso-row-b">
            <b>{r.label}</b>
            {r.sub ? <small>{r.sub}</small> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
