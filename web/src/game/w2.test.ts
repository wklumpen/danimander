import { describe, expect, it } from "vitest";
import boardJson from "../../../boards/w2.json";
import fixtures from "../../../boards/fixtures/w2.json";
import { tilesChanged } from "./drift";
import { canPlay, drift, initPlay, playReducer, runElection } from "./play";
import { seatTally, winners } from "./score";
import { hint } from "./solver";
import type { Board, PowerId } from "./types";
import { moveTargets, validatePlan } from "./validate";

const b = boardJson as unknown as Board;
const k = b.rules.nDistricts;
const [ta, tb] = b.tasks;

describe("w2 parity with pipeline fixtures", () => {
  it.each(fixtures.cases.map((c, i) => [i, c] as const))("case %i", (_, c) => {
    expect(validatePlan(b, c.assignment, k, false).length === 0).toBe(c.valid);
    expect(validatePlan(b, c.assignment, k, true).length === 0).toBe(c.validLocked);
    expect(tilesChanged(b.start, c.assignment)).toBe(c.tilesChanged);
    expect(winners(b, c.assignment, k)).toEqual(c.winners);
  });
});

describe("w2 board", () => {
  it("start is valid with city limits locked, fair 4–3 Opposition, and meets neither goal", () => {
    expect(validatePlan(b, b.start)).toEqual([]);
    expect(seatTally(b, winners(b, b.start, k))).toEqual({ government: 3, opposition: 4 });
    expect(runElection(b, ta, b.start).met).toBe(false);
    expect(runElection(b, tb, b.start).met).toBe(false);
  });

  it("every shipped solution wins under the swing", () => {
    for (const t of [ta, tb])
      for (const s of b.solutions![t.id]) {
        expect(validatePlan(b, s.plan, s.k, s.lock)).toEqual([]);
        const r = runElection(b, t, s.plan, 0, s.k);
        expect(r.met).toBe(true);
        expect(r.bySwing).toHaveLength(2);
      }
  });

  it("Task A solutions all break the city limits", () => {
    for (const s of b.solutions!.ta) expect(validatePlan(b, s.plan, s.k, true).some((p) => p.kind === "mixed")).toBe(true);
  });
});

describe("power cards", () => {
  const reduce = playReducer(b);
  it("Erase the City Limits unlocks mixed districts", () => {
    const s = reduce(initPlay(b), { type: "power", id: "limits" });
    expect(s.muniLock).toBe(false);
    expect(canPlay(b, s, "limits")).toBe(false);
  });
  it("Skip the Hearings freezes scrutiny; Toss the Ref's Report resets it", () => {
    let s = initPlay(b);
    const t = b.tiles.findIndex((_, i) => moveTargets(b, s.assignment, i).size > 0);
    s = reduce(s, { type: "move", tile: t, district: [...moveTargets(b, s.assignment, t)][0] });
    expect(drift(s)).toBe(1);
    s = reduce(s, { type: "power", id: "hearings" });
    const t2 = b.tiles.findIndex((_, i) => i !== t && moveTargets(b, s.assignment, i).size > 0);
    s = reduce(s, { type: "move", tile: t2, district: [...moveTargets(b, s.assignment, t2)][0] });
    expect(drift(s)).toBe(1);
    s = reduce(s, { type: "power", id: "toss" });
    expect(drift(s)).toBe(0);
    s = reduce(s, { type: "undo" });
    expect(drift(s)).toBe(1);
  });
  it("Bonus Seat seeds an eighth district from the tapped hex, once", () => {
    let s = reduce(initPlay(b), { type: "power", id: "seat" });
    expect(s.seeding).toBe(true);
    s = reduce(s, { type: "tap", tile: 0 });
    expect(s.nDistricts).toBe(k + 1);
    expect(s.assignment[0]).toBe(k);
    expect(canPlay(b, s, "seat")).toBe(false);
    expect(validatePlan(b, s.assignment, s.nDistricts, s.muniLock).some((p) => p.district === k && p.kind === "size")).toBe(true);
  });
});

describe("w2 hints", () => {
  it.each([ta, tb].map((t) => [t.id, t] as const))("%s: hint suggests the card, then hint moves win", (_, task) => {
    const reduce = playReducer(b);
    let s = initPlay(b);
    const ctx = () => ({ taskId: task.id, nDistricts: s.nDistricts, muniLock: s.muniLock, canPlay: (id: PowerId) => canPlay(b, s, id) });
    const first = hint(b, task.goal!, s.assignment, ctx());
    if (first && "card" in first) {
      expect(first.card).toBe("limits");
      s = reduce(s, { type: "power", id: "limits" });
    }
    for (let i = 0; i < 80; i++) {
      const h = hint(b, task.goal!, s.assignment, ctx());
      if (!h) break;
      expect("card" in h).toBe(false);
      if ("card" in h) break;
      expect(moveTargets(b, s.assignment, h.tile).has(h.district)).toBe(true);
      s = reduce(s, { type: "move", tile: h.tile, district: h.district });
    }
    expect(validatePlan(b, s.assignment, s.nDistricts, s.muniLock)).toEqual([]);
    expect(runElection(b, task, s.assignment, 0, s.nDistricts).met).toBe(true);
  });
});
