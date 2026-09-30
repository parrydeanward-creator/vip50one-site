import { Suspense, cache } from "react";
import { morningNote } from "@/lib/assistant.ts";
import { demoData } from "@/lib/demo.ts";
import { PACKAGE_LABEL, PRODUCTS, UPGRADE_URL, includes } from "@/lib/products.ts";
import { isOverdue, rankToday } from "@/lib/rank.ts";
import type { DashboardData, Item, PackageId, ProductId, ProductSummary } from "@/lib/types.ts";
import type { ProductInfo } from "@/lib/products.ts";

// Demo data only for now (DASHBOARD-BRIEF.md §6 step 1). Sign-in and the
// vip_summary calls replace demoData() once the contract is live.
// ?package=relationship|complete|elite and ?offline=1 show the other states.

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;

const getNote = cache(async (pkg: PackageId, offline: boolean) => {
  const data = demoData({ pkg, offline });
  return morningNote(data, rankToday(data));
});

export default async function Dashboard({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const pkgParam = typeof sp.package === "string" ? sp.package : "";
  const pkg: PackageId = pkgParam in PACKAGE_LABEL ? (pkgParam as PackageId) : "complete";
  const offline = sp.offline === "1";

  const data = demoData({ pkg, offline });
  const ranked = rankToday(data);
  const note = getNote(pkg, offline);

  return (
    <div className="shell">
      <TopBar data={data} />
      <main className="main">
        <section className="today" aria-labelledby="today-h">
          <Suspense fallback={<NoteSkeleton firstName={data.agent.firstName} />}>
            <MorningNoteBlock note={note} />
          </Suspense>
          <h2 id="today-h" className="eyebrow">Today</h2>
          <ol className="items">
            {ranked.map((item) => (
              <TodayItem key={item.id} item={item} today={data.today} />
            ))}
          </ol>
        </section>

        <Scoreboard data={data} />

        <section aria-labelledby="products-h">
          <h2 id="products-h" className="eyebrow">Your products</h2>
          <div className="cards">
            {PRODUCTS.map((info) => {
              const summary = data.products.find((p) => p.product === info.id);
              if (!includes(data.agent.package, info.id)) {
                return <LockedCard key={info.id} info={info} />;
              }
              return (
                <ProductCard key={info.id} info={info} summary={summary}>
                  <Suspense fallback={<p className="card-status">{summary?.statusLine}</p>}>
                    <CardLine note={note} product={info.id} fallback={summary?.statusLine ?? ""} />
                  </Suspense>
                </ProductCard>
              );
            })}
          </div>
        </section>

        {data.coaching && <CoachingBlock coaching={data.coaching} />}

        <footer className="foot">Demo data · VIP-50 ONE</footer>
      </main>
    </div>
  );
}

function TopBar({ data }: { data: DashboardData }) {
  const a = data.agent;
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-vip">VIP-50</span>
        <span className="brand-one">ONE</span>
      </div>
      <form className="search" role="search" action="#">
        <input type="search" name="q" placeholder="Search a contact, listing or open house" aria-label="Search" />
      </form>
      <div className="who">
        <span className="pill">
          {PACKAGE_LABEL[a.package]}
          {a.founding ? " · Founding" : ""}
        </span>
        <span className="avatar" aria-label={`${a.firstName} ${a.lastName}`}>
          {a.firstName[0]}
          {a.lastName[0]}
        </span>
      </div>
    </header>
  );
}

type NotePromise = ReturnType<typeof getNote>;

async function MorningNoteBlock({ note }: { note: NotePromise }) {
  const n = await note;
  return (
    <div className="note">
      <p className="note-open">{n.opening}</p>
      <p className="note-body">{n.note}</p>
      {n.source === "ai" && <p className="note-src">Written for you this morning</p>}
    </div>
  );
}

