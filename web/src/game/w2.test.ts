import { describe, expect, it } from "vitest";
import boardJson from "../../../boards/w2.json";
import fixtures from "../../../boards/fixtures/w2.json";
import { tilesChanged } from "./drift";
import { canPlay, continueInit, crossesLimit, drift, initPlay, overCap, playReducer, runElection, taskBoard, type PlayInit } from "./play";
import { seatTally, winners } from "./score";
import { boardPlans, hint } from "./solver";
import type { Board, PowerId, Task } from "./types";
import { validatePlan } from "./validate";

const b = boardJson as unknown as Board;
const k = b.rules.nDistricts;
const [l1, l2, l3] = b.tasks;

describe("w2 parity with pipeline fixtures", () => {
  it.each(fixtures.cases.map((c, i) => [i, c] as const))("case %i", (_, c) => {
    expect(validatePlan(b, c.assignment, k, false).length === 0).toBe(c.valid);
    expect(validatePlan(b, c.assignment, k, true).length === 0).toBe(c.validLocked);
    expect(tilesChanged(b.start, c.assignment)).toBe(c.tilesChanged);
    expect(winners(b, c.assignment, k)).toEqual(c.winners);
  });
});

describe("w2 board (Prairie City)", () => {
  it("is small: 15 hexes, 3 districts", () => {
    expect(b.tiles.length).toBe(15);
    expect(k).toBe(3);
  });
  it("starts fair (Opposition 2–1) and inside the city limits", () => {
    expect(validatePlan(b, b.start)).toEqual([]);
    expect(seatTally(b, winners(b, b.start, k))).toEqual({ government: 1, opposition: 2 });
  });
  it("while the limits hold, no map gives the Government a majority", () => {
    const locked = boardPlans(b).filter((p) => validatePlan(b, Array.from(p), k, true).length === 0);
    expect(locked.length).toBeGreaterThan(0);
    for (const p of locked) expect(runElection(b, l1, Array.from(p)).met).toBe(false);
  });
  it("one new card per level: Erase first, then Toss as well, then Toss alone", () => {
    expect(taskBoard(b, l1).rules.powers).toEqual(["limits"]);
    expect(taskBoard(b, l2).rules.powers).toEqual(["limits", "toss"]);
    expect(taskBoard(b, l3).rules.powers).toEqual(["toss"]);
  });
  it("scrutiny only from level 2, and its cap needs exactly one toss", () => {
    expect(initPlay(taskBoard(b, l1)).cap).toBeUndefined();
    const cap = l2.driftCap!;
    const need = b.stats.bestDrift!.l2 + b.rules.limitsScrutiny!;
    expect(need).toBeGreaterThan(cap);
    expect(need).toBeLessThanOrEqual(2 * cap);
  });
  it("every shipped solution wins", () => {
    for (const t of b.tasks)
      for (const s of b.solutions![t.id]) {
        expect(validatePlan(b, s.plan, s.k, false)).toEqual([]);
        expect(runElection(b, t, s.plan).met).toBe(true);
      }
  });
});

/** Follow hints only (mirroring Session: a move over the cap means "toss first"). */
function solve(board: Board, task: Task, init?: PlayInit) {
  const reduce = playReducer(board, init);
  let s = initPlay(board, init);
  const cards: PowerId[] = [];
  for (let i = 0; i < 40; i++) {
    const h = hint(board, task.goal!, s.assignment, { taskId: task.id, nDistricts: s.nDistricts, muniLock: s.muniLock, canPlay: (id) => canPlay(board, s, id) });
    if (!h) break;
    const card: PowerId | null = "card" in h ? h.card : overCap(s, h.tile, h.district) && canPlay(board, s, "toss") ? "toss" : null;
    if (card) {
      cards.push(card);
      s = reduce(s, { type: "power", id: card });
      continue;
    }
    if ("card" in h) break;
    const next = reduce(s, { type: "move", tile: h.tile, district: h.district });
    expect(next).not.toBe(s);
    s = next;
  }
  return { s, cards };
}

describe("w2 levels, by hints alone", () => {
  it("level 1: erase the limits, then win", () => {
    const { s, cards } = solve(taskBoard(b, l1), l1);
    expect(cards).toEqual(["limits"]);
    expect(runElection(b, l1, s.assignment).met).toBe(true);
  });
  it("level 2: erase, toss the report, then win", () => {
    const { s, cards } = solve(taskBoard(b, l2), l2);
    expect(cards).toEqual(["limits", "toss"]);
    expect(runElection(b, l2, s.assignment).met).toBe(true);
  });
  it("level 3: from any Government map, the Opposition can sweep with one toss at most", () => {
    for (const a of b.solutions!.l2) {
      const tb = taskBoard(b, l3);
      const init = continueInit(b, l3, a.plan, k);
      expect(init.muniLock).toBe(false);
      const { s, cards } = solve(tb, l3, init);
      expect(cards.filter((c) => c === "toss").length).toBeLessThanOrEqual(1);
      expect(runElection(b, l3, s.assignment).met).toBe(true);
    }
  });
  it("in level 1, a city hex can't join the farm district until the limits go", () => {
    const tb = taskBoard(b, l1);
    const s = initPlay(tb);
    const farmD = s.assignment[0];
    const city = b.tiles.findIndex((t, i) => t.muni === "City" && b.adjacency[i].some((j) => s.assignment[j] === farmD));
    expect(crossesLimit(tb, s, city, farmD)).toBe(true);
    const open = playReducer(tb)(s, { type: "power", id: "limits" });
    expect(crossesLimit(tb, open, city, farmD)).toBe(false);
    expect(drift(open)).toBe(b.rules.limitsScrutiny); // counted, but level 1 has no cap
  });
});
