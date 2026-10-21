import { movePageId } from "./moveMenu.ts";
import { DEMO_FOLLOW_NODE, FOLLOW_NODE } from "./followUps.ts";
import { DEMO_NTS_NODE } from "./newToSort.ts";
import { SCORE_NODE } from "./oneYou.ts";
import { toolId } from "./productTools.ts";

// Rule 12 (Parry, 19 Oct: "everything we do must have action available"): a number on an orb's panel opens the people or
// items behind it. This says where each product orb's own stat rows go; the Brain opens the first place that is on the
// agent's map. Pure, so a test can hold every product's stat to an action.

export interface StatGo {
  /** Orbs to open, first one on the map wins. */
  ids?: string[];
  /** Else this ONE MOVE page, inside the Brain. */
  page?: string;
  /** Power Hour (Today's VIP touches). */
  power?: boolean;
  /** The team leaderboard. */
  team?: boolean;
}

/** Where the stat `label` on orb `nodeId` goes; null: it has nothing behind it. */
export function statGo(nodeId: string, label: string): StatGo | null {
  const t = label.toLowerCase();
  const has = (re: RegExp) => re.test(t);
  switch (nodeId) {
    case "marquee":
      if (has(/listing/)) return { ids: [toolId("marquee", "listings")] };
      if (has(/approv|piece|waiting/)) return { ids: [toolId("marquee", "posts")] };
      return null;
    case "showly":
      if (has(/answer|reaction/)) return { ids: [toolId("showly", "answers")] };
      if (has(/tour/)) return { ids: [toolId("showly", "tours")] };
      if (has(/letter|lender/)) return { ids: [toolId("showly", "lender")] };
      return null;
    case "open":
      if (has(/visitor|rate/)) return { ids: [toolId("open", "visitors")] };
      if (has(/open house|prep/)) return { ids: [toolId("open", "open_houses")] };
      return null;
    case "go":
      if (has(/daily/)) return { page: "/daily" };
      if (has(/weekly/)) return { page: "/weekly" };
      if (has(/streak|leaderboard/)) return { ids: [SCORE_NODE] };
      return null;
    case SCORE_NODE:
      if (has(/daily|streak/)) return { page: "/daily" };
      if (has(/weekly/)) return { page: "/weekly" };
      if (has(/leader/)) return { team: true };
      return null;
    case "go-today":
      if (has(/task|execution/)) return { power: true };
      if (has(/daily|point|streak/)) return { page: "/daily" };
      return null;
    case "move":
      if (has(/follow/)) return { ids: [FOLLOW_NODE, DEMO_FOLLOW_NODE] };
      if (has(/sort/)) return { ids: [movePageId("/contacts/visitors"), DEMO_NTS_NODE] };
      if (has(/vip-50|touched/)) return { page: "/contacts/vip" };
      return null;
    default:
      return null;
  }
}
