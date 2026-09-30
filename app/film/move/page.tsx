import MoveFilm from "@/components/film/MoveFilm.tsx";

export const metadata = { title: "ONE MOVE | VIP-50 ONE" };

export default async function MoveFilmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const record = sp.record === "1";
  const slow = record ? Math.min(8, Math.max(1, Number(sp.slow) || 1)) : 1;
  return <MoveFilm record={record} slow={slow} />;
}
