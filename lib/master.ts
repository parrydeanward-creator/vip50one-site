// MASTER (Supabase olclvqawcgugszogryoi): the accounts ONE GO and ONE MOVE
// sign in with, and the bundle authority. The URL and publishable key are
// public by design (ONE MOVE ships the same ones to every browser); access is
// held by row-level security and, for vip_summary, by VIP_ECOSYSTEM_SECRET,
// which lives only in the server environment.
export const MASTER_URL = "https://olclvqawcgugszogryoi.supabase.co";
export const MASTER_PUBLISHABLE_KEY = "sb_publishable_36FC7pO93Or8IkPgYq-cDg_PMKdFaqS";

// Forgotten passwords are reset here, in the ONE look (app/reset; audit stage 1, 14 Oct).
export const RESET_URL = "/reset";
export const JOIN_URL = "https://vip50one.com/join";
