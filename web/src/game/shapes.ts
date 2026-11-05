/**
 * Daily-puzzle map shapes: 25 hexes each, drawn as ASCII (odd rows are shifted half a hex
 * right, pointy-top "odd-r" layout). They rotate by puzzle number; #1 is the World 1 map.
 */
import type { Board, Tile } from "./types";

export type Shape = { name: string; rows: string[] };

export const SHAPES: Shape[] = [
  { name: "Coulee County", rows: [] }, // the World 1 board itself
  {
    name: "Badlands",
    rows: [
      "xxx...",
      "xxxxx.",
      ".xxxxx",
      ".xxxxx",
      "..xxxx",
      "...xxx",
    ],
  },
  {
    name: "Lakeland",
    rows: [
      ".xxxx.",
      "xxxxxx",
      "xx..xx",
      "xxx.xx",
      "xxxxxx",
    ],
  },
  {
    name: "Peace Country",
    rows: [
      "xxxxxx",
      "xxxxxx",
      "xxx...",
      "xxx...",
      "xxx...",
      "xxxx..",
    ],
  },
  {
    name: "Two Rivers",
    rows: [
      "xxxxxx",
      "xxxxx.",
      ".xxx..",
      "xxxxx.",
      "xxxxxx",
    ],
  },
];

const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]] as const;

export function hexAdjacency(coords: { q: number; r: number }[]): number[][] {
  const index = new Map(coords.map((c, i) => [`${c.q},${c.r}`, i]));
  return coords.map(({ q, r }) =>
    DIRS.map(([dq, dr]) => index.get(`${q + dq},${r + dr}`)).filter((j): j is number => j !== undefined).sort((a, b) => a - b),
  );
}

/** Geometry + decorative icons for a shape, keeping the template's parties and rules. */
export function shapeBoard(template: Board, shape: Shape): Board {
  if (!shape.rows.length) return template;
  const cells: { row: number; col: number }[] = [];
  shape.rows.forEach((line, row) => [...line].forEach((ch, col) => ch === "x" && cells.push({ row, col })));
  const coords = cells.map(({ row, col }) => ({ q: col - (row - (row & 1)) / 2, r: row }));
  const adjacency = hexAdjacency(coords);
  // A small town in the middle (the 3 hexes nearest the centroid), a couple of pumpjacks.
  const cx = cells.reduce((s, c) => s + c.col + (c.row & 1) / 2, 0) / cells.length;
  const cy = cells.reduce((s, c) => s + c.row, 0) / cells.length;
  const byCentre = cells.map((c, i) => [Math.hypot(c.col + (c.row & 1) / 2 - cx, (c.row - cy) * 0.87), i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const town = new Set(byCentre.slice(0, 3).map(([, i]) => i));
  const tiles: Tile[] = coords.map((c, i) => ({
    id: i,
    q: c.q,
    r: c.r,
    tier: 1,
    pop: 1,
    votes: Object.fromEntries(template.parties.map((p) => [p.id, 0])),
    muni: null,
    icon: town.has(i) ? "town" : i % 9 === 4 ? "pumpjack" : "farm",
    outline: null,
  }));
  if (tiles.length !== template.tiles.length) throw new Error(`shape ${shape.name} has ${tiles.length} hexes`);
  return { ...template, title: shape.name, tiles, adjacency, start: template.start };
}

export function shapeFor(puzzle: number): Shape {
  return SHAPES[(((puzzle - 1) % SHAPES.length) + SHAPES.length) % SHAPES.length];
}
