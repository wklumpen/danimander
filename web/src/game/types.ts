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

export type Goal = { party: PartyId; minSeats: number; swings: number[] };

export type Task = {
  id: string;
  prompt: string;
  goal: Goal | null;
  par: number | null;
  success: string | null;
  /** Short label for this task's map in reveals, e.g. "Orange wins". */
  caption?: string;
};

export type Board = {
  id: string;
  title: string;
  /** `color` picks the palette (blue/orange); defaults to the party id. */
  parties: { id: PartyId; label: string; color?: string }[];
  tiles: Tile[];
  adjacency: number[][];
  start: number[];
  rules: { nDistricts: number; band: number; muniLock: boolean; powers: string[] };
  tasks: Task[];
  stats: {
    nPlans: number;
    seatDist: Record<PartyId, Record<string, number>>;
    goalShare?: Record<string, number>;
  };
  examples?: Record<string, number[]>;
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
