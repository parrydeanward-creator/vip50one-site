import { MOVE_URL } from "./host.ts";

// ONE MOVE's main menu, the same items in the same order as the Classic
// sidebar (vip50-web-crm components/layout/Sidebar.tsx, checked 3 Oct; admin
// items left out). Clicking ONE MOVE in the Brain shows it on the left
// (Parry, 3 Oct). The sign-in is shared on .vip50one.com, so no password.
export const MOVE_MENU: ReadonlyArray<{ label: string; path: string }> = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Contacts", path: "/contacts" },
  { label: "VIP Management", path: "/contacts/vip" },
  { label: "Touch Audit", path: "/contacts/audit" },
  { label: "New to Sort", path: "/contacts/visitors" },
  { label: "Action Plans", path: "/action-plans" },
  { label: "Landing Pages", path: "/landing-pages" },
  { label: "Calendar", path: "/calendar" },
  { label: "Daily Tracker", path: "/daily" },
  { label: "90-Day Challenge", path: "/challenge" },
  { label: "Weekly Tracker", path: "/weekly" },
  { label: "Hot/Warm/Cold", path: "/hot-warm-cold" },
  { label: "Business Rolodex", path: "/rolodex" },
  { label: "VIP Events", path: "/events" },
  { label: "Mixer", path: "/mixer" },
  { label: "Newsletter", path: "/newsletter" },
  { label: "Video Library", path: "/content" },
  { label: "VIP Docs", path: "/vip-docs" },
  { label: "The Vault", path: "/vault" },
  { label: "The Lounge", path: "/lounge" },
  { label: "My Profile", path: "/profile" },
  { label: "Analytics", path: "/analytics" },
  { label: "What's New", path: "/whats-new" },
];

export const moveMenuHref = (path: string) => `${MOVE_URL}${path}`;
