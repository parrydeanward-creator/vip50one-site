"use client";

import { useCallback, useEffect, useState } from "react";
import { demoPeople, exampleWar30, peopleUrl, readPeople, readWar30, war30Url, type TeamPeople, type War30 } from "@/lib/teamPeople.ts";

// The team lead's people and 30-day War room (lib/teamPeople.ts), read with the lead's own session. ONE MOVE answers
// anyone who is not the team's owner or an admin with a 403: then both stay null and nothing new shows. The demo gets
// the labelled example team and example numbers.
export function useTeamRoom(live: boolean) {
  const [people, setPeople] = useState<TeamPeople | null>(null);
  const [war30, setWar30] = useState<War30 | null>(null);
  const get = (u: string) => fetch(u, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const loadWar30 = useCallback(() => {
    if (!live) return setWar30(exampleWar30(Date.now()));
    get(war30Url).then((j) => setWar30(j ? readWar30(j) : null));
  }, [live]);
  useEffect(() => {
    if (!live) {
      setPeople(demoPeople());
      setWar30(exampleWar30(Date.now()));
      return;
    }
    const loadPeople = () => get(peopleUrl).then((j) => setPeople(j ? readPeople(j) : null));
    loadPeople();
    loadWar30();
    const a = setInterval(loadWar30, 60_000);
    const b = setInterval(loadPeople, 600_000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [live, loadWar30]);
  return { people, war30, loadWar30 };
}
