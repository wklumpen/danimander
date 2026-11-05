import type { Board, PartyId } from "./types";

type Votes = Record<PartyId, number>[];

export function districtVotes(board: Board, assignment: number[], nDistricts: number, votes?: Votes) {
  const parties = board.parties.map((p) => p.id);
  const totals = Array.from({ length: nDistricts }, () => Object.fromEntries(parties.map((p) => [p, 0])));
  assignment.forEach((d, i) => {
    const v = votes ? votes[i] : board.tiles[i].votes;
    for (const p of parties) totals[d][p] += v[p] ?? 0;
  });
  return totals as Record<PartyId, number>[];
}

/**
 * Winner per district. Ties go to `tiebreak[d]` when given (the start-map winner of the
 * matched district, per SPEC §4.5), otherwise null.
 */
export function winners(
  board: Board,
  assignment: number[],
  nDistricts: number,
  opts: { votes?: Votes; tiebreak?: (PartyId | null)[] } = {},
): (PartyId | null)[] {
  return districtVotes(board, assignment, nDistricts, opts.votes).map((totals, d) => {
    const max = Math.max(...Object.values(totals));
    const top = Object.keys(totals).filter((p) => Math.abs(totals[p] - max) < 1e-9);
    if (top.length === 1) return top[0];
    const tb = opts.tiebreak?.[d];
    return tb && top.includes(tb) ? tb : null;
  });
}

export function seatTally(board: Board, w: (PartyId | null)[]): Record<PartyId, number> {
  const tally = Object.fromEntries(board.parties.map((p) => [p.id, 0]));
  for (const p of w) if (p) tally[p]++;
  return tally;
}

export function voteShare(board: Board): Record<PartyId, number> {
  const totals = Object.fromEntries(board.parties.map((p) => [p.id, 0]));
  for (const t of board.tiles) for (const p of board.parties) totals[p.id] += t.votes[p.id] ?? 0;
  const sum = Object.values(totals).reduce((a, b) => a + b, 0);
  for (const p of Object.keys(totals)) totals[p] /= sum;
  return totals;
}
