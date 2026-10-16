"use client";

import { useCallback, useEffect, useId, useState, type KeyboardEvent } from "react";
import {
  addArea,
  areasBody,
  areasChanged,
  areasError,
  areasUrl,
  countLine,
  demoAreas,
  onList,
  readAreas,
  removeArea,
  savedAreas,
  suggest,
  type AreasState,
} from "@/lib/serviceAreas.ts";

// PROFILE.md §2 v1.9 "Where I work" in the Brain's My Profile, the same card as Classic's (rule 8: both profiles, two
// columns). Names come only from ONE MOVE's list of Utah cities and towns; up to 12; nothing is saved before Save. In
// the demo it runs on example data and nothing is called.

export default function WhereIWorkSection({ demo = false }: { demo?: boolean }) {
  const [s, setS] = useState<AreasState | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const listId = useId();

  const load = useCallback(async () => {
    if (demo) {
      const d = demoAreas();
      setS(d);
      setPicked(d.areas);
      return;
    }
    const j = await fetch(areasUrl, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    const next = readAreas(j);
    setS(next);
    if (next) setPicked(next.areas);
  }, [demo]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!s) return null;
  const full = picked.length >= s.max;
  const options = full ? [] : suggest(s.list, typed, picked);
  const dirty = areasChanged(s.areas, picked);

  const add = (name: string) => {
    setPicked((p) => addArea(p, name, s.max));
    setTyped("");
    setActive(0);
    setMsg(null);
  };
  const remove = (name: string) => {
    setPicked((p) => removeArea(p, name));
    setMsg(null);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && options.length) {
      e.preventDefault();
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp" && options.length) {
      e.preventDefault();
      setActive((a) => (a - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const name = options[active] ?? options[0] ?? onList(s.list, typed);
      if (name && !picked.some((p) => p.toLowerCase() === name.toLowerCase())) add(name);
      else if (typed.trim()) setMsg({ ok: false, text: "Pick a city or town from the list." });
    } else if (e.key === "Escape") {
      setTyped("");
    }
  };

  const save = async () => {
    if (busy || !dirty) return;
    const body = areasBody(picked, s.max);
    setBusy(true);
    setMsg(null);
    try {
      let next = body.areas;
      if (!demo) {
        const r = await fetch(areasUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
        const j = r ? await r.json().catch(() => null) : null;
        if (!r || !r.ok || (j && j.ok === false)) throw new Error(areasError(j));
        next = savedAreas(j, body.areas);
      }
      setS({ ...s, areas: next });
      setPicked(next);
      setMsg({ ok: true, text: demo ? "Example agent. Nothing is saved." : "Saved. Your agent page and ad drafts use these now." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "That didn't save. Nothing was changed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pf-card wiw" aria-label="Where I work">
      <h2>Where I work</h2>
      <small className="pf-sub">The cities you serve, not where you live. Up to 12. Shown on your agent page and used first in your ad drafts.</small>
      {demo ? <small className="pf-sub warn">Example agent. Nothing is saved.</small> : null}
      {picked.length ? (
        <ul className="wiw-chips" aria-label="Cities you serve">
          {picked.map((name) => (
            <li key={name}>
              {name}
              <button type="button" aria-label={`Remove ${name}`} disabled={busy} onClick={() => remove(name)}>×</button>
            </li>
          ))}
        </ul>
      ) : (
        <small className="pf-sub">None picked yet.</small>
      )}
      <label className="pf-field wiw-pick">
        <span>Add a city or town</span>
        <input
          value={typed}
          disabled={full || busy}
          placeholder={full ? "" : "Start typing, e.g. Draper"}
          role="combobox"
          aria-expanded={options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={options.length ? `${listId}-${Math.min(active, options.length - 1)}` : undefined}
          autoComplete="off"
          onChange={(e) => { setTyped(e.target.value); setActive(0); setMsg(null); }}
          onKeyDown={onKey}
        />
        {full ? <small>That is the most: 12.</small> : null}
      </label>
      {options.length ? (
        <ul className="wiw-opts" id={listId} role="listbox" aria-label="Matching cities and towns">
          {options.map((name, i) => (
            <li key={name} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => add(name)}>{name}</button>
            </li>
          ))}
        </ul>
      ) : typed.trim() && !full ? (
        <small className="pf-sub">No Utah city or town matches that.</small>
      ) : null}
      <div className="pf-btns">
        <small className="pf-sub wiw-count">{countLine(picked.length, s.max)}</small>
        <button type="button" className="chip-btn primary" disabled={busy || !dirty} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button>
        {dirty ? <button type="button" className="chip-btn" disabled={busy} onClick={() => { setPicked(s.areas); setMsg(null); }}>Undo changes</button> : null}
      </div>
      {msg ? <small className={`pf-sub${msg.ok ? "" : " warn"}`} role="status">{msg.text}</small> : null}
    </section>
  );
}
