"use client";

import { useCallback, useEffect, useState } from "react";
import { monthWords } from "@/lib/marketPulse.ts";
import {
  DEFAULT_DAY,
  changeBody,
  contactReportsUrl,
  demoContactReports,
  homeReportUrl,
  lastSentLine,
  ordinal,
  parseDay,
  readContactReports,
  rprBody,
  rprLink,
  rprMailto,
  rprMonth,
  runningLine,
  runningReport,
  startBody,
  startedByWords,
  stopReportUrl,
  stoppedReports,
  stoppedWords,
  withChanged,
  withRprSent,
  withStarted,
  withStopped,
  VALUE_RULE,
  dollars,
  parseValue,
  valueBody,
  valueLine,
  withValue,
  type ContactReports,
  AREA_WORDS,
  CARD_TITLE,
  CREDIT_LINE,
  FEED_LINE,
  FEED_LIVE,
} from "@/lib/homeReport.ts";

// The Monthly Market Report on a person (HOME-REPORT.md §4.1, §6, v0.4 box 1; Parry 16 Oct: "1 yes"). One switch on
// every contact, writing the same MASTER row as Classic's: On starts it for the contact's own home (the area is their
// neighbourhood, never a city or ZIP), Off stops it. ONE MOVE fills and sends it every month until the agent or the
// contact stops it. Before the MLS feed the agent may paste that month's RPR link, open it in their own email, and tap
// "I sent it". Same routes as ONE MOVE Classic's card. In the demo it runs on example data and nothing is called.

const mtnToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());

