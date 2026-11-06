import { describe, expect, it } from "vitest";
import w1 from "../../../boards/w1.json";
import w2 from "../../../boards/w2.json";
import type { Board } from "../game/types";
import { labelPoint } from "./hex";

const S3 = Math.sqrt(3);

/** Axial hex (pointy-top, size 1) containing pixel (x, y). */
function hexAt(x: number, y: number): string {
  const fq = (S3 / 3) * x - y / 3;
  const fr = (2 / 3) * y;
  const fs = -fq - fr;
  let q = Math.round(fq), r = Math.round(fr);
  const s = Math.round(fs);
  const [dq, dr, ds] = [Math.abs(q - fq), Math.abs(r - fr), Math.abs(s - fs)];
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return `${q},${r}`;
}

/** The whole badge (radius 0.42) must land on the district's own hexes. */
function badgeInside(board: Board, plan: number[], k: number) {
  for (let d = 0; d < k; d++) {
    const members = board.tiles.filter((_, i) => plan[i] === d);
    const own = new Set(members.map((t) => `${t.q},${t.r}`));
    const [x, y] = labelPoint(members)!;
    for (const rad of [0.15, 0.42])
      for (let a = 0; a < 24; a++) {
        const t = (a / 24) * 2 * Math.PI + 0.01;
        expect(own.has(hexAt(x + rad * Math.cos(t), y + rad * Math.sin(t))), `district ${d}`).toBe(true);
      }
  }
}

describe("labelPoint", () => {
  it("keeps every badge inside its district on the World 2 maps", () => {
    const b = w2 as unknown as Board;
    badgeInside(b, b.start, 5);
    for (const sols of Object.values(b.solutions ?? {})) for (const s of sols) badgeInside(b, s.plan, s.k);
  });

  it("keeps every badge inside its district on World 1", () => {
    const b = w1 as unknown as Board;
    badgeInside(b, b.start, b.rules.nDistricts);
    for (const sols of Object.values(b.solutions ?? {})) for (const s of sols) badgeInside(b, s.plan, s.k);
  });

  it("handles a C-shaped district whose centroid is outside it", () => {
    // ring of 6 around an empty centre: the old centroid badge sat on the hole
    const ring = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(([q, r]) => ({ q, r }));
    const [x, y] = labelPoint(ring)!;
    expect(hexAt(x, y)).not.toBe("0,0");
  });
});
