/**
 * "Tiles changed" meter: tiles whose district differs from the start map, after matching
 * district labels start<->current by maximum overlap (Hungarian), so relabelling is free.
 */

/** Min-cost assignment for a square matrix (O(n^3), e-maxx formulation). Returns col for each row. */
export function hungarian(cost: number[][]): number[] {
  const n = cost.length;
  const INF = Number.POSITIVE_INFINITY;
  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0);
  const way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(INF);
    const used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const rowToCol = new Array(n).fill(-1);
  for (let j = 1; j <= n; j++) if (p[j]) rowToCol[p[j] - 1] = j - 1;
  return rowToCol;
}

/** Map start district -> current district label that best overlaps it. */
export function matchDistricts(start: number[], current: number[]): number[] {
  const k = Math.max(Math.max(...start), Math.max(...current)) + 1;
  const overlap = Array.from({ length: k }, () => new Array(k).fill(0));
  start.forEach((a, i) => overlap[a][current[i]]++);
  return hungarian(overlap.map((row) => row.map((x) => -x)));
}

export function tilesChanged(start: number[], current: number[]): number {
  const match = matchDistricts(start, current);
  return start.reduce((n, a, i) => n + (match[a] === current[i] ? 0 : 1), 0);
}

/** Per-tile flag: has this tile's district changed (after label matching)? */
export function changedTiles(start: number[], current: number[]): boolean[] {
  const match = matchDistricts(start, current);
  return start.map((a, i) => match[a] !== current[i]);
}
