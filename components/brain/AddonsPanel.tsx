"use client";

import { useEffect, useRef, useState } from "react";
import PulseMark from "./PulseMark.tsx";
import { addonCheckoutUrl, addonsUrl, nameOf, readAddons, readCheckout, type Addon, type Addons } from "@/lib/addons.ts";

// Add-ons for ONE Complete (CHECKOUT.md §2), from the menu. Each card: name, price, what it is, a field when it needs
// an area or a template, and Buy (or "Add to my plan", which asks ONE MOVE's own confirm words first). Buy opens Stripe
// Checkout; nothing is bought from here without the agent's press.
export default function AddonsPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<Addons | null | undefined>(undefined);
  const [field, setField] = useState<Record<string, string>>({});
  const [asking, setAsking] = useState<{ key: string; confirm: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = () =>
    fetch(addonsUrl, { credentials: "include", cache: "no-store" })
      .then(async (r) => setData(r.ok ? readAddons(await r.json().catch(() => null)) : null))
      .catch(() => setData(null));
  useEffect(() => {
    closeRef.current?.focus();
    void load();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buy = async (a: Addon, confirmed = false) => {
    if (a.needs && !field[a.key]?.trim()) return setNote(a.needs === "area" ? "Type the area first." : "Pick the template first.");
    setBusy(a.key);
    setNote(null);
    const body: Record<string, unknown> = { key: a.key };
    if (a.needs === "area") body.area = field[a.key].trim();
    if (a.needs === "template") body.template = field[a.key].trim();
    if (confirmed) body.confirm = true;
    const r = await fetch(addonCheckoutUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const res = readCheckout(r?.status ?? 0, r ? await r.json().catch(() => null) : null);
    setBusy(null);
    if (res.kind === "url") return window.location.assign(res.url);
    if (res.kind === "confirm") return setAsking({ key: a.key, confirm: res.confirm });
    setAsking(null);
    if (res.kind === "joined") {
      setNote(`${a.name} is added to your plan.`);
      void load();
    } else setNote(res.line);
  };

  return (
    <div className="pi-back" onClick={onClose}>
      <section className="pi addons pop" role="dialog" aria-modal="true" aria-labelledby="ad-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="pi-close" onClick={onClose} aria-label="Close">×</button>
        <header className="pi-head">
          <PulseMark />
          <h2 id="ad-title">Add-ons</h2>
        </header>
        {data === undefined ? (
          <p className="pf-sub">Reading the add-ons…</p>
        ) : data === null ? (
          <p className="pf-sub">The add-ons could not be read just now. Try again in a minute.</p>
        ) : (
          <>
            {!data.canBuy && <p className="pf-sub">Add-ons come with ONE Complete.</p>}
            {data.mine.length > 0 && (
              <div className="ad-mine">
                <h3>Yours</h3>
                <ul>
                  {data.mine.map((m) => (
                    <li key={m.id}>
                      <b>{nameOf(data, m.key)}</b>
                      {m.area ? ` · ${m.area}` : ""}
                      {m.template ? ` · ${m.template}` : ""}
                      <small> {m.status === "active" ? "On" : m.status}</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="ad-cards">
              {data.addons.map((a) => (
                <article key={a.key} className="ad-card">
                  <h3>{a.name}</h3>
                  <p className="ad-price">{a.priceWords}</p>
                  <p className="pf-sub">{a.blurb}</p>
                  {data.canBuy && a.needs && (
                    <input
                      className="ad-field"
                      placeholder={a.needs === "area" ? "The area, e.g. Draper 84020" : "The template's name"}
                      aria-label={a.needs === "area" ? `${a.name}: area` : `${a.name}: template`}
                      value={field[a.key] ?? ""}
                      onChange={(e) => setField((f) => ({ ...f, [a.key]: e.target.value }))}
                    />
                  )}
                  {data.canBuy &&
                    (asking?.key === a.key ? (
                      <div className="tm-confirm">
                        <p>{asking.confirm}</p>
                        <div className="decide-btns">
                          <button type="button" className="chip-btn" disabled={busy === a.key} onClick={() => void buy(a, true)}>Yes, add it</button>
                          <button type="button" className="chip-btn" onClick={() => setAsking(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" className="chip-btn ad-buy" disabled={busy === a.key} onClick={() => void buy(a)}>
                        {busy === a.key ? "One moment…" : a.joinsPlan ? "Add to my plan" : "Buy"}
                      </button>
                    ))}
                </article>
              ))}
            </div>
          </>
        )}
        {note && <p className="pf-sub" role="status">{note}</p>}
      </section>
    </div>
  );
}
