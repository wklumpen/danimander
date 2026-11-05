/**
 * Browser-side solver for small unit-population boards (mirrors pipeline/solver.py).
 * Enumerates every valid plan once; hints and daily puzzles are cheap lookups on top.
 */
import { matchDistricts, tilesChanged } from "./drift";
import type { Board, Goal } from "./types";

/** All partitions into n connected districts of size in [lo, hi], canonical labels. */
export function enumeratePlans(adj: number[][], n: number, lo: number, hi: number): Int8Array[] {
  const N = adj.length;
  const out: Int8Array[] = [];
  const assignment = new Int8Array(N).fill(-1);
  const free = new Uint8Array(N).fill(1);
  let nFree = N;

  const componentsOk = (remaining: number) => {
    if (!(remaining * lo <= nFree && nFree <= remaining * hi)) return false;
    const seen = new Uint8Array(N);
    for (let s = 0; s < N; s++) {
      if (!free[s] || seen[s]) continue;
      let size = 0;
      const stack = [s];
      seen[s] = 1;
      while (stack.length) {
        const v = stack.pop()!;
        size++;
        for (const w of adj[v]) if (free[w] && !seen[w]) (seen[w] = 1), stack.push(w);
      }
      let ok = false;
      for (let m = 1; m <= remaining && !ok; m++) ok = m * lo <= size && size <= m * hi;
      if (!ok) return false;
    }
    return true;
  };

  const place = (tiles: number[], d: number) => {
    for (const t of tiles) (assignment[t] = d), (free[t] = 0);
    nFree -= tiles.length;
  };
  const unplace = (tiles: number[]) => {
    for (const t of tiles) (assignment[t] = -1), (free[t] = 1);
    nFree += tiles.length;
  };

  const rec = (d: number) => {
    if (d === n) {
      if (nFree === 0) out.push(assignment.slice());
      return;
    }
    let root = 0;
    while (!free[root]) root++;
    // ESU enumeration of connected sets containing root (each produced exactly once).
    const extend = (current: number[], ext: number[], nbhd: Set<number>) => {
      if (current.length >= lo) {
        place(current, d);
        const remaining = n - d - 1;
        if (remaining === 0 ? nFree === 0 : nFree > 0 && componentsOk(remaining)) rec(d + 1);
        unplace(current);
      }
      if (current.length === hi) return;
      const e = ext.slice();
      while (e.length) {
        const w = e.pop()!;
        const fresh = adj[w].filter((u) => free[u] && !nbhd.has(u));
        const nb2 = new Set(nbhd);
        for (const u of fresh) nb2.add(u);
        extend([...current, w], [...e, ...fresh], nb2);
      }
    };
    const ext0 = adj[root].filter((u) => free[u]);
    extend([root], ext0, new Set([root, ...ext0]));
  };

  rec(0);
  return out;
}

export function intBand(nTiles: number, nDistricts: number, band: number): [number, number] {
  const q = nTiles / nDistricts;
  return [Math.ceil(q * (1 - band) - 1e-9), Math.floor(q * (1 + band) + 1e-9)];
}

/** Seats per party index for one plan (binary/fractional votes, no ties expected). */
export function planSeats(plan: ArrayLike<number>, votes: number[][], nDistricts: number): number[] {
  const nParties = votes[0].length;
  const totals = Array.from({ length: nDistricts }, () => new Array(nParties).fill(0));
  for (let i = 0; i < plan.length; i++) for (let p = 0; p < nParties; p++) totals[plan[i]][p] += votes[i][p];
  const seats = new Array(nParties).fill(0);
  for (const t of totals) {
    let best = 0;
    for (let p = 1; p < nParties; p++) if (t[p] > t[best]) best = p;
    seats[best]++;
  }
  return seats;
}

export function cutEdges(plan: ArrayLike<number>, adj: number[][]): number {
  let c = 0;
  adj.forEach((ns, i) => ns.forEach((j) => i < j && plan[i] !== plan[j] && c++));
  return c;
}

// ---------------------------------------------------------------------------
// Board-level helpers (cached per board)
// ---------------------------------------------------------------------------

const planCache = new Map<string, Int8Array[]>();

/** All valid plans for a unit-pop board, keyed by its geometry so boards sharing a silhouette share work. */
export function boardPlans(board: Pick<Board, "adjacency" | "rules" | "tiles">): Int8Array[] {
  const key = `${board.rules.nDistricts}|${board.rules.band}|${JSON.stringify(board.adjacency)}`;
  let plans = planCache.get(key);
  if (!plans) {
    const [lo, hi] = intBand(board.tiles.length, board.rules.nDistricts, board.rules.band);
    plans = enumeratePlans(board.adjacency, board.rules.nDistricts, lo, hi);
    planCache.set(key, plans);
  }
  return plans;
}

export function votesMatrix(board: Board): number[][] {
  return board.tiles.map((t) => board.parties.map((p) => t.votes[p.id] ?? 0));
}

export function goalPlans(board: Board, goal: Goal): Int8Array[] {
  const votes = votesMatrix(board);
  const pi = board.parties.findIndex((p) => p.id === goal.party);
  return boardPlans(board).filter((p) => planSeats(p, votes, board.rules.nDistricts)[pi] >= goal.minSeats);
}

export type Hint = { tile: number; district: number; remaining: number };

/**
 * Suggest one move toward the nearest goal-satisfying plan. The suggested move is always legal
 * (tile is adjacent to the target district); prefers moves out of oversized into undersized districts.
 */
export function hint(board: Board, goal: Goal, current: number[]): Hint | null {
  const targets = goalPlans(board, goal);
  if (!targets.length) return null;
  let best: Int8Array | null = null;
  let bestD = Infinity;
  for (const p of targets) {
    const d = tilesChanged(Array.from(p), current);
    if (d < bestD) [best, bestD] = [p, d];
  }
  if (!best || bestD === 0) return null;
  // match[planDistrict] = current label
  const match = matchDistricts(Array.from(best), current);
  const k = board.rules.nDistricts;
  const size = new Array(k).fill(0);
  current.forEach((d) => size[d]++);
  const quota = board.tiles.length / k;
  let pick: Hint | null = null;
  let pickScore = -Infinity;
  current.forEach((d, i) => {
    const want = match[best![i]];
    if (want === d) return;
    if (!board.adjacency[i].some((j) => current[j] === want)) return;
    const score = (size[d] - quota) + (quota - size[want]) - i * 1e-3; // deterministic tiebreak
    if (score > pickScore) [pick, pickScore] = [{ tile: i, district: want, remaining: bestD }, score];
  });
  return pick;
}

/** Minimum tiles changed from start to any goal plan. */
export function parFor(board: Board, goal: Goal, start = board.start): number | null {
  let best = Infinity;
  for (const p of goalPlans(board, goal)) best = Math.min(best, tilesChanged(start, Array.from(p)));
  return Number.isFinite(best) ? best : null;
}
