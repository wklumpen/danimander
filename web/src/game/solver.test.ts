import { describe, expect, it } from "vitest";
import boardJson from "../../../boards/w1.json";
import { albertaDate, dailyBoard, puzzleNumber } from "./daily";
import { runElection } from "./play";
import { boardPlans, hint, parFor } from "./solver";
import type { Board } from "./types";
import { moveTargets, validatePlan } from "./validate";

const board = boardJson as unknown as Board;

describe("TS solver parity with pipeline", () => {
  it("enumerates the same number of plans", () => {
    const t0 = performance.now();
    expect(boardPlans(board).length).toBe(board.stats.nPlans);
    console.log(`enumerated in ${Math.round(performance.now() - t0)} ms`);
  });
  it("computes the same par", () => {
    for (const t of board.tasks.filter((t) => t.goal)) expect(parFor(board, t.goal!)).toBe(t.par);
  });
});

describe("hint", () => {
  it.each(board.tasks.filter((t) => t.goal).map((t) => [t.id, t] as const))("following hints solves %s", (_, task) => {
    let a = [...board.start];
    for (let step = 0; step < 30; step++) {
      const h = hint(board, task.goal!, a);
      if (!h) break;
      expect(moveTargets(board, a, h.tile).has(h.district)).toBe(true);
      a = [...a];
      a[h.tile] = h.district;
    }
    expect(validatePlan(board, a)).toEqual([]);
    expect(runElection(board, task, a).met).toBe(true);
  });
  it("returns null when already solved", () => {
    expect(hint(board, board.tasks[0].goal!, board.examples!.t1)).toBeNull();
  });
});

describe("daily", () => {
  it("is deterministic and valid across many dates", () => {
    const t0 = performance.now();
    for (let d = 0; d < 30; d++) {
      const date = new Date(Date.UTC(2026, 10, 6 + d)).toISOString().slice(0, 10);
      const b = dailyBoard(board, date);
      expect(validatePlan(b, b.start)).toEqual([]);
      expect(b.tasks.map((t) => t.id)).toEqual(["pack", "crack"]);
      for (const task of b.tasks) {
        expect(runElection(b, task, b.start).met).toBe(false);
        expect(parFor(b, task.goal!)).toBe(task.par);
        expect(task.par).toBeGreaterThanOrEqual(3);
        expect(task.par).toBeLessThanOrEqual(6);
      }
      expect(dailyBoard(board, date)).toEqual(b);
    }
    console.log(`30 dailies in ${Math.round(performance.now() - t0)} ms`);
  });
  it("numbers and dates", () => {
    expect(puzzleNumber("2026-11-05")).toBe(1);
    expect(puzzleNumber("2026-12-05")).toBe(31);
    expect(albertaDate(new Date("2026-11-06T05:00:00Z"))).toBe("2026-11-05"); // 10pm MST
  });
});

describe("districts never disappear", () => {
  const k = board.rules.nDistricts;
  const allPresent = (a: number[]) => new Set(a).size === k;

  it("a district's last hex has no move targets", () => {
    // Shrink district 0 to one hex by moving its other tiles out one at a time.
    let a = [...board.start];
    for (let guard = 0; guard < 50 && a.filter((d) => d === 0).length > 1; guard++) {
      const t = a.findIndex((d, i) => d === 0 && moveTargets(board, a, i).size > 0);
      a = [...a];
      a[t] = [...moveTargets(board, a, t)][0];
    }
    const last = a.indexOf(0);
    expect(a.filter((d) => d === 0)).toHaveLength(1);
    expect(moveTargets(board, a, last).size).toBe(0);
  });

  it("random legal play and hints always keep every district", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    let a = [...board.start];
    for (let step = 0; step < 400; step++) {
      const t = Math.floor(rand() * a.length);
      const opts = [...moveTargets(board, a, t)];
      if (!opts.length) continue;
      a = [...a];
      a[t] = opts[Math.floor(rand() * opts.length)];
      expect(allPresent(a)).toBe(true);
      if (step % 40 === 0) {
        // From any scrambled state, following hints stays legal and keeps all districts.
        let h = [...a];
        for (let i = 0; i < 40; i++) {
          const m = hint(board, board.tasks[0].goal!, h);
          if (!m) break;
          expect(moveTargets(board, h, m.tile).has(m.district)).toBe(true);
          h = [...h];
          h[m.tile] = m.district;
          expect(allPresent(h)).toBe(true);
        }
      }
    }
  });
});
