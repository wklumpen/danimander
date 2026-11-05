/**
 * Puzzle of the day: a deterministic board generated from the date, on the World 1 silhouette.
 * Same date → same puzzle on every device (seeded RNG + deterministic enumeration order).
 */
import { tilesChanged } from "./drift";
import { boardPlans, cutEdges, planSeats } from "./solver";
import type { Board, Task } from "./types";

export const DAILY_EPOCH = "2026-11-05"; // puzzle #1
const PAR_RANGE: [number, number] = [3, 6];
const MAX_GOAL_SHARE = 0.15;
const N_GREEN = 10;

/** Today's date in Alberta, YYYY-MM-DD. */
export function albertaDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function puzzleNumber(date: string): number {
  return Math.round((Date.parse(date) - Date.parse(DAILY_EPOCH)) / 86_400_000) + 1;
}

function rng(seed: number) {
  // mulberry32
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const shuffle = <T,>(a: T[], r: () => number) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

type Kind = { id: "pack" | "crack"; prompt: string; success: string; party: string; minSeats: number };
const KINDS: Kind[] = [
  { id: "pack", prompt: "Help Green win 3 seats.", success: "Packed!", party: "green", minSeats: 3 },
  { id: "crack", prompt: "Give Purple all 5 seats.", success: "Cracked!", party: "purple", minSeats: 5 },
];

/** Build the daily board from a template board (geometry, parties, icons). */
export function dailyBoard(template: Board, date: string): Board {
  const r = rng(hashString(`danimander:${date}`));
  const plans = boardPlans(template);
  const k = template.rules.nDistricts;
  const n = template.tiles.length;
  const cuts = plans.map((p) => cutEdges(p, template.adjacency));
  const minCut = Math.min(...cuts);
  const compact = plans.map((_, i) => i).filter((i) => cuts[i] <= minCut + 2);

  for (let attempt = 0; attempt < 500; attempt++) {
    const greens = new Set(shuffle([...Array(n).keys()], r).slice(0, N_GREEN));
    const votes = [...Array(n).keys()].map((i) => (greens.has(i) ? [0, 1] : [1, 0]));
    const seats = plans.map((p) => planSeats(p, votes, k)); // [purple, green]
    const kind = KINDS[Math.floor(r() * KINDS.length)];
    const pi = kind.party === "purple" ? 0 : 1;
    const goalIdx = plans.map((_, i) => i).filter((i) => seats[i][pi] >= kind.minSeats);
    if (!goalIdx.length || goalIdx.length / plans.length >= MAX_GOAL_SHARE) continue;

    for (const s of shuffle(compact.slice(), r).slice(0, 40)) {
      if (seats[s][0] !== 3) continue; // fair start: 3–2 Purple
      const start = Array.from(plans[s]);
      let par = Infinity;
      for (const g of goalIdx) par = Math.min(par, tilesChanged(start, Array.from(plans[g])));
      if (par < PAR_RANGE[0] || par > PAR_RANGE[1]) continue;
      const task: Task = {
        id: "daily",
        prompt: kind.prompt,
        goal: { party: kind.party, minSeats: kind.minSeats, swings: [0] },
        par,
        success: kind.success,
      };
      return {
        ...template,
        id: `daily-${date}`,
        title: `Daily #${puzzleNumber(date)}`,
        tiles: template.tiles.map((t, i) => ({ ...t, votes: { purple: votes[i][0], green: votes[i][1] } })),
        start,
        tasks: [task],
        stats: { nPlans: plans.length, seatDist: {}, goalShare: { daily: goalIdx.length / plans.length } },
        examples: undefined,
      };
    }
  }
  throw new Error(`no daily puzzle found for ${date}`);
}
