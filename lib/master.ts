// MASTER (Supabase olclvqawcgugszogryoi): the accounts ONE GO and ONE MOVE
// sign in with, and the bundle authority. The URL and publishable key are
// public by design (ONE MOVE ships the same ones to every browser); access is
// held by row-level security and, for vip_summary, by VIP_ECOSYSTEM_SECRET,
// which lives only in the server environment.
export const MASTER_URL = "https://olclvqawcgugszogryoi.supabase.co";
export const MASTER_PUBLISHABLE_KEY = "sb_publishable_36FC7pO93Or8IkPgYq-cDg_PMKdFaqS";

// Forgotten passwords are reset in ONE MOVE (same accounts, its reset page is
// already an allowed redirect in MASTER).
export const RESET_URL = "https://move.vip50one.com/login";
export const JOIN_URL = "https://vip50one.com/join";
