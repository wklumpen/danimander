import { describe, expect, it } from "vitest";
import boardJson from "../../../boards/w1.json";
import { DAILY_EPOCH, dailyBoard, puzzleNumber } from "./daily";
import { runElection } from "./play";
import { SHAPES, shapeBoard, shapeFor } from "./shapes";
import { boardPlans, parFor } from "./solver";
import type { Board } from "./types";
import { validatePlan } from "./validate";

const w1 = boardJson as unknown as Board;
const dateOf = (n: number) => new Date(Date.parse(DAILY_EPOCH) + (n - 1) * 86_400_000).toISOString().slice(0, 10);

describe("daily shapes", () => {
  it.each(SHAPES.map((s) => [s.name, s] as const))("%s: 25 connected hexes with plenty of maps", (_, shape) => {
    const b = shapeBoard(w1, shape);
    expect(b.tiles).toHaveLength(25);
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) for (const j of b.adjacency[stack.pop()!]) if (!seen.has(j)) (seen.add(j), stack.push(j));
    expect(seen.size).toBe(25);
    const t0 = performance.now();
    const n = boardPlans(b).length;
    console.log(`${shape.name}: ${n} maps in ${Math.round(performance.now() - t0)} ms`);
    expect(n).toBeGreaterThan(500);
  });

  it("rotate by puzzle number, starting with the World 1 map", () => {
    expect(shapeFor(1).name).toBe("Coulee County");
    expect(new Set([1, 2, 3, 4, 5].map((n) => shapeFor(n).name)).size).toBe(SHAPES.length);
    expect(dailyBoard(w1, dateOf(1)).tiles.map((t) => [t.q, t.r])).toEqual(w1.tiles.map((t) => [t.q, t.r]));
  });

  it("every shape produces valid two-way puzzles for 10 days running", () => {
    for (let n = 1; n <= 10 * SHAPES.length; n++) {
      const date = dateOf(n);
      expect(puzzleNumber(date)).toBe(n);
      const b = dailyBoard(w1, date);
      expect(b.title).toContain(shapeFor(n).name);
      expect(validatePlan(b, b.start)).toEqual([]);
      for (const task of b.tasks) {
        expect(runElection(b, task, b.start).met).toBe(false);
        expect(parFor(b, task.goal!)).toBe(task.par);
      }
    }
  });
});
