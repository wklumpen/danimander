import { tilesChanged } from "./drift";
import { seatTally, winners } from "./score";
import { applySwing } from "./swing";
import { seatsNeeded, type Board, type PowerId, type Task } from "./types";
import { isLastTile, moveTargets } from "./validate";

/** Everything undo restores. */
type Snapshot = {
  assignment: number[];
  nDistricts: number;
  muniLock: boolean;
  /** Scrutiny is measured against this map (🗑️ Toss the Ref's Report moves it). */
  baseline: number[];
  /** Once 🔇 Skip the Hearings is played, scrutiny stops changing. */
  frozenDrift: number | null;
  powersUsed: PowerId[];
};

export type PlayState = Snapshot & {
  history: Snapshot[];
  selected: number | null;
  /** Waiting for the player to tap the seed hex for ➕ Bonus Seat. */
  seeding: boolean;
};

export type PlayAction =
  | { type: "tap"; tile: number }
  | { type: "select"; tile: number }
  | { type: "move"; tile: number; district: number }
  | { type: "power"; id: PowerId }
  | { type: "cancelSeed" }
  | { type: "undo" }
  | { type: "reset" };

export type PlayInit = { assignment?: number[]; nDistricts?: number };

export function initPlay(board: Board, init: PlayInit = {}): PlayState {
  const assignment = [...(init.assignment ?? board.start)];
  return {
    assignment,
    nDistricts: init.nDistricts ?? board.rules.nDistricts,
    muniLock: board.rules.muniLock,
    baseline: assignment,
    frozenDrift: null,
    powersUsed: [],
    history: [],
    selected: null,
    seeding: false,
  };
}

const snap = (s: PlayState): Snapshot => ({
  assignment: s.assignment,
  nDistricts: s.nDistricts,
  muniLock: s.muniLock,
  baseline: s.baseline,
  frozenDrift: s.frozenDrift,
  powersUsed: s.powersUsed,
});

/** Public scrutiny: hexes changed since the baseline, unless the hearings were skipped. */
export function drift(s: Pick<PlayState, "assignment" | "baseline" | "frozenDrift">): number {
  return s.frozenDrift ?? tilesChanged(s.baseline, s.assignment);
}

export function canPlay(board: Board, s: PlayState, id: PowerId): boolean {
  if (!board.rules.powers.includes(id) || s.powersUsed.includes(id)) return false;
  if (id === "limits") return s.muniLock;
  return true;
}

export function playReducer(board: Board, init: PlayInit = {}) {
  return (s: PlayState, a: PlayAction): PlayState => {
    switch (a.type) {
      case "tap": {
        if (s.seeding) {
          if (isLastTile(s.assignment, a.tile)) return s;
          const assignment = [...s.assignment];
          assignment[a.tile] = s.nDistricts; // the new district starts as this one hex
          return {
            ...s,
            history: [...s.history, snap(s)],
            assignment,
            nDistricts: s.nDistricts + 1,
            powersUsed: [...s.powersUsed, "seat"],
            seeding: false,
            selected: null,
          };
        }
        if (s.selected === null || s.selected === a.tile) {
          return { ...s, selected: s.selected === a.tile ? null : a.tile };
        }
        const target = s.assignment[a.tile];
        if (!moveTargets(board, s.assignment, s.selected).has(target)) return { ...s, selected: a.tile };
        return move(s, s.selected, target);
      }
      case "select":
        return { ...s, selected: a.tile, seeding: false };
      case "move":
        if (a.district >= s.nDistricts || !moveTargets(board, s.assignment, a.tile).has(a.district)) return s;
        return move(s, a.tile, a.district);
      case "power": {
        if (!canPlay(board, s, a.id)) return s;
        if (a.id === "seat") return { ...s, seeding: true, selected: null };
        const next = { ...s, history: [...s.history, snap(s)], powersUsed: [...s.powersUsed, a.id], selected: null };
        if (a.id === "limits") return { ...next, muniLock: false };
        if (a.id === "hearings") return { ...next, frozenDrift: drift(s) };
        // toss: the current map becomes the new reference; scrutiny back to zero (and counting again)
        return { ...next, baseline: s.assignment, frozenDrift: null };
      }
      case "cancelSeed":
        return { ...s, seeding: false };
      case "undo": {
        if (!s.history.length) return s;
        const prev = s.history[s.history.length - 1];
        return { ...s, ...prev, history: s.history.slice(0, -1), selected: null, seeding: false };
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