function NoteSkeleton({ firstName }: { firstName: string }) {
  return (
    <div className="note">
      <p className="note-open">Good morning, {firstName}.</p>
      <p className="note-body muted">Reading your day…</p>
    </div>
  );
}

async function CardLine({ note, product, fallback }: { note: NotePromise; product: ProductId; fallback: string }) {
  const n = await note;
  const line = n.cards[product];
  return <p className="card-status">{line ?? fallback}</p>;
}

function TodayItem({ item, today }: { item: Item; today: string }) {
  const overdue = isOverdue(item, today);
  const cls = item.urgency === "alert" ? "item alert" : "item";
  const product = PRODUCTS.find((p) => p.id === item.product)!;
  return (
    <li className={cls}>
      <div className="item-text">
        <span className="item-product">{product.name}</span>
        <span className="item-title">{item.title}</span>
        {item.detail && <span className="item-detail">{item.detail}</span>}
        {overdue && <span className="item-flag">Overdue</span>}
      </div>
      <a className="btn btn-small" href={item.action.href}>
        {item.action.label}
      </a>
    </li>
  );
}

function Scoreboard({ data }: { data: DashboardData }) {
  const s = data.scoreboard;
  const tiles = [
    { label: "Touches this month", value: s.touchesThisMonth, goal: s.touchGoal },
    { label: "VIP list", value: s.vipCount, goal: s.vipGoal },
    { label: "Day streak", value: s.streakDays },
    { label: "Referrals this year", value: s.referralsThisYear },
    { label: "Closings this year", value: s.closingsThisYear, goal: s.closingsGoal },
  ];
  return (
    <section className="score" aria-labelledby="score-h">
      <h2 id="score-h" className="eyebrow">Scoreboard</h2>
      <div className="tiles">
        {tiles.map((t) => (
          <div className="tile" key={t.label}>
            <div className="tile-num">
              {t.value.toLocaleString("en-US")}
              {t.goal !== undefined && <span className="tile-goal"> / {t.goal}</span>}
            </div>
            <div className="tile-label">{t.label}</div>
            {t.goal !== undefined && (
              <div className="bar" role="presentation">
                <span style={{ width: `${Math.min(100, Math.round((t.value / t.goal) * 100))}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  info,
  summary,
  children,
}: {
  info: ProductInfo;
  summary: ProductSummary | undefined;
  children: React.ReactNode;
}) {
  if (!summary || !summary.reachable) {
    return (
      <article className="card" id={info.id}>
        <h3 className="card-name">{info.name}</h3>
        <p className="card-status muted">Couldn&apos;t reach {info.name} just now.</p>
        <a className="btn btn-ghost" href="">
          Try again
        </a>
      </article>
    );
  }
  return (
    <article className="card" id={info.id}>
      <h3 className="card-name">{info.name}</h3>
      <dl className="stats">
        {summary.stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      {children}
      {info.href ? (
        <a className="btn" href={info.href}>
          Open {info.name}
        </a>
      ) : (
        <p className="card-phone">Open GO on your phone</p>
      )}
    </article>
  );
}

function LockedCard({ info }: { info: ProductInfo }) {
  return (
    <article className="card locked" id={info.id}>
      <h3 className="card-name">
        {info.name} <span className="lock">Not in your package</span>
      </h3>
      <p className="card-status">{info.tagline}</p>
      <a className="btn btn-ghost" href={UPGRADE_URL}>
        Add with Complete
      </a>
    </article>
  );
}

function CoachingBlock({ coaching }: { coaching: NonNullable<DashboardData["coaching"]> }) {
  return (
    <section className="coaching" aria-labelledby="coach-h">
      <h2 id="coach-h" className="eyebrow">Coaching</h2>
      <div className="card">
        <p className="coach-day">
          Day {coaching.day} <span className="tile-goal">of {coaching.length}</span>
        </p>
        <ul className="sessions">
          {coaching.nextSessions.map((s) => (
            <li key={s.label}>
              <span>{s.label}</span>
              <span className="muted">{s.when}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
