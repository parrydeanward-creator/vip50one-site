import ShowlyFilm from "@/components/film/ShowlyFilm.tsx";

export const metadata = { title: "Showly | VIP-50 ONE" };

export default async function ShowlyFilmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const record = sp.record === "1";
  const slow = record ? Math.min(8, Math.max(1, Number(sp.slow) || 1)) : 1;
  return <ShowlyFilm record={record} slow={slow} />;
}
