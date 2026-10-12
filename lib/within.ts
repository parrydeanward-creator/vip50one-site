/** The promise's answer if it comes within `ms`, otherwise `fallback()`. A late answer is dropped, never thrown. */
export function within<T>(p: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback()), ms);
  });
  return Promise.race([p.catch(() => fallback()), late]).finally(() => clearTimeout(timer));
}
