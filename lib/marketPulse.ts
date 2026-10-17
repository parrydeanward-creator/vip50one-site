// Market Pulse (VIP-SUMMARY §3aa) folded into the Market Report (HOME-REPORT v0.4 box 3; Parry, 16 Oct: "1 yes"): its
// orb left the ONE MOVE ring and its "a note for every VIP on the 1st" is now "Set up Market Reports for all your VIPs"
// (the bulk start, lib/homeReport.ts). The Brain no longer calls /api/brain/market-pulse. What stays here are the two
// month helpers the Market Report uses.

/** "October 2026" for "2026-10". */
export function monthWords(month: string): string {
  return new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** The finished month before `today` ("2026-09" on 10 Oct 2026): the month the numbers cover. */
export function lastMonth(today: string): string {
  const [y, m] = today.slice(0, 7).split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}
