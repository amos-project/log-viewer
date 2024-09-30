/*
 * @since 2024-09-28 00:35:20
 * @author junbao <junbao@moego.pet>
 */

export function detectUrlExt(url: string): string {
  if (!url) {
    return '';
  }
  const u = new URL(url);
  const base = u.pathname.split('/').pop() || '';
  const idx = base.lastIndexOf('.');
  if (idx > 0) {
    return base.substring(idx + 1);
  }
  const seen: Record<string, number> = {};
  for (const e of u.searchParams.values()) {
    const base = e.split('/').pop() || '';
    const idx = base.lastIndexOf('.');
    if (idx > 0) {
      const ext = base.substring(idx + 1);
      if (ext.length > 12) {
        continue;
      }
      seen[ext] = (seen[ext] || 0) + 1;
    }
  }
  return Object.entries(seen).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

export function omitAsync<A extends any[], R, T>(fn: (...args: A) => R, res: T) {
  return (...args: A) => {
    Promise.resolve().then(() => fn(...args));
    return res;
  }
}
