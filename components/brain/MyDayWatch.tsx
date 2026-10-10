"use client";

import { useEffect, useState } from "react";
import Watch from "./Watch.tsx";
import { DAY_FILM_KEY, dayFilm, readDayItems, type DayFilm } from "@/lib/dayFilm.ts";

// /watch?mine=1: the Watch film on the agent's own day (PULSE-ROADMAP #16). The Brain leaves today's plan in this tab's
// sessionStorage; with nothing there, it says so and links back.

export default function MyDayWatch() {
  const [film, setFilm] = useState<DayFilm | null | undefined>(undefined);
  useEffect(() => {
    let read: ReturnType<typeof readDayItems> = null;
    try {
      read = readDayItems(JSON.parse(sessionStorage.getItem(DAY_FILM_KEY) ?? "null"));
    } catch {}
    setFilm(read ? dayFilm(read.items, read.first) : null);
  }, []);
  if (film === undefined) return <div className="brain watch" />;
  if (!film)
    return (
      <div className="brain watch">
        <main className="legal">
          <h1>Nothing planned yet</h1>
          <p>Open your dashboard, let Pulse plan your day, then press Watch Pulse work again.</p>
          <p>
            <a href="/dashboard">Back to my dashboard</a>
          </p>
        </main>
      </div>
    );
  return <Watch custom={film} />;
}
