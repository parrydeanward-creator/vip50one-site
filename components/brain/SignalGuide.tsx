"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import PulseMark from "./PulseMark.tsx";
import { GUIDE, GUIDE_TITLE, type DemoKind } from "@/lib/signalGuide.ts";

// "What everything means": a step-by-step walk through every signal the Brain
// draws, each with a small live example. Opens from Meet Pulse and the "?"
// control. Animations stop under reduced motion (globals.css).

const GOLD = "#d4af37", GOLD2 = "#f5c542", RED = "#e4574a", YEL = "#e5b83a", GREEN = "#3fbf7f", TEAL = "#2fb7a3", BLUE = "#4f7fe0", ICE = "#9fd3ff";

function Orb({ x = 80, y = 60, r = 22, color = TEAL, faded = false, children }: { x?: number; y?: number; r?: number; color?: string; faded?: boolean; children?: ReactNode }) {
  return (
    <g opacity={faded ? 0.35 : 1}>
      <circle cx={x} cy={y} r={r * 1.7} fill={color} opacity={0.12} />
      <circle cx={x} cy={y} r={r} fill="#0c1328" stroke={color} strokeWidth={2} />
      {children}
    </g>
  );
}

function Rings({ x = 80, y = 60, r = 22, color, fast }: { x?: number; y?: number; r?: number; color: string; fast?: boolean }) {
  const cls = fast ? "sg-ring sg-fast" : "sg-ring";
  return (
    <>
      <circle className={cls} cx={x} cy={y} r={r + 4} fill="none" stroke={color} strokeWidth={3} />
      <circle className={`${cls} sg-late`} cx={x} cy={y} r={r + 4} fill="none" stroke={color} strokeWidth={3} />
      <circle cx={x} cy={y} r={r + 3} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} />
    </>
  );
}

