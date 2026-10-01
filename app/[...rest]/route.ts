import { moveUrlFor } from "@/lib/host.ts";

// Any path this site does not have belongs to ONE MOVE (old vip50one.com
// bookmarks, links in sent emails, the phone app's older links). Same path and
// query on move.vip50one.com; 308 keeps the method and body.

function forward(req: Request) {
  const u = new URL(req.url);
  return new Response(null, { status: 308, headers: { Location: moveUrlFor(u.pathname, u.search) } });
}

export const GET = forward;
export const HEAD = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
