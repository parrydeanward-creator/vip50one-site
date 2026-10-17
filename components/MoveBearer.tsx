"use client";

import { installMoveBearer } from "@/lib/moveAuth.ts";

// Installed when this module loads, before any page's effects run, so the first call to ONE MOVE already carries the
// Brain's sign-in (lib/moveAuth.ts). Renders nothing.
if (typeof window !== "undefined") installMoveBearer();

export default function MoveBearer() {
  return null;
}
