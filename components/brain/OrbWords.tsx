"use client";

import { useEffect, useState } from "react";

// The words inside a ring orb, under its number (Parry, 16 Oct, audit 3.3.4 and 3.5.4): the symbols under each number
// (crown, phone, circle, wave; house, heart, star) meant nothing and the labels under the orbs were about 9 px, 5 px on a
// 390 px phone (3.3.6). One component for every ring view that shows a number with words: Weekly Review, Income Map and
// Pulse Coach. On a phone the orbs are larger and the words set at a readable size; a long word is narrowed to fit.

const PHONE = "(max-width: 719px)";

/** True on a phone-width screen (the Brain's own phone breakpoint). */
export function useOrbPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(PHONE);
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return phone;
}

/** Ring orb radius: larger on a phone so the words inside it can be read (the ring keeps room for seven). */
export const orbR = (phone: boolean) => (phone ? 100 : 84);

// Rough width of a line of text, in units of its font size (wide enough for capitals and figures).
const width = (s: string, size: number, caps: boolean) => s.length * size * (caps ? 0.68 : 0.58);

function Line({ x, y, text, size, min, max, caps, className }: { x: number; y: number; text: string; size: number; min: number; max: number; caps: boolean; className: string }) {
  const fit = Math.max(min, Math.min(size, max / Math.max(1, text.length * (caps ? 0.68 : 0.58))));
  const over = width(text, fit, caps) > max;
  return (
    <text className={className} x={x} y={y} textAnchor="middle" fontSize={fit} textLength={over ? max : undefined} lengthAdjust={over ? "spacingAndGlyphs" : undefined}>
      {text}
    </text>
  );
}

export default function OrbWords({ x, y, r, big, word, tag, phone }: { x: number; y: number; r: number; big: string; word: string; tag?: string; phone: boolean }) {
  const max = r * 1.6;
  const s = phone ? { big: 46, word: 30, tag: 23, min: 22 } : { big: 32, word: 19, tag: 14, min: 12 };
  const top = tag ? y - r * 0.12 : y - r * 0.02;
  return (
    <g aria-hidden="true">
      <Line className="pm-mark ow-big" x={x} y={top} text={big} size={s.big} min={s.min} max={max} caps />
      <Line className="ow-word" x={x} y={top + s.word * 1.15} text={word} size={s.word} min={s.min} max={max * 0.96} caps={false} />
      {tag ? <Line className="ow-tag" x={x} y={top + s.word * 1.15 + s.tag * 1.2} text={tag} size={s.tag} min={Math.min(s.min, s.tag)} max={max * 0.86} caps /> : null}
    </g>
  );
}
