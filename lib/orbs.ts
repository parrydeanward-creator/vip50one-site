// Focus view sizing (Parry, 4 Oct: "make the smaller orbs or the actual contacts orb larger, they
// are super small"). Few people round an orb: big faces; many: smaller, so they still fit.

/** The radius of each face/business orb round a focused orb, from how many there are. */
export function focusFace(n: number): number {
  if (n <= 6) return 62;
  if (n <= 10) return 52;
  if (n <= 16) return 44;
  if (n <= 28) return 36;
  if (n <= 48) return 30;
  return 25;
}

/** Ring radii round a centre orb of radius `core` for faces of radius `r`. */
export function focusRings(core: number, r: number, count = 6): number[] {
  const first = core + r + 64;
  const step = 2 * r + 30;
  return Array.from({ length: count }, (_, i) => first + i * step);
}
