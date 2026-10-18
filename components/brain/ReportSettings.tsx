"use client";

import { useEffect, useRef, useState } from "react";
import {
  OPTIONAL_SECTIONS,
  POSTCARD_LABEL,
  SAVING_SOON,
  SETTINGS_FIXED_NOTE,
  VIDEO_HINT,
  defaultSettings,
  readSettings,
  settingsUrl,
  videoUrl,
  type ReportSettings as Settings,
} from "@/lib/homeReport.ts";
import "@/app/market-report.css";

// "Your report settings" on the Market Reports page (HOME-REPORT §3a): this month's video, which optional sections
// go in, and the quarterly postcard. In example mode it is local state only. Live, it reads and saves through ONE
// MOVE's /api/brain/home-report/settings and /video (the same credentialed calls as the rest of this page); until
// those answer, a live agent does not see the card at all (Parry, 18 Oct: a card that cannot save looked broken while
// he set up a report); if a save fails later it says "Saving opens soon" and keeps what the agent chose on screen.

export default function ReportSettings({ demo }: { demo: boolean }) {
  const [s, setS] = useState<Settings>(defaultSettings);
  const [soon, setSoon] = useState(false);
  const [ready, setReady] = useState(demo);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (demo) return;
    let off = false;
    fetch(settingsUrl, { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        if (off) return;
        if (!r.ok) return;
        const got = readSettings(await r.json().catch(() => null));
        if (got) { setS(got); setReady(true); }
      })
      .catch(() => {});
    return () => { off = true; };
  }, [demo]);

  const save = async (next: Settings) => {
    setS(next);
    if (demo) return;
    try {
      const r = await fetch(settingsUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      setSoon(!r.ok);
    } catch {
      setSoon(true);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (demo) return setMsg("Example only. Nothing was uploaded.");
    const fd = new FormData();
    fd.append("video", file);
    try {
      const r = await fetch(videoUrl, { method: "POST", credentials: "include", body: fd });
      if (r.ok) { setSoon(false); setMsg("Saved as this month's video."); }
      else setSoon(true);
    } catch {
      setSoon(true);
    }
  };

  const pick = (record: boolean) => {
    const el = fileRef.current;
    if (!el) return;
    if (record) el.setAttribute("capture", "user");
    else el.removeAttribute("capture");
    el.click();
  };

  if (!ready) return null;

  return (
    <section className="mrs" aria-label="Your report settings">
      <h2>Your report settings</h2>
      <div>
        <h3>This month&apos;s video</h3>
        <div className="mrs-btns">
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => void upload(e.target.files?.[0])} />
          <button type="button" className="chip-btn" onClick={() => pick(true)}>Record</button>
          <button type="button" className="chip-btn" onClick={() => pick(false)}>Upload</button>
        </div>
        <p>{VIDEO_HINT}</p>
        {msg ? <p role="status">{msg}</p> : null}
      </div>
      <div>
        <h3>Sections</h3>
        <ul className="mrs-list">
          {OPTIONAL_SECTIONS.map((o) => (
            <li key={o.key}>
              <label>
                <input type="checkbox" checked={s.sections[o.key]} onChange={(e) => void save({ ...s, sections: { ...s.sections, [o.key]: e.target.checked } })} />
                {o.label}
              </label>
            </li>
          ))}
        </ul>
        <p>{SETTINGS_FIXED_NOTE}</p>
      </div>
      <div>
        <h3>Mailed postcard</h3>
        <label className="mrs-post">
          <input type="checkbox" role="switch" checked={s.postcard} onChange={(e) => void save({ ...s, postcard: e.target.checked })} />
          {POSTCARD_LABEL}
        </label>
      </div>
      {soon ? <p className="mrs-saving" role="status">{SAVING_SOON}</p> : null}
    </section>
  );
}
