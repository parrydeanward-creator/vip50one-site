"use client";

import type { GraphIndex } from "@/lib/graph/model.ts";
import type { GraphNode } from "@/lib/graph/types.ts";
import { STATUS, hex } from "@/lib/brain/theme.ts";
import { MOVE_GROUPS, movePageId } from "@/lib/moveMenu.ts";
import { daysLeftInMonth, liveItemsUnder, meter, tipFor } from "@/lib/groupPanel.ts";

// The right panel for a ONE MOVE group (Parry, 4 Oct): "what should I do here
// right now, and how am I doing", never a description of the menu.
export default function GroupPanel({ node, ix, today, goTo }: { node: GraphNode; ix: GraphIndex; today: string; goTo: (id: string) => void }) {
  const key = node.id.replace(/^move-g-/, "");
  const group = MOVE_GROUPS.find((g) => g.key === key);
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

      {!doNow.length && !coming.length && !stats.length && <p className="gp-small">Nothing here needs you right now.</p>}

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