function Demo({ kind }: { kind: DemoKind }) {
  switch (kind) {
    case "breathe":
      return (
        <g className="sg-breathe">
          <circle cx={80} cy={60} r={46} fill={GOLD} opacity={0.15} />
          <circle cx={80} cy={60} r={30} fill="url(#sg-core)" stroke={GOLD2} strokeWidth={2} />
          <text x={80} y={66} textAnchor="middle" fontSize={18} fontWeight={800} fill="#fff" letterSpacing={2}>ONE</text>
        </g>
      );
    case "pulse-red":
      return (
        <>
          <Rings color={RED} fast />
          <Orb color={TEAL}><text x={80} y={65} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">TM</text></Orb>
        </>
      );
    case "pulse-yellow":
      return (
        <>
          <Rings color={YEL} />
          <Orb color={TEAL}><text x={80} y={65} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">SM</text></Orb>
        </>
      );
    case "green":
      return (
        <>
          <circle cx={80} cy={60} r={28} fill="none" stroke={GREEN} strokeWidth={2.2} opacity={0.85} />
          <Orb color={TEAL}><text x={80} y={65} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">AC</text></Orb>
        </>
      );
    case "count":
      return (
        <>
          <line x1={38} y1={60} x2={122} y2={60} stroke={TEAL} strokeWidth={1.4} opacity={0.5} />
          <Rings x={38} r={16} color={RED} fast />
          <Orb x={38} r={16} color={TEAL} />
          <circle cx={50} cy={48} r={9} fill={RED} stroke="#070b18" strokeWidth={3} />
          <text x={50} y={52} textAnchor="middle" fontSize={11} fontWeight={800} fill="#070b18">4</text>
          <Rings x={122} r={16} color={RED} fast />
          <Orb x={122} r={16} color={TEAL}><text x={122} y={65} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">TM</text></Orb>
          <text x={80} y={104} textAnchor="middle" fontSize={10} fill="#a9b0bd">Follow-ups (4) → the person</text>
        </>
      );
    case "celebrate":
      return (
        <>
          <circle className="sg-glow" cx={80} cy={60} r={42} fill={GOLD2} opacity={0.22} />
          <Orb color={GOLD}><text x={80} y={65} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">JA</text></Orb>
          <circle cx={80} cy={60} r={27} fill="none" stroke={GOLD} strokeWidth={3} />
        </>
      );
    case "opportunity":
      return (
        <>
          <Orb color={BLUE} />
          <circle cx={96} cy={44} r={7} fill="#070b18" />
          <circle className="sg-blink" cx={96} cy={44} r={5} fill={GOLD2} />
        </>
      );
    case "ping":
      return (
        <>
          <circle className="sg-ping" cx={80} cy={60} r={24} fill="none" stroke={TEAL} strokeWidth={3} />
          <Orb color={TEAL} />
        </>
      );
    case "signal":
      return (
        <>
          <line x1={30} y1={60} x2={130} y2={60} stroke={GOLD} strokeWidth={1.2} opacity={0.4} />
          <Orb x={30} r={14} color="#f2a93b" />
          <circle cx={130} cy={60} r={20} fill="url(#sg-core)" stroke={GOLD2} strokeWidth={2} />
          <circle className="sg-fly" cx={30} cy={60} r={4} fill="#fff" />
          <circle className="sg-land" cx={130} cy={60} r={20} fill="none" stroke={GOLD2} strokeWidth={2} />
        </>
      );
    case "heartbeat":
      return (
        <>
          {[20, 60, 100, 140].map((x) => (
            <line key={x} x1={80} y1={60} x2={x} y2={108} stroke={TEAL} strokeWidth={1.2} opacity={0.35} />
          ))}
          <Orb r={18} color={TEAL} />
          {[20, 60, 100, 140].map((x, i) => (
            <circle key={x} className="sg-beat" style={{ ["--dx" as string]: `${x - 80}px`, animationDelay: `${i * 0.12}s` }} cx={80} cy={60} r={3} fill={TEAL} />
          ))}
        </>
      );
    case "arc":
      return (
        <>
          <Orb color="#f2a93b" />
          <circle cx={80} cy={60} r={33} fill="none" stroke="#fff" strokeOpacity={0.08} strokeWidth={3} />
          <circle className="sg-arc" cx={80} cy={60} r={33} fill="none" stroke="#ffd08a" strokeWidth={3} strokeLinecap="round" transform="rotate(-90 80 60)" strokeDasharray={`${2 * Math.PI * 33 * 0.56} 999`} />
          <text x={80} y={64} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">14/25</text>
        </>
      );
    case "locked":
      return (
        <>
          <Orb x={50} color={BLUE} faded />
          <text x={50} y={64} textAnchor="middle" fontSize={9} fill="#a9b0bd">locked</text>
          <Orb x={115} color={TEAL} />
          <text x={115} y={64} textAnchor="middle" fontSize={9} fill="#fff">yours</text>
        </>
      );
    case "hwc":
      return (
        <>
          <Orb x={40} r={16} color={RED}><text x={40} y={64} textAnchor="middle" fontSize={9} fill="#fff">HOT</text></Orb>
          <circle className="sg-glow" cx={40} cy={60} r={21} fill="none" stroke={GOLD2} strokeWidth={2} />
          <Orb x={80} r={16} color={YEL}><text x={80} y={64} textAnchor="middle" fontSize={9} fill="#fff">WARM</text></Orb>
          <Orb x={120} r={16} color={ICE}><text x={120} y={64} textAnchor="middle" fontSize={9} fill="#fff">COLD</text></Orb>
          <circle cx={120} cy={60} r={19} fill="none" stroke={ICE} strokeWidth={2} strokeDasharray="2 3" />
          <text x={80} y={104} textAnchor="middle" fontSize={10} fill="#a9b0bd">gold heartbeat · frost when overdue</text>
        </>
      );
    case "vip":
      return (
        <>
          <circle cx={80} cy={60} r={30} fill="none" stroke={GOLD} strokeWidth={1.2} opacity={0.6} />
          <circle cx={80} cy={60} r={50} fill="none" stroke={TEAL} strokeWidth={1.2} opacity={0.6} />
          <circle cx={80} cy={60} r={12} fill="url(#sg-core)" />
          {[0, 1.6, 3.2, 4.8].map((a, i) => (
            <g key={a}>
              <circle cx={80 + 30 * Math.cos(a)} cy={60 + 30 * Math.sin(a)} r={7} fill="#0c1328" stroke={GOLD} strokeWidth={1.5} />
              {i === 2 && <circle className="sg-glow" cx={80 + 30 * Math.cos(a)} cy={60 + 30 * Math.sin(a)} r={11} fill={RED} opacity={0.35} />}
            </g>
          ))}
          {[0.8, 2.4, 4, 5.6].map((a) => (
            <circle key={a} cx={80 + 50 * Math.cos(a)} cy={60 + 50 * Math.sin(a)} r={6} fill="#0c1328" stroke={TEAL} strokeWidth={1.5} />
          ))}
        </>
      );
    case "touch":
      return (
        <>
          <circle cx={80} cy={60} r={22} fill="#0c1328" stroke={GOLD} strokeWidth={2} />
          <circle className="sg-arc" cx={80} cy={60} r={22} fill="none" stroke={GOLD2} strokeWidth={4} transform="rotate(-90 80 60)" strokeDasharray={`${2 * Math.PI * 22 * 0.68} 999`} />
          <text x={80} y={64} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff">68%</text>
          {[0, 1.26, 2.51, 3.77, 5.03].map((a, i) => (
            <g key={a}>
              <circle cx={80 + 44 * Math.cos(a)} cy={60 + 44 * Math.sin(a)} r={9} fill="#0c1328" stroke={TEAL} strokeWidth={1.5} />
              <circle cx={80 + 44 * Math.cos(a)} cy={60 + 44 * Math.sin(a)} r={9 * [0.9, 0.6, 0.4, 0.75, 0.3][i]} fill={TEAL} opacity={0.6} />
            </g>
          ))}
        </>
      );
    case "rolodex":
      return (
        <>
          <Orb x={50} r={18} color="#c9a227" />
          <circle cx={50} cy={60} r={24} fill="none" stroke={GOLD2} strokeWidth={2} strokeDasharray="3 4" />
          <text x={50} y={98} textAnchor="middle" fontSize={10} fill="#a9b0bd">offer</text>
          <Orb x={115} r={18} color="#c9a227" />
          <circle cx={128} cy={47} r={5} fill={TEAL} stroke="#070b18" strokeWidth={2} />
          <text x={115} y={98} textAnchor="middle" fontSize={10} fill="#a9b0bd">shared</text>
        </>
      );
    case "contacts":
      return (
        <>
          <Orb r={24} color={TEAL}><text x={80} y={64} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff">VIP-50</text></Orb>
          <circle cx={98} cy={42} r={9} fill={GOLD2} stroke="#070b18" strokeWidth={3} />
          <text x={98} y={46} textAnchor="middle" fontSize={11} fontWeight={800} fill="#070b18">6</text>
        </>
      );
  }
}

