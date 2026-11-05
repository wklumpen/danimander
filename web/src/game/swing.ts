import type { PartyId, Tile } from "./types";

/**
 * Uniform swing: add `s` to `party`'s share on every tile (clamped to [0,1]); the other
 * parties are scaled proportionally to fill the remainder. Tile vote totals are preserved.
 */
export function applySwing(tiles: Tile[], party: PartyId, s: number): Record<PartyId, number>[] {
  return tiles.map((t) => {
    const total = Object.values(t.votes).reduce((a, b) => a + b, 0);
    if (total === 0) return { ...t.votes };
    const share = Math.min(1, Math.max(0, t.votes[party] / total + s));
    const othersTotal = total - t.votes[party];
    const out: Record<PartyId, number> = {};
    const nOthers = Object.keys(t.votes).length - 1;
    for (const [p, v] of Object.entries(t.votes)) {
      if (p === party) out[p] = share * total;
      else out[p] = othersTotal > 0 ? (v / othersTotal) * (1 - share) * total : ((1 - share) * total) / nOthers;
    }
    return out;
  });
}
