"use client";

import { useState } from "react";

// A password box with a show/hide eye (Parry, 2 Oct: on every sign-in and
// sign-up password field, as ONE GO and ONE MOVE now have).
export default function PasswordField({ id = "password", name = "password", autoComplete = "current-password" }: { id?: string; name?: string; autoComplete?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="pw-wrap">
      <input id={id} name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} required />
      <button type="button" className="pw-eye" aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown} onClick={() => setShown((v) => !v)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {shown && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </span>
  );
}
