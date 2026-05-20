/**
 * Tiny fuzzy match: returns a score in [0,1] for how well `query` matches `target`.
 * Higher is better. Returns 0 for no match.
 *
 * - Exact prefix → 1
 * - Substring → 0.7–0.9 (earlier is higher)
 * - All chars of query appear in order within target → 0.3–0.6
 * - Otherwise 0
 *
 * No external dep, fast enough for thousands of items client-side.
 */
export function fuzzyScore(query: string, target: string): number {
  if (!query) return 1;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();

  if (!q || !t) return 0;
  if (t === q) return 1;
  if (t.startsWith(q)) return 0.95;

  const idx = t.indexOf(q);
  if (idx >= 0) {
    // Substring match — score higher if it starts earlier
    return 0.9 - Math.min(idx / t.length, 0.2);
  }

  // Subsequence match: all chars of q appear in order in t
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    let found = -1;
    while (ti < t.length) {
      if (t[ti] === c) { found = ti; ti++; break; }
      ti++;
    }
    if (found === -1) return 0;
  }
  // Reward if subsequence is tight (less spread)
  const spread = ti - q.length;
  return 0.6 - Math.min(spread / 30, 0.3);
}

export function fuzzyMatch<T>(query: string, items: T[], getStrings: (item: T) => string[]): T[] {
  if (!query) return items;
  return items
    .map((item) => {
      const strings = getStrings(item);
      const best = Math.max(...strings.map((s) => fuzzyScore(query, s)));
      return { item, score: best };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
