"use client";

import type { GraphIndex } from "@/lib/graph/model.ts";
import type { GraphNode } from "@/lib/graph/types.ts";
import { STATUS, hex } from "@/lib/brain/theme.ts";
import { moveGroupsFor, movePageId } from "@/lib/moveMenu.ts";
import { daysLeftInMonth, liveItemsUnder, meter, tipFor } from "@/lib/groupPanel.ts";

// The right panel for a ONE MOVE group (Parry, 4 Oct): "what should I do here
// right now, and how am I doing", never a description of the menu.
export default function GroupPanel({ node, ix, today, goTo }: { node: GraphNode; ix: GraphIndex; today: string; goTo: (id: string) => void }) {
  const key = node.id.replace(/^move-g-/, "");
  const group = moveGroupsFor(true).find((g) => g.key === key);
  const items = liveItemsUnder(ix, node.id);
  const doNow = items.filter((n) => n.status === "action" || n.status === "attention").slice(0, 8);
  const coming = items.filter((n) => n.status === "opportunity").slice(0, 5);
  const tip = tipFor(doNow.length ? doNow : items);
  const stats = node.stats ?? [];

  return (
    <div className="gp">
      {tip && <p className="gp-tip">{tip}</p>}

      {doNow.length > 0 && (
        <section>
          <h2>Do now</h2>
          <ul className="gp-list">
            {doNow.map((n) => (
              <li key={n.id}>
                <button onClick={() => goTo(n.id)}>
                  <i style={{ background: hex(STATUS[n.status ?? "healthy"].color) }} />
                  <span>
                    <b>{n.label}</b>
                    {n.secondaryLabel && <small>{n.secondaryLabel}</small>}
                  </span>
                  <em aria-hidden="true">→</em>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats.length > 0 && (
        <section>
          <h2>{key === "trackers" ? "Your scores" : "Your month"}</h2>
          <ul className="gp-meters">
            {stats.map((s) => {
              const m = meter(s.value);
              return (
                <li key={s.label}>
                  <div className="gp-meter-top">
                    <span>{s.label}</span>
                    <b>{s.value}</b>
                  </div>
                  {m && (
                    <div className="gp-bar" role="img" aria-label={`${s.label}: ${s.value}`}>
                      <i style={{ width: `${Math.min(100, Math.round((m.value / m.max) * 100))}%` }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {key === "people" && <p className="gp-small">{daysLeftInMonth(today)} days left this month.</p>}
          {key === "trackers" && <p className="gp-small">The weekly minimum is 100. Numbers refresh every minute.</p>}
        </section>
      )}

      {node.boxes && node.boxes.length > 0 && (
        <section>
          <h2>Today</h2>
          <p className="gp-small gp-lead">
            {node.boxes.filter((b) => b.done).length} of {node.boxes.length} boxes done ·{" "}
            {node.boxes.filter((b) => b.done).reduce((a, b) => a + b.points, 0)} of {node.boxes.reduce((a, b) => a + b.points, 0)} points
          </p>
          <ul className="gp-boxes">
            {[...node.boxes.filter((b) => !b.done), ...node.boxes.filter((b) => b.done)].map((b, i) => (
              <li key={`${b.label}-${i}`} className={b.done ? "on" : ""}>
                <i aria-hidden="true">{b.done ? "✓" : ""}</i>
                <span>{b.label}</span>
                <small>{b.points} pt{b.points === 1 ? "" : "s"}</small>
              </li>
            ))}
          </ul>
          <p className="gp-small">Tick boxes in Daily Tracker (below) or in ONE GO; this list refreshes every minute.</p>
        </section>
      )}

      {coming.length > 0 && (
        <section>
          <h2>Coming up</h2>
          <ul className="gp-list">
            {coming.map((n) => (
              <li key={n.id}>
                <button onClick={() => goTo(n.id)}>
                  <i style={{ background: hex(STATUS.opportunity.color) }} />
                  <span>
                    <b>{n.label}</b>
                    {n.secondaryLabel && <small>{n.secondaryLabel}</small>}
                  </span>
                  <em aria-hidden="true">→</em>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!doNow.length && !coming.length && !stats.length && !node.boxes?.length && <p className="gp-small">Nothing here needs you right now.</p>}

      {group && (
        <section>
          <h2>Open</h2>
          <div className="gp-tiles">
            {group.pages.map((pg) => (
              <button key={pg.path} onClick={() => goTo(movePageId(pg.path))}>
                {pg.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
