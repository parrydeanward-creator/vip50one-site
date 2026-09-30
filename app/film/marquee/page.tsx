import MarqueeFilm from "@/components/film/MarqueeFilm.tsx";

export const metadata = { title: "Marquee | VIP-50 ONE" };

export default async function MarqueeFilmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const record = sp.record === "1";
  const slow = record ? Math.min(8, Math.max(1, Number(sp.slow) || 1)) : 1;
  return <MarqueeFilm record={record} slow={slow} />;
}
