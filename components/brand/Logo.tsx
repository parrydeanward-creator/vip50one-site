// The real VIP-50 ONE logo, everywhere (Parry, 14 Oct: "make sure that the actual logo is on all of these pages instead
// of just the text"). A link when given href, otherwise a plain mark (sign-in cards).
export default function Logo({ href, label = "VIP-50 ONE", size = 48 }: { href?: string; label?: string; size?: number }) {
  const img = <img src="/brand/vip50-one.webp" alt="VIP-50 ONE" width={Math.round(size * 1.46)} height={size} style={{ height: size, width: "auto" }} />;
  return href ? (
    <a className="brand brand-logo" href={href} aria-label={label}>
      {img}
    </a>
  ) : (
    <p className="brand brand-logo card-logo" aria-label={label}>
      {img}
    </p>
  );
}
