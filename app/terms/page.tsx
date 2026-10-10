// Terms of service (Parry, 4 Oct). Google's sign-in setup asks for a terms
// link next to the privacy page. Plain words; prices and trial rules are the
// settled ones (vip50-ecosystem ECOSYSTEM.md §7, CHECKOUT.md §5a).

export const metadata = {
  title: "Terms | VIP-50 ONE",
  description: "The terms for using VIP-50 ONE: packages, trial, billing, cancelling, your data and acceptable use.",
};

const CONTACT_EMAIL = "info@VIP-50.com"; // Parry, 4 Oct
const UPDATED = "10 October 2026";

export default function Terms() {
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
        <h1>Terms</h1>
        <p className="legal-date">Last updated {UPDATED}</p>

        <p>
          These terms are the agreement between you and VIP-50 LLC for using VIP-50 ONE (ONE GO, ONE MOVE, Marquee, ONE Open, Showly and ONE Brain at vip50one.com). By
          creating an account or using ONE, you agree to them.
        </p>

        <h2>Who ONE is for</h2>
        <p>ONE is for real estate professionals aged 18 or over. You are responsible for your account, for keeping your password private, and for what is done with it.</p>

        <h2>Packages and price</h2>
        <ul>
          <li>ONE Relationship (ONE GO and ONE MOVE) and ONE Complete (all five products) are monthly or annual subscriptions. Annual is priced at ten months.</li>
          <li>Elite is a one-time coaching fee for 90 days, after which it continues as ONE Complete.</li>
          <li>The price you agree to at checkout is the price you pay. If we ever change the price of your plan, we tell you by email at least 30 days before it applies.</li>
          <li>Prices are charged in US dollars through Stripe, plus any tax that applies.</li>
        </ul>

        <h2>Free trial</h2>
        <p>
          ONE Relationship and ONE Complete start with a 7-day free trial, one per person. If you do not cancel before the trial ends, your card is charged for the plan you
          chose, and then every month or year until you cancel.
        </p>

        <h2>Cancelling</h2>
        <p>
          You can cancel at any time from your account. Your plan stays open to the end of the period you have paid for and does not renew. Your data stays available to
          export until then; after that you can ask us to delete it (see the privacy page).
        </p>

        <h2>Refunds</h2>
        <ul>
          <li>Monthly plans: no refunds for part of a month. When you cancel, your plan runs to the end of the month you have paid for. The 7-day free trial is there so you can try ONE first.</li>
          <li>Annual plans: a full refund if you ask within 30 days of your first annual payment. After that there is no refund, and your plan runs to the end of the year you paid for.</li>
          <li>Elite: a full refund if you ask within 7 days of paying and no coaching session has taken place yet. After that the Elite fee is not refundable, because the coaching time has been set aside for you.</li>
          <li>Billing mistakes on our side, such as a double charge or a charge after you cancelled, are always refunded in full.</li>
        </ul>
        <p>
          To ask for a refund, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Refunds go back to the card you paid with.
        </p>

        <h2>Your data</h2>
        <p>
          Your contacts, notes, listings and everything else you put into ONE are yours. You give us permission to store and process them only to run ONE for you, as the{" "}
          <a href="/privacy">privacy page</a> explains. You are responsible for having the right to keep and contact the people in your book.
        </p>

        <h2>Google</h2>
        <p>
          If you connect Google Contacts or Google Calendar, ONE uses them only as described on the{" "}
          <a href="/privacy#google">privacy page, under Google</a>, and follows the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the
          Limited Use requirements. You can disconnect either at any time in My Profile.
        </p>

        <h2>What ONE sends for you</h2>
        <p>
          Nothing is posted, texted or emailed in your name unless you approved that exact piece and sent it, or switched on automatic sending yourself for that campaign or
          plan. You are responsible for what you send, including following the rules on texting and emailing people (consent and opt-out) where you work.
        </p>

        <h2>Fair use</h2>
        <ul>
          <li>No spam, no harassment, nothing unlawful, and nothing that breaks real estate advertising rules.</li>
          <li>No attempts to break into, copy or overload ONE, or to reach other people&apos;s data.</li>
          <li>One account per person. Do not share your sign-in.</li>
        </ul>
        <p>We may suspend an account that breaks these rules, and we tell you why.</p>

        <h2>Suggestions from ONE</h2>
        <p>
          ONE&apos;s suggestions, scores and written drafts help you decide; they are not legal, tax or financial advice. Check anything important before you rely on it.
        </p>

        <h2>Availability and changes</h2>
        <p>
          We work to keep ONE running and your data safe, but we cannot promise it will never be interrupted. We improve ONE often; if a change takes away something you
          pay for, we tell you first.
        </p>

        <h2>Limits on liability</h2>
        <p>
          ONE is provided as it is. As far as the law allows, VIP-50 LLC is not liable for lost business, lost profits or indirect losses, and our total liability to you is
          limited to what you paid us in the 12 months before the claim.
        </p>

        <h2>Utah law</h2>
        <p>
          VIP-50 LLC is a Utah company. These terms are governed by the laws of the State of Utah, and any dispute is settled in the state or federal courts located in
          Utah, unless the law where you live gives you the right to bring it there.
        </p>

        <h2>Changes to these terms</h2>
        <p>If we change these terms we update the date at the top, and we email you about important changes before they apply.</p>

        <h2>Questions</h2>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </main>

      <footer className="sp-foot">
        <span>© VIP-50 LLC</span>
        <a href="/">Home</a>
        <a href="/privacy">Privacy</a>
        <a href="/login">Sign in</a>
      </footer>
    </div>
  );
}
