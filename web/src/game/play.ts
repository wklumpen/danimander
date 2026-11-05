import { tilesChanged } from "./drift";
import { seatTally, winners } from "./score";
import { applySwing } from "./swing";
import type { Board, Task } from "./types";
import { moveTargets } from "./validate";

export type PlayState = {
  assignment: number[];
  history: number[][];
  selected: number | null;
};

export type PlayAction =
  | { type: "tap"; tile: number }
  | { type: "select"; tile: number }
  | { type: "move"; tile: number; district: number }
  | { type: "undo" }
  | { type: "reset" };

export function initPlay(board: Board): PlayState {
  return { assignment: [...board.start], history: [], selected: null };
}

export function playReducer(board: Board) {
  return (s: PlayState, a: PlayAction): PlayState => {
    switch (a.type) {
      case "tap": {
        if (s.selected === null || s.selected === a.tile) {
          return { ...s, selected: s.selected === a.tile ? null : a.tile };
        }
        const target = s.assignment[a.tile];
        if (!moveTargets(board, s.assignment, s.selected).has(target)) return { ...s, selected: a.tile };
        return move(s, s.selected, target);
      }
      case "select":
        return { ...s, selected: a.tile };
      case "move":
        if (!moveTargets(board, s.assignment, a.tile).has(a.district)) return s;
        return move(s, a.tile, a.district);
      case "undo":
        if (!s.history.length) return s;
        return { assignment: s.history[s.history.length - 1], history: s.history.slice(0, -1), selected: null };
      case "reset":
        return initPlay(board);
    }
  };
}

function move(s: PlayState, tile: number, district: number): PlayState {
  const assignment = [...s.assignment];
  assignment[tile] = district;
  return { assignment, history: [...s.history, s.assignment], selected: null };
}

/** Run the task's election(s). Goal is met only if it holds under every listed swing. */
export function runElection(board: Board, task: Task, assignment: number[], hintsUsed = 0) {
  const k = board.rules.nDistricts;
  const startWinners = winners(board, board.start, k);
  const results = (task.goal?.swings ?? [0]).map((s) => {
    const votes = s === 0 || !task.goal ? undefined : applySwing(board.tiles, task.goal.party, s);
    return seatTally(board, winners(board, assignment, k, { votes, tiebreak: startWinners }));
  });
  const goal = task.goal;
  const met = !!goal && results.every((r) => r[goal.party] >= goal.minSeats);
  const changed = tilesChanged(board.start, assignment);
  return { seats: results[0], met, changed, stars: met && task.par !== null ? Math.min(stars(changed, task.par), hintsUsed ? 2 : 3) : 0 };
}

export function stars(changed: number, par: number): number {
  return changed <= par ? 3 : changed <= par + 2 ? 2 : 1;
}