export default function SignalGuide({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const step = GUIDE[i];
  const last = i === GUIDE.length - 1;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setI((n) => Math.min(GUIDE.length - 1, n + 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
      else return;
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return (
    <div className="pi-back" onClick={onClose}>
      <section className="pi sg pop" role="dialog" aria-modal="true" aria-labelledby="sg-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="pi-close" onClick={onClose} aria-label="Close">×</button>
        <header className="pi-head">
          <PulseMark />
          <h2 id="sg-title">{GUIDE_TITLE}</h2>
          <p className="sg-chapter">{step.chapter} · {i + 1} of {GUIDE.length}</p>
        </header>
        <div className="sg-body" key={i} aria-live="polite">
          <svg className="sg-demo pop" viewBox="0 0 160 120" role="img" aria-label={step.title}>
            <defs>
              <radialGradient id="sg-core">
                <stop offset="0%" stopColor="#fff3c4" />
                <stop offset="55%" stopColor={GOLD2} />
                <stop offset="100%" stopColor="#8a6a12" />
              </radialGradient>
            </defs>
            <Demo kind={step.demo} />
          </svg>
          <div>
            <h3 className="sg-title">{step.title}</h3>
            <p className="sg-line">{step.line}</p>
          </div>
        </div>
        <div className="sg-dots" aria-hidden="true">
          {GUIDE.map((s, n) => (
            <button key={s.demo} tabIndex={-1} className={n === i ? "on" : ""} onClick={() => setI(n)} />
          ))}
        </div>
        <div className="pi-actions sg-nav">
          <button className="pi-btn" onClick={() => setI(i - 1)} disabled={i === 0}>Back</button>
          <button className="pi-btn pi-primary" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? "Done" : "Next"}</button>
        </div>
      </section>
    </div>
  );
}
