import type { IconKind } from "@/lib/brain/icons.ts";

// DOM twin of the canvas icons (components/brain/draw.ts), 24-unit grid.
export default function Icon({ kind, size = 18, color = "currentColor" }: { kind: IconKind; size?: number; color?: string }) {
  const p = { fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let d: React.ReactNode = null;
  switch (kind) {
    case "go":
    case "check":
      d = (<><rect x="4" y="4" width="16" height="16" rx="3.5" {...p} /><path d="M8.5 12l2.5 2.8L16 9" {...p} /></>);
      break;
    case "move":
    case "people":
      d = (<><circle cx="12" cy="8.5" r="2.8" {...p} /><path d="M6.5 18.5c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" {...p} /><circle cx="5.5" cy="10" r="1.8" {...p} /><circle cx="18.5" cy="10" r="1.8" {...p} /></>);
      break;
    case "marquee":
    case "house":
    case "showly":
      d = (<><path d="M3.5 11.5L12 4l8.5 7.5" {...p} /><path d="M6 10v9.5h12V10" {...p} />{kind === "showly" ? <circle cx="12" cy="14.5" r="1.8" fill={color} /> : <rect x="10" y="14" width="4" height="5.5" {...p} />}</>);
      break;
    case "open":
      d = (<><rect x="7" y="3.5" width="10" height="17" {...p} /><path d="M7 3.5l6 2.5v16l-6-1.5" {...p} /><circle cx="11" cy="12.5" r=".9" fill={color} /></>);
      break;
    case "calendar":
      d = (<><rect x="4" y="5.5" width="16" height="14" rx="2.5" {...p} /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" {...p} /></>);
      break;
    case "star":
      d = <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" {...p} />;
      break;
    case "map":
      d = (<><path d="M12 21s-6-6.2-6-10.5a6 6 0 1112 0C18 14.8 12 21 12 21z" {...p} /><circle cx="12" cy="10.5" r="2" {...p} /></>);
      break;
    case "chat":
      d = (<><rect x="3.5" y="4.5" width="17" height="11.5" rx="3" {...p} /><path d="M8 16l-1.5 4.5L12 16" {...p} /></>);
      break;
    case "trophy":
      d = (<><path d="M7.5 4h9l-1 7a3.5 3.5 0 01-7 0z" {...p} /><path d="M12 14.5V18M8.5 20.5h7" {...p} /></>);
      break;
    case "bolt":
      d = <path d="M13 3L6 13.5h5L10.5 21 18 10.5h-5z" {...p} />;
      break;
    case "list":
      d = (<><path d="M9 7h11M9 12h11M9 17h11" {...p} /><circle cx="5" cy="7" r="1" fill={color} /><circle cx="5" cy="12" r="1" fill={color} /><circle cx="5" cy="17" r="1" fill={color} /></>);
      break;
    default:
      d = null;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {d}
    </svg>
  );
}
