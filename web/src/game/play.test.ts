import { describe, expect, it } from "vitest";
import boardJson from "../../../boards/w1.json";
import { initPlay, playReducer, runElection, stars } from "./play";
import type { Board } from "./types";
import { moveTargets } from "./validate";

const board = boardJson as unknown as Board;
const reduce = playReducer(board);

describe("tap-tap moves", () => {
  it("select, move to an adjacent district, undo", () => {
    const tile = board.tiles.findIndex((_, i) => moveTargets(board, board.start, i).size > 0);
    const target = [...moveTargets(board, board.start, tile)][0];
    const other = board.start.findIndex((d) => d === target);
    let s = reduce(initPlay(board), { type: "tap", tile });
    expect(s.selected).toBe(tile);
    s = reduce(s, { type: "tap", tile: other });
    expect(s.assignment[tile]).toBe(target);
    expect(s.selected).toBeNull();
    s = reduce(s, { type: "undo" });
    expect(s.assignment).toEqual(board.start);
  });

  it("tapping a non-adjacent district reselects instead of moving", () => {
    const tile = 0;
    const far = board.start.findIndex((d, i) => d !== board.start[0] && !moveTargets(board, board.start, tile).has(d) && i > 0);
    const s = reduce(reduce(initPlay(board), { type: "tap", tile }), { type: "tap", tile: far });
    expect(s.assignment).toEqual(board.start);
    expect(s.selected).toBe(far);
  });
});

describe("election", () => {
  it("start map does not meet task 1", () => {
    const r = runElection(board, board.tasks[0], board.start);
    expect(r.met).toBe(false);
    expect(r.changed).toBe(0);
  });
  it("stars", () => {
    expect([stars(3, 3), stars(5, 3), stars(6, 3)]).toEqual([3, 2, 1]);
  });
});
