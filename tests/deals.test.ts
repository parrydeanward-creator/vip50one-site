import { test } from "node:test";
import assert from "node:assert/strict";
import { DEALS_NODE, dealLevel, demoDeals, movedLine, nextDate, readClosingAsk, readDeals, statusBody, timeWords, whenLine, withDealsNode, withStatus } from "../lib/deals.ts";

const today = "2026-10-12";

test("readDeals keeps good deals and refuses a wrong shape", () => {
  assert.equal(readDeals({}), null);
  assert.equal(readDeals(null), null);
  const r = readDeals({
    deals: [
      { id: "a", contact: { id: "c", name: "Jane Smith" }, side: "sell", status: "under_contract", repc_form: "2027", accepted_on: "2026-10-01", deadline_time: "17:00:00",
        dates: [{ key: "settlement", label: "Settlement", on: "2027-07-04", effective_on: "2027-07-06", moved_reason: "Independence Day", days_left: 265 }, { key: "bad", on: "soon" }] },
      { id: "b", contact: { id: "c" } },
      { id: "", contact: { id: "c", name: "X" } },
    ],
  })!;
  assert.equal(r.length, 1);
  assert.equal(r[0].form, "2027");
  assert.equal(r[0].deadlineTime, "17:00");
  assert.equal(r[0].dates.length, 1);
  assert.equal(r[0].dates[0].effectiveOn, "2027-07-06");
});

test("red on the day, yellow the day before, still otherwise; closed never pulses", () => {
  const [d1, d2, d3, d4] = demoDeals(today);
  assert.equal(dealLevel(d1, today), "now");
  assert.equal(dealLevel(d2, today), "today");
  assert.equal(dealLevel(d3, today), "good");
  assert.equal(dealLevel(d4, today), "good");
});

test("the moved day counts, not the typed one", () => {
  const [d] = readDeals({ deals: [{ id: "a", contact: { id: "c", name: "J" }, status: "under_contract", dates: [{ key: "settlement", label: "Settlement", on: "2027-07-04", effective_on: "2027-07-06", moved_reason: "Independence Day" }] }] })!;
  assert.equal(dealLevel(d, "2027-07-04"), "good");
  assert.equal(dealLevel(d, "2027-07-05"), "today");
  assert.equal(dealLevel(d, "2027-07-06"), "now");
  assert.equal(nextDate(d, "2027-07-05")!.key, "settlement");
  assert.equal(movedLine(d.dates[0]), "Moved to Tue, Jul 6 (Independence Day)");
});

test("plain words", () => {
  const x = { key: "dd", label: "Due diligence", on: today, effectiveOn: null, movedReason: null, daysLeft: 0 };
  assert.equal(whenLine(x, today), "Due diligence today");
  assert.equal(whenLine({ ...x, on: "2026-10-13" }, today), "Due diligence tomorrow");
  assert.equal(whenLine({ ...x, on: "2026-10-21" }, today), "Due diligence in 9 days");
  assert.equal(whenLine({ ...x, on: "2026-10-01" }, today), "Due diligence, passed");
  assert.equal(timeWords("17:00"), "5:00 pm");
  assert.equal(timeWords("09:30"), "9:30 am");
  assert.equal(timeWords("00:00"), "12:00 am");
});

test("status bodies and the confirm-closing answer", () => {
  assert.deepEqual(statusBody("closed"), { status: "closed" });
  assert.deepEqual(statusBody("closed", "new"), { status: "closed", closing: "new" });
  assert.deepEqual(statusBody("closed", { id: "k1" }), { status: "closed", closing_id: "k1" });
  assert.equal(readClosingAsk({ reason: "other" }), null);
  const a = readClosingAsk({ reason: "confirm_closing", closing: { id: "k1", closed_on: "2026-10-01" }, question: "Is this the closing you logged on 1 Oct?" })!;
  assert.equal(a.id, "k1");
  assert.equal(a.closedOn, "2026-10-01");
  assert.equal(withStatus(demoDeals(today), "d1", "closed")[0].status, "closed");
});

test("the deal orb sits under ONE MOVE and is red when a deadline is today", () => {
  const g = { nodes: [{ id: "move", type: "product", label: "ONE MOVE", parentId: null, product: "move", importance: 1 }], edges: [] } as never;
  const out = withDealsNode(g, demoDeals(today), today) as { nodes: { id: string; status?: string; secondaryLabel?: string }[] };
  const n = out.nodes.find((x) => x.id === DEALS_NODE)!;
  assert.equal(n.status, "action");
  assert.match(n.secondaryLabel!, /^3 under contract · Jane: Due diligence today$/);
  const none = withDealsNode(g, null, today) as { nodes: { id: string }[] };
  assert.equal(none.nodes.some((x) => x.id === DEALS_NODE), false);
});
