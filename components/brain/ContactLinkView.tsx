"use client";

import { useEffect, useRef } from "react";
import ContactPanel from "./ContactPanel.tsx";
import MoveExampleFetch from "./views/MoveExampleFetch.tsx";

// One named person, ready to act (other products link here: /dashboard/contacts/<contact_id>, lib/deepLink.ts). The
// same contact panel the Weekly Review's names open, loaded from ONE MOVE's /api/brain/contact?id=. Back returns to
// Contacts, which the Brain has opened behind it.
export default function ContactLinkView({ id, demo, onBack, onChanged, backLabel = "Back to Contacts" }: { id: string; demo: boolean; onBack: () => void; onChanged: () => void; backLabel?: string }) {
  const backRef = useRef<HTMLButtonElement>(null);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  useEffect(() => {
    backRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onBackRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  return (
    <div className="pm-full pop" role="dialog" aria-modal="true" aria-label="Contact">
      <div className="vr" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="vr-stage" />
        <aside className="drawer vr-drawer pm-drawer" aria-label="Contact">
          <div className="d-head">
            <span className="chip">Contacts</span>
          </div>
          {demo ? <MoveExampleFetch /> : null}
          <div className="rv-step">
            <button ref={backRef} type="button" className="vr-classic" onClick={onBack}>{backLabel}</button>
          </div>
          <ContactPanel key={id} contactId={id} onLogged={onChanged} />
        </aside>
      </div>
    </div>
  );
}
