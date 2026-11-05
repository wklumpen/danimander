import type { Tile } from "../game/types";

const S3 = Math.sqrt(3);
export const AXIAL_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]] as const;
// Corner indices (pointy-top, corner k at 60k-30 deg, y down) shared with the neighbour in each direction.
const DIR_CORNERS = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]] as const;

export function center(t: Pick<Tile, "q" | "r">): [number, number] {
  return [S3 * (t.q + t.r / 2), 1.5 * t.r];
}

export function corner([x, y]: [number, number], k: number, size = 1): [number, number] {
  const a = (Math.PI / 180) * (60 * k - 30);
  return [x + size * Math.cos(a), y + size * Math.sin(a)];
}

export function hexPoints(t: Tile, size = 1): string {
  const c = center(t);
  return [0, 1, 2, 3, 4, 5].map((k) => corner(c, k, size).join(",")).join(" ");
}

export type Edge = { a: number; b: number | null; x1: number; y1: number; x2: number; y2: number };

/** Every hex edge once: shared edges (a<b) plus outer edges (b = null). */
export function edges(tiles: Tile[]): Edge[] {
  const idx = new Map(tiles.map((t, i) => [`${t.q},${t.r}`, i]));
  const out: Edge[] = [];
  tiles.forEach((t, i) => {
    const c = center(t);
    AXIAL_DIRS.forEach(([dq, dr], d) => {
      const j = idx.get(`${t.q + dq},${t.r + dr}`);
      if (j !== undefined && j < i) return;
      const [p1, p2] = DIR_CORNERS[d].map((k) => corner(c, k));
      out.push({ a: i, b: j ?? null, x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] });
    });
  });
  return out;
}

export function viewBox(tiles: Tile[], pad = 0.3): string {
  const cs = tiles.map(center);
  const xs = cs.map((c) => c[0]);
  const ys = cs.map((c) => c[1]);
  const x0 = Math.min(...xs) - S3 / 2 - pad;
  const y0 = Math.min(...ys) - 1 - pad;
  return `${x0} ${y0} ${Math.max(...xs) + S3 / 2 + pad - x0} ${Math.max(...ys) + 1 + pad - y0}`;
}
