// Accessibility statement (Scout 40, research/scout/2026-10-10-queue-site-accessibility.md): the standard we build to,
// how we check, and how to reach a person when something gets in the way.

export const metadata = {
  title: "Accessibility | VIP-50 ONE",
  description: "How VIP-50 ONE works for everyone: the standard we build to, how we check it, and how to tell us when something gets in the way.",
};

const CONTACT_EMAIL = "info@VIP-50.com";
const UPDATED = "10 October 2026";

export default function Accessibility() {
  return (
    <div className="sp">
      <header className="sp-bar">
        <a className="brand" href="/" aria-label="VIP-50 ONE, home" style={{ textDecoration: "none" }}>
          VIP-50 <b>ONE</b>
        </a>
        <nav className="sp-nav" aria-label="Sections" />
        <a className="sp-signin" href="/login">
          Sign in
        </a>
      </header>

      <main className="legal">
        <h1>Accessibility</h1>
        <p className="legal-date">Last updated {UPDATED}</p>

        <p>We want everyone to be able to use VIP-50 ONE, including people who use a screen reader, a keyboard instead of a mouse, larger text or higher contrast.</p>

        <h2>The standard we build to</h2>
        <p>We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA on this site and in ONE.</p>

        <h2>How we check</h2>
        <ul>
          <li>We check these pages with an automated accessibility test (axe, against WCAG 2.1 AA) and fix what it finds.</li>
          <li>Buttons and links can be reached and used with the keyboard, and every picture that carries meaning has a text description.</li>
          <li>Some parts of ONE draw your business as a moving map. Everything on the map is also available as buttons and lists that a screen reader can read.</li>
        </ul>

        <h2>If something gets in your way</h2>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and tell us the page and what happened. A person will answer, and we will help you do what you came to
          do while we fix it.
        </p>
      </main>

      <footer className="sp-foot">
        <span>© VIP-50 LLC</span>
        <a href="/">Home</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/login">Sign in</a>
      </footer>
    </div>
  );
}
