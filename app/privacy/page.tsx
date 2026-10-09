// The privacy page (Parry, 4 Oct). Google asks for one before agents can
// connect Google Contacts to bring their contacts' photos into ONE. Plain
// words; what each product really does with data, checked against the code.

export const metadata = {
  title: "Privacy | VIP-50 ONE",
  description: "What VIP-50 ONE collects, why, who it is shared with, and how to have it deleted.",
};

// Who to write to about privacy (Parry, 4 Oct).
const PRIVACY_EMAIL = "info@VIP-50.com"; // Parry, 4 Oct
const UPDATED = "9 October 2026";

export default function Privacy() {
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
        <h1>Privacy</h1>
        <p className="legal-date">Last updated {UPDATED}</p>

        <p>
          VIP-50 ONE is run by VIP-50 LLC. It is made up of ONE GO, ONE MOVE, Marquee, ONE Open and Showly, joined by ONE Brain at vip50one.com. This page explains what we
          collect, why, who sees it, and how to have it deleted.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>Your account: your name, email address, phone number, brokerage and the package you chose.</li>
          <li>Payments: handled by Stripe. We never see or store your card number.</li>
          <li>Your business: the contacts, notes, tasks, touches, goals, listings and open houses you add or log in ONE.</li>
          <li>Photos: your own profile photo, listing photos you add, and your contacts&apos; photos, only when you choose to bring them in from your phone or from Google.</li>
          <li>Open house and tour visitors: what visitors type into the sign-in forms you share, so you can follow up with them.</li>
        </ul>

        <h2>Your contacts</h2>
        <p>
          The people in your book belong to your business, not to us. We keep their details only to run ONE for you. We never contact them on our own, never sell their
          details, and never add them to anyone else&apos;s list. A text or email goes to one of your contacts only when you send it or when you have switched on automatic
          sending for that plan yourself.
        </p>

        <h2>Google</h2>
        <p>If you choose to connect your Google account, ONE asks Google for read-only access to your Google Contacts. We use it for one thing: to match the people in your
          Google Contacts with your contacts in ONE and copy their photos across, so you see faces instead of initials.</p>
        <ul>
          <li>What we read: your Google contacts&apos; email addresses, phone numbers and photos, and only when you press Add photos from Google, to find the matching person in ONE.</li>
          <li>What we keep: only the photos we copy, saved in private storage on your matching contacts in ONE (and only for contacts that had no photo yet), plus the access key Google gives us. Email addresses and phone numbers read from Google are used for the match and not stored.</li>
          <li>We never change or delete anything in your Google account.</li>
          <li>We do not sell or share Google data, use it for advertising, or use it to train AI models. No one at VIP-50 reads it unless you ask us to for support, or the law requires it.</li>
          <li>Disconnecting Google in My Profile cancels our access at Google and deletes the access key straight away. You can also remove ONE in your Google account settings. Photos already copied stay on your contacts until you delete them, or email us to have them removed.</li>
        </ul>
        <h3>Google Calendar (only if you connect it)</h3>
        <p>If you connect Google Calendar in My Profile, ONE uses it to plan your day around your real schedule.</p>
        <ul>
          <li>What we read: events on the calendars you choose to sync (time, title, place and notes). For any other calendar you choose, we read only when you are busy, not what the event is, unless you allow titles.</li>
          <li>What we write: only events you create or approve in ONE, such as a planned call block, and only on your own calendar. We never write to a shared, team or office calendar, never invite anyone, and never send anything to your clients from your calendar.</li>
          <li>What we change or delete: only events ONE created, or events you change from inside ONE. Fixed appointments are never moved.</li>
          <li>What we keep: a copy of synced events so your plan works, kept while Google Calendar is connected. Busy-only calendars are kept as busy times only.</li>
          <li>Who sees it: you, and your coach only if you share your plan with them. Never other agents.</li>
          <li>Pulse: to build your plan, Pulse (our AI, provided by Anthropic) reads your synced events when it plans. Anthropic does not use them to train its models.</li>
          <li>We do not sell your calendar data, use it for advertising, or use it to train AI models. No one at VIP-50 reads it unless you ask us to for support, or the law requires it.</li>
          <li>Disconnect: turn it off in My Profile, or remove ONE at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>. We stop reading at once and delete the copied events within 30 days.</li>
        </ul>
        <p>
          VIP-50 ONE&apos;s use and transfer of information received from Google APIs (Google Contacts and Google Calendar) follows the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements.
        </p>

        <h2>Your phone&apos;s contacts</h2>
        <p>ONE GO reads your phone&apos;s contacts only when you tap Import or Add photos from your phone, and only to bring in the people and photos you pick.</p>

        <h2>Who we share it with</h2>
        <p>Only the companies that run ONE for us, and only what each needs:</p>
        <ul>
          <li>Supabase: stores your account and data.</li>
          <li>Vercel: hosts the websites.</li>
          <li>Stripe: takes payments.</li>
          <li>Twilio: sends the texts you send.</li>
          <li>Resend: sends the emails you send.</li>
          <li>Google: maps, addresses and, if you connect them, your contacts&apos; photos and your calendar.</li>
          <li>Meta (Facebook and Instagram): publishes the Marquee posts you approve, to the accounts you connect.</li>
          <li>AI providers (Anthropic and OpenAI): write ONE&apos;s suggestions and answers. They receive only the text needed for the answer, under terms that do not let them train their models on it.</li>
        </ul>
        <p>We do not sell personal information.</p>

        <h2>Keeping it safe</h2>
        <p>Your data is private to your account. It travels encrypted, photos are kept in private storage, and secret keys never reach your browser.</p>

        <h2>Deleting your data</h2>
        <p>
          You can delete contacts and photos in ONE yourself at any time. To have your whole account and everything in it deleted, email{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. We confirm within 30 days. Records we must keep by law, such as payment records, are kept only as long as
          the law requires.
        </p>

        <h2>Children</h2>
        <p>ONE is for real estate professionals and is not meant for anyone under 18.</p>

        <h2>Changes</h2>
        <p>If we change how we use your data, we update this page and the date at the top. Big changes are also emailed to you.</p>

        <h2>Questions</h2>
        <p>
          Email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
        </p>
      </main>

      <footer className="sp-foot">
        <span>© VIP-50 LLC</span>
        <a href="/">Home</a>
        <a href="/terms">Terms</a>
        <a href="/login">Sign in</a>
      </footer>
    </div>
  );
}
