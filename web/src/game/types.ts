export type PartyId = string;

export type Tile = {
  id: number;
  q: number;
  r: number;
  tier: number;
  pop: number;
  votes: Record<PartyId, number>;
  muni: string | null;
  icon: string;
  outline: [number, number][] | null;
};

export type Goal = {
  party: PartyId;
  minSeats: number;
  /** Seats needed by district count, when Bonus Seat can change it (e.g. {"7": 4, "8": 5}). */
  minSeatsByK?: Record<string, number>;
  swings: number[];
};

export function seatsNeeded(goal: Goal, nDistricts: number): number {
  return goal.minSeatsByK?.[String(nDistricts)] ?? goal.minSeats;
}

export type PowerId = "seat" | "limits" | "hearings" | "toss";

export type Task = {
  id: string;
  prompt: string;
  goal: Goal | null;
  par: number | null;
  success: string | null;
  /** Short label for this task's map in reveals, e.g. "Orange wins". */
  caption?: string;
  /** Party holding the pen (World 2+). */
  role?: PartyId;
  /** Story lines shown before the task starts. */
  intro?: string[];
};

export type Board = {
  id: string;
  title: string;
  /** `color` picks the palette (blue/orange); defaults to the party id. */
  parties: { id: PartyId; label: string; color?: string }[];
  tiles: Tile[];
  adjacency: number[][];
  start: number[];
  rules: {
    nDistricts: number;
    band: number;
    muniLock: boolean;
    powers: PowerId[];
    /** Max "public scrutiny" (tiles changed vs baseline) before the election is blocked. */
    driftCap?: number;
    /** Scrutiny added the moment 🚧 Erase the City Limits is played. */
    limitsScrutiny?: number;
  };
  tasks: Task[];
  stats: {
    nPlans: number;
    seatDist: Record<PartyId, Record<string, number>>;
    goalShare?: Record<string, number>;
    /** Exact minimum tiles changed from the start per task (big boards). */
    bestDrift?: Record<string, number>;
  };
  examples?: Record<string, number[]>;
  /** Known goal plans per task for boards too big to enumerate (hint targets). */
  solutions?: Record<string, { k: number; lock: boolean; plan: number[] }[]>;
};

export type PlanState = {
  boardId: string;
  taskId: string;
  role: PartyId;
  assignment: number[];
  powersUsed: string[];
  nDistricts: number;
};

/** Palette key for a party (CSS classes .fill-*, .text-*, .bg-*, .border-*). */
export function colorOf(board: Pick<Board, "parties">, partyId: PartyId): string {
  return board.parties.find((p) => p.id === partyId)?.color ?? partyId;
}