export default function HomeReportSection({ contactId, first, demo = false, onChanged }: { contactId: string; first: string; demo?: boolean; onChanged?: () => void }) {
  const [s, setS] = useState<ContactReports | null>(null);
  const [form, setForm] = useState<{ address: string; day: string; note: string } | null>(null);
  const [changing, setChanging] = useState(false);
  const [rpr, setRpr] = useState("");
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const name = first.trim() || "them";

  const load = useCallback(async () => {
    if (demo) return setS(demoContactReports(contactId, mtnToday()));
    const j = await fetch(contactReportsUrl(contactId), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    setS(j ? readContactReports(j) : null);
  }, [contactId, demo]);
  useEffect(() => {
    setS(null);
    setForm(null);
    setChanging(false);
    setRpr("");
    setValue(null);
    setMsg(null);
    void load();
  }, [load]);

  /** One write to ONE MOVE; in the demo `local` is the whole change. True when it went through. */
  const write = async (method: "POST" | "DELETE", url: string, body: object | null, local: (c: ContactReports) => ContactReports, done: string) => {
    setBusy(true);
    setMsg(null);
    if (!demo) {
      const r = await fetch(url, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
      const j = r ? await r.json().catch(() => null) : null;
      if (!r || !r.ok) {
        setBusy(false);
        setMsg({ ok: false, text: (j && typeof j.error === "string" && j.error) || "That did not save. Nothing was changed." });
        return false;
      }
    }
    setS((c) => (c ? local(c) : c));
    setBusy(false);
    setMsg({ ok: true, text: done });
    if (!demo) void load();
    onChanged?.();
    return true;
  };

  if (!s) return null;
  const live = runningReport(s);
  const past = stoppedReports(s);
  const today = mtnToday();

  // The setup form, the address filled in from the contact (§4.1); changes start from it.
  const setup = form ?? { address: s.suggestedAddress ?? "", day: String(DEFAULT_DAY), note: "" };
  const start = async () => {
    const day = parseDay(setup.day);
    if (day == null) return setMsg({ ok: false, text: "Pick a day from 1 to 28." });
    if (setup.address.trim().length < 5) return setMsg({ ok: false, text: "Which home? Add the address." });
    const ok = await write("POST", homeReportUrl, startBody(contactId, setup.address, day, setup.note),
      (c) => withStarted(c, { id: `demo-${Date.now()}`, address: setup.address.trim(), sendDay: day, note: setup.note.trim() || null }),
      `Started. ${name} gets it on the ${ordinal(day)} of each month.`);
    if (ok) setForm(null);
  };
  const change = async () => {
    if (!form || !live) return;
    const day = parseDay(form.day);
    if (day == null) return setMsg({ ok: false, text: "Pick a day from 1 to 28." });
    const ok = await write("POST", homeReportUrl, changeBody(live.id, day, form.note), (c) => withChanged(c, live.id, day, form.note.trim() || null), "Saved.");
    if (ok) {
      setForm(null);
      setChanging(false);
    }
  };
  const stop = async () => {
    if (!live || !window.confirm(`Turn off ${name}'s Market Report? No more months will be sent.`)) return;
    await write("DELETE", stopReportUrl(live.id), null, (c) => withStopped(c, live.id, new Date().toISOString()), "Stopped. The months already sent stay on the record.");
  };
  const month = live ? rprMonth(live, today) : null;
  const link = rprLink(rpr);
  const sentIt = async () => {
    if (!live || !month) return;
    if (!link) return setMsg({ ok: false, text: "Paste the https link to the RPR report." });
    const ok = await write("POST", homeReportUrl, rprBody(live.id, link), (c) => withRprSent(c, live.id, month, new Date().toISOString()), `${monthWords(month)} recorded. ${name}'s market box is ticked.`);
    if (ok) setRpr("");
  };

  // The agent's own view of the value (§3.7): never estimated by ONE; printed only for three months after set or confirmed.
  const saveValue = async (amount: number | "") => {
    if (!live) return;
    const ok = await write("POST", homeReportUrl, valueBody(live.id, amount), (c) => withValue(c, live.id, amount === "" ? null : amount, today),
      amount === "" ? "Removed. The report shows no value." : `Saved: ${dollars(amount)}, as of today.`);
    if (ok) setValue(null);
  };
  const typed = value == null ? null : parseValue(value);

  // The switch: On starts the report on the 5th for the contact's own home; Off stops it (asks first).
  const canStart = s.canEmail && setup.address.trim().length >= 5;
  const flip = () => {
    if (busy) return;
    if (live) return void stop();
    if (!s.canEmail) return setMsg({ ok: false, text: `Add an email for ${name} first.` });
    if (setup.address.trim().length < 5) {
      if (!form) setForm(setup);
      return setMsg({ ok: false, text: "Which home? Add their address." });
    }
    void start();
  };

  return (
    <div className="cc-tasks hr-card" aria-label={`${CARD_TITLE} for ${name}`}>
      <div className="hr-head">
        <h2>{CARD_TITLE}</h2>
        <button
          type="button"
          role="switch"
          className={`hr-switch${live ? " on" : ""}`}
          aria-checked={!!live}
          aria-label={`${CARD_TITLE} for ${name}`}
          disabled={busy || (!live && !s.canEmail)}
          onClick={flip}
        >
          <i aria-hidden="true" />
          <span>{live ? "On" : "Off"}</span>
        </button>
      </div>
      <p className="hr-sub">
        Area: {AREA_WORDS}
        {live ? ` (${live.address})` : setup.address.trim() ? ` (${setup.address.trim()})` : ""}
      </p>
      {FEED_LIVE ? null : <p className="hr-sub">{FEED_LINE}</p>}
      <p className="hr-sub">{CREDIT_LINE}</p>
      {live ? (
        <>
          <p className="hr-line">{runningLine(live)}</p>
          <p className="hr-sub">{lastSentLine(live)} · {startedByWords(live.startedBy)}</p>
          {month ? (
            <div className="cc-perm-form">
              <label>
                {monthWords(month)} RPR report link (optional, until the feed is live)
                <input type="text" inputMode="url" value={rpr} placeholder="https://" maxLength={2000} onChange={(e) => setRpr(e.target.value)} />
              </label>
              <div className="cc-perm-acts">
                {link ? (
                  <a className="chip-btn" href={rprMailto(s.email, name, month, link)}>Open in my email</a>
                ) : (
                  <span className="chip-btn hr-off" aria-disabled="true">Open in my email</span>
                )}
                <button type="button" className="chip-btn primary" disabled={busy || !link} onClick={() => void sentIt()}>I sent it</button>
              </div>
            </div>
          ) : null}
          <div className="cc-perm-form">
            <p className="hr-sub">{valueLine(live, today)}</p>
            {value != null ? (
              <>
                <label>
                  Your view of the home&apos;s value
                  <input type="text" inputMode="decimal" value={value} placeholder="$650,000" maxLength={14} onChange={(e) => setValue(e.target.value)} />
                </label>
                <div className="cc-perm-acts">
                  <button type="button" className="chip-btn primary" disabled={busy || typed == null} onClick={() => typed != null && void saveValue(typed)}>Save</button>
                  <button type="button" className="chip-btn" disabled={busy} onClick={() => setValue(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <div className="cc-perm-acts">
                <button type="button" className="chip-btn" disabled={busy} onClick={() => setValue(live.agentValue ? String(live.agentValue) : "")}>{live.agentValue ? "Change the value" : "Set your view of the value"}</button>
                {live.agentValue ? <button type="button" className="chip-btn" disabled={busy} onClick={() => void saveValue(live.agentValue!)}>Still right</button> : null}
                {live.agentValue ? <button type="button" className="chip-btn" disabled={busy} onClick={() => void saveValue("")}>Remove</button> : null}
              </div>
            )}
            <small className="hr-sub">{VALUE_RULE}</small>
          </div>
          {changing && form ? (
            <div className="cc-perm-form">
              <label>Day of the month (1 to 28)<input type="text" inputMode="numeric" value={form.day} maxLength={2} onChange={(e) => setForm({ ...form, day: e.target.value })} /></label>
              <label>Your note (optional)<input type="text" value={form.note} maxLength={1500} placeholder="Leave empty for the standard note" onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
              <div className="cc-perm-acts">
                <button type="button" className="chip-btn primary" disabled={busy} onClick={() => void change()}>Save</button>
                <button type="button" className="chip-btn" disabled={busy} onClick={() => { setChanging(false); setForm(null); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="cc-perm-acts">
              <button type="button" className="chip-btn" disabled={busy} onClick={() => { setChanging(true); setForm({ address: live.address, day: String(live.sendDay), note: live.note ?? "" }); }}>Change day or note</button>
            </div>
          )}
        </>
      ) : !s.canEmail ? (
        <p className="hr-sub">Add an email for {name} first.</p>
      ) : form ? (
        <div className="cc-perm-form">
          <label>The home<input type="text" value={setup.address} maxLength={300} placeholder="Street, city, state" onChange={(e) => setForm({ ...setup, address: e.target.value })} /></label>
          <label>Day of the month (1 to 28)<input type="text" inputMode="numeric" value={setup.day} maxLength={2} onChange={(e) => setForm({ ...setup, day: e.target.value })} /></label>
          <small className="hr-sub">The 5th is best: last month&apos;s figures have settled.</small>
          <label>Your note (optional)<input type="text" value={setup.note} maxLength={1500} placeholder="Leave empty for the standard note" onChange={(e) => setForm({ ...setup, note: e.target.value })} /></label>
          <div className="cc-perm-acts">
            <button type="button" className="chip-btn primary" disabled={busy || !canStart} onClick={() => void start()}>Turn on</button>
            <button type="button" className="chip-btn" disabled={busy} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="cc-perm-acts">
          <p className="hr-line">Off. Turn it on to send {name} a monthly report on their own neighbourhood, on the 5th.</p>
          <button type="button" className="chip-btn" disabled={busy} onClick={() => setForm(setup)}>Pick the day, home or note</button>
        </div>
      )}
      {past.length > 0 && <p className="cc-source">Stopped before: {past.map(stoppedWords).join("; ")}</p>}
      {msg ? <p className={msg.ok ? "cc-done" : "cc-err"} role="status">{msg.text}</p> : null}
      {demo ? <p className="cc-source">Example agent. Nothing is sent.</p> : null}
    </div>
  );
}
