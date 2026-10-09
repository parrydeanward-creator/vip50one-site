// The agent's own AI, connected to ONE (CONNECTOR.md v0.1; Parry, 9 Oct: "yes on allowing agents to connect their own
// bot"). Read only, the agent's own data only, off by default. ONE MOVE serves the MCP server and the switch; the Brain
// shows the switch, the address to give an AI app, who is connected, and what each one looked at.

const MOVE_URL = "https://move.vip50one.com";
export const connectorUrl = `${MOVE_URL}/api/brain/connector`;
export const revokeUrl = `${MOVE_URL}/api/brain/connector/revoke`;
export const connectorLogUrl = `${MOVE_URL}/api/brain/connector/log`;

export interface Connected {
  clientId: string;
  name: string;
  connectedAt: string;
  lastUsedAt: string | null;
}
export interface ConnectorState {
  allowed: boolean;
  on: boolean;
  serverUrl: string;
  connected: Connected[];
}
export interface LogLine {
  line: string;
  at: string;
}

const str = (v: unknown, n = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

/** A §2.3 answer, checked; null when it is not one. The server address must be ONE MOVE's own. */
export function readConnector(j: unknown): ConnectorState | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  if (typeof r.allowed !== "boolean" || typeof r.on !== "boolean") return null;
  const url = str(r.server_url, 200);
  const connected: Connected[] = [];
  for (const x of (Array.isArray(r.connected) ? r.connected : []) as Record<string, unknown>[]) {
    const id = str(x?.client_id, 200), name = str(x?.client_name, 80), at = str(x?.connected_at, 40);
    if (id && name && at) connected.push({ clientId: id, name, connectedAt: at, lastUsedAt: str(x.last_used_at, 40) });
  }
  return { allowed: r.allowed, on: r.on, serverUrl: url && url.startsWith(`${MOVE_URL}/`) ? url : `${MOVE_URL}/mcp`, connected: r.on ? connected : [] };
}

/** The look-up log (§2.6), newest first, at most 20 lines. */
export function readLog(j: unknown): LogLine[] {
  const rows = j && typeof j === "object" && Array.isArray((j as { log?: unknown }).log) ? ((j as { log: unknown[] }).log as Record<string, unknown>[]) : [];
  return rows
    .map((x) => ({ line: str(x?.line, 160), at: str(x?.at, 40) }))
    .filter((x): x is LogLine => !!x.line && !!x.at)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 20);
}

export const when = (at: string) => {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

// Lead email (LEADS §1.1 Portals): the agent's own forwarding address for portal lead emails. Read through the Brain's
// own route with the agent's MASTER session (my_lead_mail_address, own inbound_mail rows).
export const leadMailUrl = "/api/lead-mail";
export const LEAD_STATUS: Record<string, string> = { forwarding_code: "Type this code into Gmail to finish forwarding", lead: "Added", no_contact_way: "No email or phone found", error: "Could not add", unknown_code: "Unknown address", received: "Received" };
export interface LeadMail {
  address: string;
  recent: { at: string; summary: string; status: string }[];
}
export function readLeadMail(j: unknown): LeadMail | null {
  if (!j || typeof j !== "object") return null;
  const r = j as Record<string, unknown>;
  const address = str(r.address, 120);
  if (!address || !/^leads\+[a-z0-9]+@leads\.vip50one\.com$/i.test(address)) return null;
  const recent = (Array.isArray(r.recent) ? r.recent : []) as Record<string, unknown>[];
  return {
    address,
    recent: recent
      .map((x) => ({ at: str(x?.received_at, 40) ?? "", summary: str(x?.summary, 120) ?? "Lead email", status: LEAD_STATUS[String(x?.status)] ?? String(x?.status ?? "") }))
      .filter((x) => x.at)
      .slice(0, 5),
  };
}
