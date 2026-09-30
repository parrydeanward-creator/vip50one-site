import GoAppFilm from "@/components/film/GoAppFilm.tsx";

// The ONE GO app film: the phone app on a phone. ?record=1 hides the controls;
// with it, ?slow=N plays N times slower for smooth recording.

export const metadata = { title: "ONE GO | VIP-50 ONE" };

export default async function GoFilmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const record = sp.record === "1";
  const slow = record ? Math.min(8, Math.max(1, Number(sp.slow) || 1)) : 1;
  return <GoAppFilm record={record} slow={slow} />;
}
