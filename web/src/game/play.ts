import { tilesChanged } from "./drift";
import { seatTally, winners } from "./score";
import { applySwing } from "./swing";
import { seatsNeeded, type Board, type PowerId, type Task } from "./types";
import { moveTargets } from "./validate";

/** Everything undo restores. */
type Snapshot = {
  assignment: number[];
  nDistricts: number;
  muniLock: boolean;
  /** Scrutiny is measured against this map (🗑️ Toss the Ref's Report moves it). */
  baseline: number[];
  /** Scrutiny added by playing cards (🚧 Erase the City Limits); cleared by 🗑️ Toss the Ref's Report. */
  penalty: number;
  powersUsed: PowerId[];
};

export type PlayState = Snapshot & {
  /** Max scrutiny allowed at any moment (moves past it are refused). */
  cap?: number;
  history: Snapshot[];
  selected: number | null;
};

export type PlayAction =
  | { type: "tap"; tile: number }
  | { type: "select"; tile: number }
  | { type: "move"; tile: number; district: number }
  | { type: "power"; id: PowerId }
  | { type: "undo" }
  | { type: "reset" };

export type PlayInit = { assignment?: number[]; nDistricts?: number; driftCap?: number; muniLock?: boolean };

export function initPlay(board: Board, init: PlayInit = {}): PlayState {
  const assignment = [...(init.assignment ?? board.start)];
  return {
    assignment,
    nDistricts: init.nDistricts ?? board.rules.nDistricts,
    muniLock: init.muniLock ?? board.rules.muniLock,
    baseline: assignment,
    penalty: 0,
    powersUsed: [],
    history: [],
    selected: null,
    cap: init.driftCap ?? board.rules.driftCap,
  };
}

const snap = (s: PlayState): Snapshot => ({
  assignment: s.assignment,
  nDistricts: s.nDistricts,
  muniLock: s.muniLock,
  baseline: s.baseline,
  penalty: s.penalty,
  powersUsed: s.powersUsed,
});

/** Public scrutiny: hexes changed since the baseline, plus any card penalty. */
export function drift(s: Pick<PlayState, "assignment" | "baseline" | "penalty">): number {
  return tilesChanged(s.baseline, s.assignment) + s.penalty;
}

/** While limits are locked, a hex may only join a district on its own side (city / town / countryside). */
export function crossesLimit(board: Board, s: PlayState, tile: number, district: number): boolean {
  if (!s.muniLock) return false;
  const other = s.assignment.findIndex((d, i) => d === district && i !== tile);
  return other >= 0 && (board.tiles[other].muni ?? "") !== (board.tiles[tile].muni ?? "");
}

/** Would moving `tile` into `district` push public scrutiny past the cap? */
export function overCap(s: PlayState, tile: number, district: number): boolean {
  if (s.cap === undefined) return false;
  const next = [...s.assignment];
  next[tile] = district;
  return tilesChanged(s.baseline, next) + s.penalty > s.cap;
}

/** Districts this tile may move into right now: adjacent, not its last hex, and within scrutiny. */
export function allowedTargets(board: Board, s: PlayState, tile: number): Set<number> {
  const out = new Set<number>();
  for (const d of moveTargets(board, s.assignment, tile)) if (!crossesLimit(board, s, tile, d) && !overCap(s, tile, d)) out.add(d);
  return out;
}

export function canPlay(board: Board, s: PlayState, id: PowerId): boolean {
  if (!board.rules.powers.includes(id) || s.powersUsed.includes(id)) return false;
  if (id === "limits") {
    // Changing the boundary law is itself noticed: it can't push scrutiny over the cap.
    const cost = board.rules.limitsScrutiny ?? 0;
    return s.muniLock && (s.cap === undefined || drift(s) + cost <= s.cap);
  }
  return true;
}

export function playReducer(board: Board, init: PlayInit = {}) {
  return (s: PlayState, a: PlayAction): PlayState => {
    switch (a.type) {
      case "tap": {
        if (s.selected === null || s.selected === a.tile) {
          return { ...s, selected: s.selected === a.tile ? null : a.tile };
        }
        const target = s.assignment[a.tile];
        if (!moveTargets(board, s.assignment, s.selected).has(target)) return { ...s, selected: a.tile };
        // locked limits or too obvious: refused, keep the hex picked up
        if (crossesLimit(board, s, s.selected, target) || overCap(s, s.selected, target)) return s;
        return move(s, s.selected, target);
      }
      case "select":
        return { ...s, selected: a.tile };
      case "move":
        if (a.district >= s.nDistricts || !allowedTargets(board, s, a.tile).has(a.district)) return s;
        return move(s, a.tile, a.district);
      case "power": {
        if (!canPlay(board, s, a.id)) return s;
        const next = { ...s, history: [...s.history, snap(s)], powersUsed: [...s.powersUsed, a.id], selected: null };
        if (a.id === "limits") return { ...next, muniLock: false, penalty: s.penalty + (board.rules.limitsScrutiny ?? 0) };
        // toss: the current map becomes the new reference; scrutiny back to zero (and counting again)
        return { ...next, baseline: s.assignment, penalty: 0 };
      }
      case "undo": {
        if (!s.history.length) return s;
        const prev = s.history[s.history.length - 1];
        return { ...s, ...prev, history: s.history.slice(0, -1), selected: null };
      }
      case "reset":
        return initPlay(board, init);
    }
  };
}

function move(s: PlayState, tile: number, district: number): PlayState {
  const assignment = [...s.assignment];
  assignment[tile] = district;
  return { ...s, history: [...s.history, snap(s)], assignment, selected: null };
}

/** Run the task's election(s). Goal is met only if it holds under every listed swing. */
export function runElection(board: Board, task: Task, assignment: number[], hintsUsed = 0, nDistricts = board.rules.nDistricts) {
  const startWinners = winners(board, board.start, board.rules.nDistricts);
  const goal = task.goal;
  const bySwing = (goal?.swings ?? [0]).map((s) => {
    const votes = s === 0 || !goal ? undefined : applySwing(board.tiles, goal.party, s);
    const tiebreak = nDistricts === board.rules.nDistricts ? startWinners : undefined;
    return { swing: s, seats: seatTally(board, winners(board, assignment, nDistricts, { votes, tiebreak })) };
  });
  const need = goal ? seatsNeeded(goal, nDistricts) : 0;
  const met = !!goal && bySwing.every((r) => r.seats[goal.party] >= need);
  const changed = tilesChanged(board.start, assignment);
  return {
    seats: bySwing[0].seats,
    bySwing,
    need,
    met,
    changed,
    stars: met && task.par !== null ? Math.min(stars(changed, task.par), hintsUsed ? 2 : 3) : 0,
  };
}

export function stars(changed: number, par: number): number {
  return changed <= par ? 3 : changed <= par + 2 ? 2 : 1;
}
