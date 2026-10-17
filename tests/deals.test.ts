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

// ---- Add a deal, timeline, REPC read (walker note; vip50-web-crm#295) ----
import { dateLevel, daysWords, dealBody, dealName, emptyForm, exampleDeal, formFromRead, readRepcAnswer, timeline, uploadProblem, SOURCE_WORD } from "../lib/deals.ts";

test("a deal without a client (filled from reZEN or Marquee) keeps its address and source", () => {
  const r = readDeals({ deals: [
    { id: "z", contact: null, address: "12 Oak St, Provo", source: "rezen", price: 400000, gci: 12000, has_repc: false, status: "under_contract", dates: [] },
    { id: "y", contact: null, status: "under_contract", dates: [] },
  ] })!;
  assert.equal(r.length, 1);
  assert.equal(dealName(r[0]), "12 Oak St, Provo");
  assert.equal(SOURCE_WORD[r[0].source!], "From reZEN");
  assert.equal(r[0].gci, 12000);
  assert.equal(readDeals({ deals: [{ id: "m", contact: { id: "c", name: "A B" }, source: "other" }] })![0].source, "manual");
});

test("timeline runs in date order by the day it really falls, coloured by days left", () => {
  const d = readDeals({ deals: [{ id: "a", contact: { id: "c", name: "J" }, status: "under_contract", dates: [
    { key: "settlement_on", label: "Settlement", on: "2026-10-20" },
    { key: "due_diligence_on", label: "Due diligence", on: "2026-10-13" },
    { key: "earnest_money_on", label: "Earnest money", on: "2026-10-05" },
    { key: "appraisal_on", label: "Appraisal", on: "2026-10-12" },
    { key: "financing_on", label: "Financing", on: "2026-10-11", effective_on: "2026-10-14" },
  ] }] })![0];
  const t = timeline(d, today);
  assert.deepEqual(t.map((x) => x.key), ["earnest_money_on", "appraisal_on", "due_diligence_on", "financing_on", "settlement_on"]);
  assert.deepEqual(t.map((x) => x.level), ["passed", "now", "today", "good", "good"]);
  assert.deepEqual(t.map((x) => daysWords(x, today)), ["Passed", "Today", "Tomorrow", "2 days left", "8 days left"]);
  assert.equal(timeline({ ...d, status: "closed" }, today).every((x) => x.level === "passed"), true);
  assert.equal(dateLevel(t[1], "2026-10-10"), "good");
});

test("the empty-state example is a buyer deal whose due diligence turns yellow the day before", () => {
  const e = exampleDeal(today);
  assert.equal(e.side, "buy");
  const dd = timeline(e, today).find((x) => x.key === "due_diligence")!;
  assert.equal(dd.level, "today");
  assert.equal(dealLevel(e, today), "today");
});

test("Pulse's read fills the form; what it could not read keeps the typed value and is flagged", () => {
  const prev = { ...emptyForm(today), contact: { id: "c1", name: "Jane Smith" }, dates: { financing_on: "2026-11-02" }, address: "typed address" };
  const a = readRepcAnswer({ ok: true, file_path: "u1/f.pdf", read: {
    repc_form: "2027", accepted_on: "2026-10-10", address: "418 Maple Ridge Dr", price: 612000, side: "buy",
    dates: { earnest_money_on: "2026-10-13", due_diligence_on: "2026-10-24", financing_on: null, financing_appraisal_on: "2026-10-30", settlement_on: "bad" },
    unread: ["financing_on", "settlement_on", "seller_disclosure_on"],
  } });
  assert.equal(a.ok, true);
  const f = formFromRead(prev, a as Extract<typeof a, { ok: true }>);
  assert.equal(f.contact!.id, "c1");
  assert.equal(f.form, "2027");
  assert.equal(f.acceptedOn, "2026-10-10");
  assert.equal(f.address, "418 Maple Ridge Dr");
  assert.equal(f.price, "612000");
  assert.equal(f.dates.earnest_money_on, "2026-10-13");
  assert.equal(f.dates.financing_on, "2026-11-02");
  assert.equal(f.dates.settlement_on, "");
  assert.equal("financing_appraisal_on" in f.dates, false);
  assert.deepEqual(f.unread, ["financing_on", "settlement_on", "seller_disclosure_on"]);
  assert.equal(f.pulseRead, true);
  assert.equal(f.filePath, "u1/f.pdf");
});

test("an unreadable REPC keeps the file and the form; a failed upload says so", () => {
  const a = readRepcAnswer({ ok: true, file_path: "u1/f.pdf", read: null, note: "Pulse could not read it; type the dates in." });
  assert.equal(a.ok && a.read, null);
  const f = formFromRead(emptyForm(today), a as Extract<typeof a, { ok: true }>);
  assert.equal(f.pulseRead, false);
  assert.equal(f.filePath, "u1/f.pdf");
  const bad = readRepcAnswer({ ok: false, error: "The REPC must be a PDF." }, false);
  assert.deepEqual(bad, { ok: false, error: "The REPC must be a PDF." });
  assert.equal(uploadProblem({ type: "image/png", size: 10, name: "x.png" }), "The REPC must be a PDF.");
  assert.equal(uploadProblem({ type: "application/pdf", size: 21 * 1024 * 1024 }), "That PDF is over 20 MB.");
  assert.equal(uploadProblem({ type: "application/pdf", size: 1000 }), null);
});

test("Save sends only what is filled, the REPC file, and names the field to fix", () => {
  const f = { ...emptyForm(today), contact: { id: "c1", name: "Jane" }, address: " 418 Maple ", side: "buy" as const, form: "2018" as const, acceptedOn: "2026-10-10",
    price: "$612,000", gci: "", dates: { due_diligence_on: "2026-10-24", appraisal_on: "2026-10-30", settlement_on: "" }, filePath: "u1/f.pdf" };
  const b = dealBody(f);
  assert.equal(b.ok, true);
  assert.deepEqual(b.ok && b.body, { contact_id: "c1", address: "418 Maple", side: "buy", repc_form: "2018", accepted_on: "2026-10-10", price: 612000, due_diligence_on: "2026-10-24", repc_file_path: "u1/f.pdf" });
  assert.equal(emptyForm("2026-10-17").form, "");
  assert.equal(emptyForm("2027-01-02").form, "2027");
  const no = (patch: object) => { const r = dealBody({ ...f, ...patch }); return r.ok ? null : r.field; };
  assert.equal(no({ contact: null }), "contact_id");
  assert.equal(no({ address: " " }), "address");
  assert.equal(no({ side: "" }), "side");
  assert.equal(no({ form: "" }), "repc_form");
  assert.equal(no({ acceptedOn: "" }), "accepted_on");
  assert.equal(no({ price: "lots" }), "price");
  assert.equal(no({ dates: { due_diligence_on: "2026-10-01" } }), "due_diligence_on");
  assert.equal(no({ dates: { possession_on: "2026-10-01" } }), null);
});
