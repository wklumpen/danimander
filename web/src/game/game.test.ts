import { describe, expect, it } from "vitest";
import board from "../../../boards/w1.json";
import fixtures from "../../../boards/fixtures/w1.json";
import { decodePlan, encodePlan } from "./encode";
import { hungarian, tilesChanged } from "./drift";
import { seatTally, winners } from "./score";
import { applySwing } from "./swing";
import type { Board } from "./types";
import { moveTargets, validatePlan } from "./validate";

const b = board as unknown as Board;
const k = b.rules.nDistricts;

describe("parity with pipeline/validate.py fixtures", () => {
  it.each(fixtures.cases.map((c, i) => [i, c] as const))("case %i", (_, c) => {
    expect(validatePlan(b, c.assignment).length === 0).toBe(c.valid);
    expect(tilesChanged(b.start, c.assignment)).toBe(c.tilesChanged);
    expect(winners(b, c.assignment, k)).toEqual(c.winners);
  });
});

describe("board w1", () => {
  it("start map is valid and 3-2 Blue", () => {
    expect(validatePlan(b, b.start)).toEqual([]);
    expect(seatTally(b, winners(b, b.start, k))).toEqual({ blue: 3, orange: 2 });
  });

  it("single move makes the map temporarily invalid", () => {
    const t = b.tiles.findIndex((_, i) => moveTargets(b, b.start, i).size > 0);
    const target = [...moveTargets(b, b.start, t)][0];
    const next = [...b.start];
    next[t] = target;
    expect(validatePlan(b, next).map((p) => p.kind)).toContain("size");
    expect(tilesChanged(b.start, next)).toBe(1);
  });

  it("relabelling districts is not counted as change", () => {
    const relabelled = b.start.map((d) => (d + 1) % k);
    expect(tilesChanged(b.start, relabelled)).toBe(0);
  });
});

describe("hungarian", () => {
  it("finds the min-cost assignment", () => {
    const cost = [
      [4, 1, 3],
      [2, 0, 5],
      [3, 2, 2],
    ];
    const a = hungarian(cost);
    expect(a.reduce((s, c, r) => s + cost[r][c], 0)).toBe(5);
  });
});

describe("encode", () => {
  it("round-trips a plan", () => {
    const assignment = [...b.start];
    assignment[3] = (assignment[3] + 1) % k;
    const plan = { boardId: "w1", taskId: "t1", role: "orange", assignment, powersUsed: [], nDistricts: k };
    expect(decodePlan(encodePlan(plan, b.start), () => b.start)).toEqual(plan);
  });

  it("rejects garbage without throwing", () => {
    expect(decodePlan("#b=w1&t=t1&p=nope", () => b.start)).toBeNull();
    expect(decodePlan("", () => b.start)).toBeNull();
    expect(decodePlan("#b=zz&t=t1&p=x", () => undefined)).toBeNull();
  });
});

describe("swing", () => {
  it("shifts share and preserves totals", () => {
    const tiles = [{ ...b.tiles[0], votes: { a: 60, b: 40 } }];
    const [v] = applySwing(tiles, "a", -0.03);
    expect(v.a).toBeCloseTo(57);
    expect(v.b).toBeCloseTo(43);
    expect(applySwing(tiles, "a", 0.9)[0].a).toBe(100);
  });
});
