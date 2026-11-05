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
};

export type Board = {
  id: string;
  title: string;
  parties: { id: PartyId; label: string }[];
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
