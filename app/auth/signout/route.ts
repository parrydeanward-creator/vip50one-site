import { NextResponse } from "next/server";
import { masterClient } from "@/lib/server/auth.ts";

export async function POST(req: Request) {
  const sb = await masterClient();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
