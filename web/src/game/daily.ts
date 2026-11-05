/**
 * Puzzle of the day: a deterministic board generated from the date, on the World 1 silhouette.
 * Same date → same puzzle on every device (seeded RNG + deterministic enumeration order).
 */
import { tilesChanged } from "./drift";
import { shapeBoard, shapeFor } from "./shapes";
import { boardPlans, cutEdges, planSeats } from "./solver";
import type { Board, Task } from "./types";

export const DAILY_EPOCH = "2026-11-05"; // puzzle #1
const PAR_RANGE: [number, number] = [3, 6];
const MAX_GOAL_SHARE = 0.15;
const N_MINORITY = 10; // 15 / 10 = 60 / 40

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

type KindId = "pack" | "crack";

/**
 * Every daily is both ways on the same votes and the same start map. The date also decides
 * which colour holds the 60% majority and which puzzle comes first, so neither colour is
 * always the one doing (or getting) the gerrymandering.
 */
function makeTasks(order: KindId[], maj: { id: string; label: string }, min: { id: string; label: string }, k: number, pars: Record<KindId, number>): Task[] {
  return order.map((id, i) => {
    const first = i === 0;
    const pack = id === "pack";
    const goal = pack ? { party: min.id, minSeats: Math.ceil(k / 2), swings: [0] } : { party: maj.id, minSeats: k, swings: [0] };
    const ask = pack ? `help ${min.label} win ${Math.ceil(k / 2)} seats.` : `give ${maj.label} all ${k}.`;
    return {
      id,
      prompt: first ? ask[0].toUpperCase() + ask.slice(1) : `Same votes. Now ${ask}`,
      goal,
      par: pars[id],
      success: `${pack ? "Packed!" : "Cracked!"} ${first ? "Now flip it." : "Same votes, opposite result."}`,
      caption: pack ? `${min.label} wins` : `${maj.label} sweeps`,
    };
  });
}

/** Build the daily board from a template board (geometry, parties, icons). */
export function dailyBoard(world1: Board, date: string): Board {
  const shape = shapeFor(puzzleNumber(date));
  const template = shapeBoard(world1, shape);
  const r = rng(hashString(`danimander:${date}`));
  const plans = boardPlans(template);
  const k = template.rules.nDistricts;
  const n = template.tiles.length;
  const cuts = plans.map((p) => cutEdges(p, template.adjacency));
  const minCut = Math.min(...cuts);
  const compact = plans.map((_, i) => i).filter((i) => cuts[i] <= minCut + 2);

  const majIdx = r() < 0.5 ? 0 : 1; // which party has the 60%
  const minIdx = 1 - majIdx;
  const order: KindId[] = r() < 0.5 ? ["pack", "crack"] : ["crack", "pack"];
  const [maj, min] = [template.parties[majIdx], template.parties[minIdx]];

  for (let attempt = 0; attempt < 2000; attempt++) {
    const minority = new Set(shuffle([...Array(n).keys()], r).slice(0, N_MINORITY));
    const votes = [...Array(n).keys()].map((i) => {
      const v = [0, 0];
      v[minority.has(i) ? minIdx : majIdx] = 1;
      return v;
    });
    const seats = plans.map((p) => planSeats(p, votes, k));
    const goalIdx: Record<KindId, number[]> = {
      pack: plans.map((_, i) => i).filter((i) => seats[i][minIdx] >= Math.ceil(k / 2)),
      crack: plans.map((_, i) => i).filter((i) => seats[i][majIdx] >= k),
    };
    if (Object.values(goalIdx).some((g) => !g.length || g.length / plans.length >= MAX_GOAL_SHARE)) continue;

    for (const s of shuffle(compact.slice(), r).slice(0, 40)) {
      if (seats[s][majIdx] !== Math.ceil(k / 2)) continue; // fair start: majority wins 3–2
      const start = Array.from(plans[s]);
      const parOf = (g: number[]) => Math.min(...g.map((i) => tilesChanged(start, Array.from(plans[i]))));
      const pars = { pack: parOf(goalIdx.pack), crack: parOf(goalIdx.crack) };
      if (Object.values(pars).some((par) => par < PAR_RANGE[0] || par > PAR_RANGE[1])) continue;
      return {
        ...template,
        id: `daily-${date}`,
        title: `Daily #${puzzleNumber(date)} · ${shape.name}`,
        tiles: template.tiles.map((t, i) => ({
          ...t,
          votes: Object.fromEntries(template.parties.map((p, pi) => [p.id, votes[i][pi]])),
        })),
        start,
        tasks: makeTasks(order, maj, min, k, pars),
        stats: {
          nPlans: plans.length,
          seatDist: {},
          goalShare: { pack: goalIdx.pack.length / plans.length, crack: goalIdx.crack.length / plans.length },
        },
        examples: undefined,
      };
    }
  }
  throw new Error(`no daily puzzle found for ${date}`);
}
