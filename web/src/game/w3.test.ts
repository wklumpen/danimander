import { describe, expect, it } from "vitest";
import boardJson from "../../../boards/w3.json";
import fixtures from "../../../boards/fixtures/w3.json";
import { tilesChanged } from "./drift";
import { allowedTargets, canPlay, crossesLimit, drift, initPlay, overCap, playReducer, runElection, type PlayState } from "./play";
import { seatTally, winners } from "./score";
import { hint } from "./solver";
import type { Board, PowerId, Task } from "./types";
import { moveTargets, validatePlan } from "./validate";

const b = boardJson as unknown as Board;
const k = b.rules.nDistricts;
const cap = b.rules.driftCap!;
const [ta, tb] = b.tasks;

describe("w3 parity with pipeline fixtures", () => {
  it.each(fixtures.cases.map((c, i) => [i, c] as const))("case %i", (_, c) => {
    expect(validatePlan(b, c.assignment, k, false).length === 0).toBe(c.valid);
    expect(validatePlan(b, c.assignment, k, true).length === 0).toBe(c.validLocked);
    expect(tilesChanged(b.start, c.assignment)).toBe(c.tilesChanged);
    expect(winners(b, c.assignment, k)).toEqual(c.winners);
  });
});

describe("w3 board", () => {
  it("start respects the limits, is a fair 3–2 Opposition, and meets neither goal", () => {
    expect(validatePlan(b, b.start)).toEqual([]);
    expect(seatTally(b, winners(b, b.start, k))).toEqual({ government: 2, opposition: 3 });
    expect(runElection(b, ta, b.start).met).toBe(false);
    expect(runElection(b, tb, b.start).met).toBe(false);
  });
  it("only two cards: Erase the City Limits and Toss the Ref's Report", () => {
    expect(b.rules.powers).toEqual(["limits", "toss"]);
  });
  it("every shipped solution wins, and every Task A solution breaks the limits", () => {
    for (const t of [ta, tb])
      for (const s of b.solutions![t.id]) {
        expect(validatePlan(b, s.plan, s.k, false)).toEqual([]);
        expect(runElection(b, t, s.plan).met).toBe(true);
      }
    for (const s of b.solutions!.ta) expect(validatePlan(b, s.plan, k, true).some((p) => p.kind === "mixed")).toBe(true);
  });
  it("the best Task A route (erase penalty included) needs exactly one toss", () => {
    const best = Math.min(...b.solutions!.ta.map((s) => tilesChanged(b.start, s.plan)));
    expect(best).toBe(b.stats.bestDrift!.ta);
    const need = best + b.rules.limitsScrutiny!;
    expect(need).toBeGreaterThan(cap);
    expect(need).toBeLessThanOrEqual(2 * cap);
  });
});

describe("city limits", () => {
  const reduce = playReducer(b);
  it("while locked, a hex can't cross into a district on the other side", () => {
    const s = initPlay(b);
    const t = b.tiles.findIndex((_, i) => [...moveTargets(b, s.assignment, i)].some((d) => crossesLimit(b, s, i, d)));
    const d = [...moveTargets(b, s.assignment, t)].find((x) => crossesLimit(b, s, t, x))!;
    expect(allowedTargets(b, s, t).has(d)).toBe(false);
    expect(reduce(reduce(s, { type: "tap", tile: t }), { type: "tap", tile: s.assignment.indexOf(d) }).assignment).toEqual(s.assignment);
    const open = reduce(s, { type: "power", id: "limits" });
    expect(crossesLimit(b, open, t, d)).toBe(false);
  });
  it("erasing the limits adds scrutiny, and can't be played if it would go over the cap", () => {
    const s = reduce(initPlay(b), { type: "power", id: "limits" });
    expect(drift(s)).toBe(b.rules.limitsScrutiny);
    const nearCap = { ...initPlay(b), penalty: cap - 1 };
    expect(canPlay(b, nearCap, "limits")).toBe(b.rules.limitsScrutiny! <= 1);
  });
});

describe("scrutiny + toss", () => {
  const reduce = playReducer(b);
  /** Make legal moves (any) until scrutiny hits the cap. */
  const fill = (s0: PlayState) => {
    let s = reduce(s0, { type: "power", id: "limits" });
    for (let guard = 0; guard < 200 && drift(s) < cap; guard++) {
      const t = b.tiles.findIndex((_, i) => allowedTargets(b, s, i).size > 0 && s.assignment[i] === b.start[i]);
      s = reduce(s, { type: "move", tile: t, district: [...allowedTargets(b, s, t)][0] });
    }
    return s;
  };
  it("refuses moves past the cap; tossing the report resets it", () => {
    let s = fill(initPlay(b));
    expect(drift(s)).toBe(cap);
    const t = b.tiles.findIndex((_, i) => s.assignment[i] === b.start[i] && moveTargets(b, s.assignment, i).size > 0);
    const d = [...moveTargets(b, s.assignment, t)][0];
    expect(overCap(s, t, d)).toBe(true);
    expect(reduce(s, { type: "move", tile: t, district: d })).toBe(s);
    s = reduce(s, { type: "power", id: "toss" });
    expect(drift(s)).toBe(0); // the erase penalty goes too: the old map no longer counts
    expect(canPlay(b, s, "toss")).toBe(false);
    expect(reduce(s, { type: "move", tile: t, district: d }).assignment[t]).toBe(d);
  });
});

describe("w3 hints", () => {
  const solve = (task: Task, init?: { assignment: number[]; driftCap?: number; muniLock?: boolean }) => {
    const reduce = playReducer(b, init);
    let s = initPlay(b, init);
    const cards: PowerId[] = [];
    for (let i = 0; i < 60; i++) {
      const h = hint(b, task.goal!, s.assignment, { taskId: task.id, nDistricts: s.nDistricts, muniLock: s.muniLock, canPlay: (id) => canPlay(b, s, id) });
      if (!h) break;
      // mirror Session: a move that would go over the cap means "toss first"
      const card: PowerId | null = "card" in h ? h.card : overCap(s, h.tile, h.district) && canPlay(b, s, "toss") ? "toss" : null;
      if (card) {
        cards.push(card);
        s = reduce(s, { type: "power", id: card });
        continue;
      }
      if ("card" in h) break;
      const next = reduce(s, { type: "move", tile: h.tile, district: h.district });
      expect(next).not.toBe(s); // every hinted move is allowed
      s = next;
    }
    return { s, cards };
  };
  it("Task A: hints play Erase the City Limits, then Toss the Ref's Report, then win", () => {
    const { s, cards } = solve(ta);
    expect(cards).toEqual(["limits", "toss"]);
    expect(runElection(b, ta, s.assignment).met).toBe(true);
  });
  it("Task B from a Government map: the adaptive cap leaves a route", () => {
    const aMap = b.solutions!.ta[0].plan;
    const d = Math.min(...b.solutions!.tb.map((x) => tilesChanged(aMap, x.plan)));
    const capB = Math.max(cap, Math.ceil(d / 2));
    // In Task B the limits are already gone (the Government erased them)
    const { s, cards } = solve(tb, { assignment: aMap, driftCap: capB, muniLock: false });
    expect(cards).not.toContain("limits");
    expect(runElection(b, tb, s.assignment).met).toBe(true);
  });
});
