import InlineFilm from "@/components/sales/InlineFilm.tsx";
import { FAQ, JOIN, PACKAGES, PRODUCTS, joinFor, shownTestimonials } from "@/lib/sales.ts";

// vip50one.com (Parry, 29 Sep): visitors see the sales page; signed-in
// clients go straight to their dashboard, ONE Brain (middleware.ts does that,
// so this page never waits on MASTER and is built once, not per visit).
export const metadata = {
  title: "VIP-50 ONE | Your whole real estate business, one place",
  description: "ONE GO, ONE MOVE, Marquee, ONE Open and Showly, connected by ONE Brain. The VIP-50 referral method, run every day.",
};

const ACCENT: Record<string, string> = { go: "#f2a93b", move: "#2fb7a3", marquee: "#4f7fe0", open: "#f06a5a", showly: "#9b6ce0" };

export default function Home() {
  const stories = shownTestimonials();

  return (
    <div className="sp">
      <header className="sp-bar">
        <a className="brand" href="/" aria-label="VIP-50 ONE, home" style={{ textDecoration: "none" }}>
          VIP-50 <b>ONE</b>
        </a>
        <nav className="sp-nav" aria-label="Sections">
          <a href="#products">Products</a>
          <a href="#packages">Packages</a>
          {stories.length > 0 && <a href="#stories">Stories</a>}
          <a href="#faq">FAQ</a>
        </nav>
        <a className="sp-signin" href="/login">
          Sign in
        </a>
      </header>

      <main>
        <section className="sp-hero">
          <div className="sp-hero-copy">
            <p className="sp-eyebrow">For agents tired of starting every month from zero</p>
            <h1>
              Your whole real estate business. <span>ONE</span> place.
            </h1>
            <p className="sp-lead">
              If you have a sphere, you have a business. ONE turns the people you already know into referrals: it tells you who to reach today and why, keeps every
              promise you made, and markets your listings, open houses and buyer tours. Five tools, connected, with ONE Brain watching over all of it.
            </p>
            <div className="sp-cta-row">
              <a className="sp-cta" href={JOIN}>
                Start your 7-day free trial
              </a>
              <a className="sp-ghost" href="#film">
                ▶ Watch ONE work (2 min)
              </a>
            </div>
            <p className="sp-micro">Founding pricing for the first 50 members · Cancel any time in the trial</p>
          </div>
          <figure className="sp-hero-shot">
            <img src="/home/brain.jpg" alt="ONE Brain: your business as a map, with ONE at the centre and your five products around it" />
          </figure>
        </section>

        <section className="sp-problem">
          <h2>
            Most agents don't have a lead problem.
            <br />
            <span>They have a system problem.</span>
          </h2>
          <div className="sp-steps">
            {[
              ["01", "Pick your 50 people", "The VIP-50: the people who already know, like and trust you."],
              ["02", "Touch them every month", "A call, a video text, a social touch, the newsletter and a mixer invite. Plus a face-to-face, a handwritten note and a drop-by each quarter."],
              ["03", "Watch the referrals come in", "Fifty relationships, touched on purpose, every month. ONE tells you exactly what to do and when."],
            ].map(([n, t, d]) => (
              <div key={n} className="sp-step">
                <b>{n}</b>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sp-brain">
          <p className="sp-eyebrow">ONE Brain</p>
          <h2>Open ONE. Do the work. It's that simple.</h2>
          <p>
            Sign in and your business is one living map: ONE at the centre, your five products around it. ONE Brain plans your day in order, from the calls that
            matter most to the approvals due before posting time. It ticks things off as you do them, and at day's end it tells you what got done and what moves to
            tomorrow. Ask it anything about your business.
          </p>
          <figure id="film" className="sp-film">
            <video controls preload="none" playsInline poster="/home/one-film.jpg">
              <source src="/home/one-film.mp4" type="video/mp4" />
              <track kind="captions" src="/home/one-film.vtt" srcLang="en" label="English" />
            </video>
            <figcaption>Watch ONE work: ONE Brain and all five products, in under two minutes.</figcaption>
          </figure>
        </section>

        <section id="products" className="sp-products">
          <p className="sp-eyebrow center">Five tools, one business</p>
          <h2 className="center">Everything an agent runs, connected</h2>
          {PRODUCTS.map((p, k) => (
            <article key={p.id} className={`sp-product ${k % 2 ? "flip" : ""}`} style={{ ["--acc" as string]: ACCENT[p.id] }}>
              <figure className={`sp-shot ${p.device}`}>
                <img src={p.image} alt={`${p.name}: ${p.line}`} loading="lazy" />
              </figure>
              <div className="sp-pcopy">
                <p className="sp-where">{p.where}</p>
                <h3>{p.name}</h3>
                <p className="sp-pline">{p.line}</p>
                <ul>
                  {p.points.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <p className="sp-pmeta">
                  <span>{p.in.length === 2 ? "In ONE Relationship and ONE Complete" : "In ONE Complete"}</span>
                </p>
                {p.film && <InlineFilm film={p.film} name={p.name} />}
              </div>
            </article>
          ))}
        </section>

        {stories.length > 0 && (
          <section id="stories" className="sp-stories">
            <p className="sp-eyebrow center">Real agents</p>
            <h2 className="center">In their own words</h2>
            <div className="sp-story-grid">
              {stories.map((t) => (
                <figure key={t.name} className={`sp-story ${t.video ? "video" : ""}`}>
                  {t.video && (
                    <video controls preload="none" poster={t.video.poster} playsInline>
                      <source src={t.video.src} type="video/mp4" />
                      {t.video.captions && <track kind="captions" src={t.video.captions} srcLang="en" label="English" default />}
                    </video>
                  )}
                  {t.quote && <blockquote>“{t.quote}”</blockquote>}
                  <figcaption>
                    {t.photo ? <img className="sp-face" src={t.photo} alt="" loading="lazy" /> : <span className="sp-face sp-initials">{t.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2)}</span>}
                    <span className="sp-who">
                      <b>{t.name}</b>
                      {t.role && <span>{t.role}</span>}
                      {t.tie && <small>{t.tie}</small>}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <section id="packages" className="sp-packages">
          <p className="sp-eyebrow center">Packages</p>
          <h2 className="center">Pick your package</h2>
          <p className="sp-sub center">Founding pricing for the first 50 members, for as long as you stay. Web signup only.</p>
          <div className="sp-pack-grid">
            {PACKAGES.map((p) => (
              <article key={p.id} className={`sp-pack ${p.featured ? "featured" : ""}`}>
                {p.featured && <span className="sp-badge">Everything</span>}
                <h3>{p.name}</h3>
                <p className="sp-tag">{p.tag}</p>
                <p className="sp-price">
                  <b>{p.founding}</b>
                  {p.id !== "elite" && <span>/month founding</span>}
                </p>
                {p.list && <p className="sp-list">List {p.list}/month</p>}
                <p className="sp-annual">{p.annual}</p>
                <ul>
                  {p.includes.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <a className={p.featured ? "sp-cta" : "sp-ghost"} href={joinFor(p.id)}>
                  {p.trial ? "Start 7 days free" : "Start Elite"}
                </a>
                {p.trial && <small className="sp-fine">7 days free, then {p.founding}/month founding. One trial per person.</small>}
              </article>
            ))}
          </div>
        </section>

        <section className="sp-founders">
          <p className="sp-eyebrow center">Who built it</p>
          <h2 className="center">Built by agents who actually do the work</h2>
          <figure className="sp-founders-hero">
            <img src="/home/founders/parry-and-aaron.jpg" alt="Aaron Pehrson and Parry Ward in front of the VIP-50 sign" loading="lazy" />
          </figure>
          <div className="sp-founder-grid">
            <div>
              <img className="sp-founder-pic" src="/home/founders/parry-ward.jpg" alt="Parry Ward" loading="lazy" />
              <h3>Parry Ward</h3>
              <p className="sp-tag">The Relationship Architect</p>
              <p>Founder of The Luxury Agency. Built the VIP-50 method to get off the hamster wheel of chasing strangers.</p>
            </div>
            <div>
              <img className="sp-founder-pic" src="/home/founders/aaron-pehrson.jpg" alt="Aaron Pehrson" loading="lazy" />
              <h3>Aaron Pehrson</h3>
              <p className="sp-tag">The Systems Operator</p>
              <p>The one in the room who makes it click, and makes sure nobody gets left behind.</p>
            </div>
          </div>
        </section>

        <section id="faq" className="sp-faq">
          <h2 className="center">Questions</h2>
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section className="sp-close">
          <h2>Your pipeline isn't going to fix itself.</h2>
          <p>Start with the people you already know. ONE does the remembering.</p>
          <a className="sp-cta" href={JOIN}>
            Start your 7-day free trial
          </a>
        </section>
      </main>

      <footer className="sp-foot">
        <span>© VIP-50 LLC</span>
        <a href="/login">Sign in</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/accessibility">Accessibility</a>
        <span>Screens show an example agent; people, businesses and addresses are invented.</span>
      </footer>
    </div>
  );
}
