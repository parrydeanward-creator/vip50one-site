// The privacy page (Parry, 4 Oct). Google asks for one before agents can
// connect Google Contacts to bring their contacts' photos into ONE. Plain
// words; what each product really does with data, checked against the code.

export const metadata = {
  title: "Privacy | VIP-50 ONE",
  description: "What VIP-50 ONE collects, why, who it is shared with, and how to have it deleted.",
};

// Who to write to about privacy. Parry confirms the address before this page goes live.
const PRIVACY_EMAIL = "privacy@vip50one.com";
const UPDATED = "4 October 2026";

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
          <li>We read names, email addresses, phone numbers and photos, and only to make that match.</li>
          <li>We never change or delete anything in your Google account.</li>
          <li>We do not sell Google data, use it for advertising, or let people read it.</li>
          <li>You can disconnect Google at any time from My Profile, which removes our access. You can also remove it in your Google account settings.</li>
        </ul>
        <p>
          VIP-50 ONE&apos;s use and transfer of information received from Google APIs follows the{" "}
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
          <li>Google: maps, addresses and, if you connect it, your contacts&apos; photos.</li>
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
        <a href="/login">Sign in</a>
      </footer>
    </div>
  );
}
