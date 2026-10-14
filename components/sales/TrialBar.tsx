"use client";

import { useEffect, useState } from "react";

// Phones only (Parry, 14 Oct: "add the start free to phones"): a bar at the bottom once the visitor has scrolled past
// the hero, hidden while the packages are on screen (their own buttons are there). CSS hides it on desktop.
export default function TrialBar({ href }: { href: string }) {
  const [pastHero, setPastHero] = useState(false);
  const [packsInView, setPacksInView] = useState(false);

  useEffect(() => {
    const hero = document.querySelector(".sp-hero");
    const packs = ["packages", "growth", "teams"].map((id) => document.getElementById(id)).filter((x): x is HTMLElement => !!x);
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0);
        else if (e.isIntersecting) seen.add(e.target);
        else seen.delete(e.target);
      }
      setPacksInView(seen.size > 0);
    });
    if (hero) io.observe(hero);
    packs.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, []);

  const show = pastHero && !packsInView;
  return (
    <div className={`sp-trialbar ${show ? "show" : ""}`} aria-hidden={!show}>
      <a className="sp-cta" href={href} tabIndex={show ? 0 : -1}>
        Start your 7-day free trial
      </a>
    </div>
  );
}
