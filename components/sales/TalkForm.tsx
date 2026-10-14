"use client";

import { useState } from "react";

// Teams and brokerages: a short form that goes to Parry. No price, no checkout.
export default function TalkForm({ cta }: { cta: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setState("sending");
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const r = await fetch("/api/team-inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (j.ok) return setState("sent");
      setError(j.error ?? "We could not send this just now. Please try again in a few minutes.");
    } catch {
      setError("We could not send this just now. Please try again in a few minutes.");
    }
    setState("idle");
  }

  if (state === "sent") return <p className="sp-talk-done" role="status">Thank you. Parry will be in touch within one business day.</p>;
  if (!open)
    return (
      <button type="button" className="sp-cta" onClick={() => setOpen(true)}>
        {cta}
      </button>
    );
  return (
    <form className="sp-talk" onSubmit={send}>
      <label>
        Your name
        <input name="name" autoComplete="name" required maxLength={120} />
      </label>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required maxLength={200} />
      </label>
      <label>
        Mobile (optional)
        <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
      </label>
      <label>
        Team or brokerage name
        <input name="team" autoComplete="organization" required maxLength={160} />
      </label>
      <label>
        Number of agents
        <input name="agents" type="number" min={1} inputMode="numeric" />
      </label>
      <input className="sp-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {error && <p className="sp-talk-error" role="alert">{error}</p>}
      <button className="sp-cta" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending..." : "Send to Parry"}
      </button>
      <small className="sp-fine">Nothing is charged. Parry replies himself.</small>
    </form>
  );
}
