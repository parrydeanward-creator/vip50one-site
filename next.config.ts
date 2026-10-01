import type { NextConfig } from "next";
import { HANDOVER, MOVE_URL, PROXIED } from "./lib/host.ts";

const config: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return HANDOVER.flatMap((p) => [
      { source: p, destination: `${MOVE_URL}${p}`, permanent: false },
      { source: `${p}/:path*`, destination: `${MOVE_URL}${p}/:path*`, permanent: false },
    ]);
  },
  async rewrites() {
    // afterFiles: this site's own routes (/api/note, /api/ask) win; the rest
    // of /api is ONE MOVE's.
    return { beforeFiles: [], afterFiles: PROXIED.map((p) => ({ source: p, destination: `${MOVE_URL}${p}` })), fallback: [] };
  },
};

export default config;
