"use client";

import { useEffect, useRef, useState } from "react";
import { confirmWords } from "@/lib/deleteContact.ts";

// The "..." menu on a person card (walker 2026-10-17-0042: "in a '...' menu so it is not pressed by accident"). One
// item for now, "Delete contact", which asks first and names the person. "Remove from VIP-50" is not here: that is a
// change of list, never a delete.
export default function PersonMenu({ first, onDelete }: { first: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open && !asking) return;
    const away = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) (setOpen(false), setAsking(false));
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") (setOpen(false), setAsking(false));
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open, asking]);

  return (
    <div className="pmenu" ref={box}>
      <button type="button" className="pmenu-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`More for ${first}`} onClick={() => (setOpen((o) => !o), setAsking(false))}>
        ⋯
      </button>
      {open && !asking ? (
        <div className="pmenu-list" role="menu">
          <button type="button" role="menuitem" className="pmenu-danger" onClick={() => (setAsking(true), setOpen(false))}>
            Delete contact
          </button>
        </div>
      ) : null}
      {asking ? (
        <div className="pmenu-ask" role="alertdialog" aria-label={`Delete ${first}`}>
          <p>{confirmWords(first)}</p>
          <span className="pf-actions">
            <button type="button" className="chip-btn pmenu-yes" autoFocus onClick={() => (setAsking(false), onDelete())}>
              Delete
            </button>
            <button type="button" className="chip-btn" onClick={() => setAsking(false)}>
              Cancel
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}
