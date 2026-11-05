import type { Board } from "./types";

export type DistrictProblem = { district: number; kind: "size" | "disconnected" | "empty"; pop: number };

export function sizeBand(totalPop: number, nDistricts: number, band: number): [number, number] {
  const quota = totalPop / nDistricts;
  return [quota * (1 - band), quota * (1 + band)];
}

export function districtPops(board: Board, assignment: number[], nDistricts: number): number[] {
  const pops = new Array(nDistricts).fill(0);
  assignment.forEach((d, i) => (pops[d] += board.tiles[i].pop));
  return pops;
}

function isConnected(tiles: number[], inDistrict: (t: number) => boolean, adj: number[][]): boolean {
  if (tiles.length === 0) return false;
  const seen = new Set([tiles[0]]);
  const stack = [tiles[0]];
  while (stack.length) {
    const v = stack.pop()!;
    for (const w of adj[v]) {
      if (!seen.has(w) && inDistrict(w)) {
        seen.add(w);
        stack.push(w);
      }
    }
  }
  return seen.size === tiles.length;
}

/** All problems with a plan. Empty array == valid (mirrors pipeline/solver.py validate_plan). */
export function validatePlan(board: Board, assignment: number[], nDistricts = board.rules.nDistricts): DistrictProblem[] {
  const total = board.tiles.reduce((s, t) => s + t.pop, 0);
  const [lo, hi] = sizeBand(total, nDistricts, board.rules.band);
  const pops = districtPops(board, assignment, nDistricts);
  const problems: DistrictProblem[] = [];
  for (let d = 0; d < nDistricts; d++) {
    const tiles = assignment.flatMap((a, i) => (a === d ? [i] : []));
    if (tiles.length === 0) {
      problems.push({ district: d, kind: "empty", pop: 0 });
      continue;
    }
    if (pops[d] < lo - 1e-9 || pops[d] > hi + 1e-9) problems.push({ district: d, kind: "size", pop: pops[d] });
    if (!isConnected(tiles, (t) => assignment[t] === d, board.adjacency))
      problems.push({ district: d, kind: "disconnected", pop: pops[d] });
  }
  return problems;
}

/** Districts the tile may move into: any other district with a tile adjacent to it. */
export function moveTargets(board: Board, assignment: number[], tile: number): Set<number> {
  const out = new Set<number>();
  for (const n of board.adjacency[tile]) if (assignment[n] !== assignment[tile]) out.add(assignment[n]);
  return out;
}
