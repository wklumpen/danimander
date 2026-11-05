"""Generate World 2 ("Prairie Province") and write boards/w2.json.

    python board_w2.py [--seed N] [--quick]

49 equal hexes, 7 districts (6–8 hexes each, ±15%), two cities (north + south) whose limits
are locked, towns along the highway between them, countryside around. Government (blue) vs
Opposition (orange); Opposition ≈ 52% province-wide and strongest in the cities.

Design checks (heuristic — the board is too big to enumerate):
  * start map: compact, lock-respecting, fair (Opposition 4–3)
  * Task A (Government majority that survives a 3-point swing) is NOT found with city limits
    locked and 7 seats, but IS found once the lock is lifted (🚧) → the card matters
  * Task B (Opposition, same goal) is reachable
  * scrutiny cap = best-known Task A drift − 2, so a drift card (🔇/🗑️) is needed too
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import search
import solver

ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "boards" / "w2.json"

K = 7
BAND = 0.15
SWING = 0.03
GOV, OPP = 0, 1
TARGET_OPP = 0.52
# Opposition share by zone: city core, rest of the city, highway towns, countryside (absorbs the shift)
PROFILE = {"core": 0.64, "city": 0.59, "town": 0.50, "far": 0.40}
A_SEATS = {7: 4, 8: 5}  # Task A: Government majority
B_SEATS = {7: 5, 8: 6}  # Task B: Opposition supermajority (beyond what a fair map gives)

# Prairie silhouette (SW corner stepped for the mountains), rows north -> south, odd-r offset.
ROWS = [(0, 7), (0, 7), (0, 7), (1, 7), (2, 7), (2, 7), (2, 7)]
# Each city holds two districts' worth of hexes (like Alberta's big cities), drawn by hand.
NORTH_CITY_CELLS = {(0, 4), (0, 5), (0, 6), (0, 7), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7)}
SOUTH_CITY_CELLS = {(4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (5, 3), (5, 4), (5, 5), (5, 6), (5, 7), (6, 4), (6, 5), (6, 6), (6, 7)}
NORTH_CITY = (1, 5)  # city centres (row, col), for the "core" vote zone
SOUTH_CITY = (5, 5)
TOWNS = {(3, 4), (3, 5), (3, 6)}  # highway corridor between the cities
PUMPJACKS = {(0, 7), (2, 1), (4, 7), (6, 2)}
MOUNTAINS = {(3, 1), (4, 2), (5, 2), (6, 2)}


def axial(row, col):
    return col - (row - (row & 1)) // 2, row


def geometry():
    tiles = []
    for row, (c0, c1) in enumerate(ROWS):
        for col in range(c0, c1 + 1):
            q, r = axial(row, col)
            tiles.append({"row": row, "col": col, "q": q, "r": r})
    coords = [(t["q"], t["r"]) for t in tiles]
    adj = solver.hex_adjacency(coords)
    index = {(t["row"], t["col"]): i for i, t in enumerate(tiles)}

    north = {index[rc] for rc in NORTH_CITY_CELLS}
    south = {index[rc] for rc in SOUTH_CITY_CELLS}
    assert len(north) == len(south) == 14 and not (north & south)
    return tiles, adj, index, north, south


def hexdist(a, b):
    dq, dr = a["q"] - b["q"], a["r"] - b["r"]
    return (abs(dq) + abs(dr) + abs(dq + dr)) // 2


def make_votes(tiles, adj, index, north, south, rng):
    """Government share per tile. Opposition leads the cities (most in the cores), towns are
    toss-ups, the countryside leans Government. The countryside absorbs the shift that makes
    the province-wide Opposition share TARGET_OPP."""
    cities = north | south
    cores = {index[NORTH_CITY], index[SOUTH_CITY], *adj[index[NORTH_CITY]], *adj[index[SOUTH_CITY]]}
    towns = {index[rc] for rc in TOWNS} - cities
    opp, far = [], []
    for i in range(len(tiles)):
        if i in cities:
            base = PROFILE["core"] if i in cores else PROFILE["city"]
        elif i in towns:
            base = PROFILE["town"]
        else:
            base = PROFILE["far"]
            far.append(i)
        opp.append(base + rng.uniform(-0.03, 0.03))
    shift = (TARGET_OPP * len(tiles) - sum(opp)) / len(far)
    for i in far:
        opp[i] += shift
    return [round(1 - o, 3) for o in opp]  # government share, 3 dp


def random_partition(free: list[int], adj, n, size, rng, tries=2000):
    """Random connected partition of `free` into n districts of exactly `size` (randomised growth)."""
    free_set = set(free)
    for _ in range(tries):
        left = set(free_set)
        parts = []
        ok = True
        for _d in range(n):
            root = min(left)
            part = {root}
            frontier = [w for w in adj[root] if w in left]
            while len(part) < size and frontier:
                w = frontier.pop(rng.randrange(len(frontier)))
                if w in part:
                    continue
                part.add(w)
                frontier += [u for u in adj[w] if u in left and u not in part]
            if len(part) < size:
                ok = False
                break
            left -= part
            if left and any(c % size for c in _component_sizes(left, adj)):
                ok = False
                break
            parts.append(part)
        if ok and not left:
            return parts
    return None


def _component_sizes(nodes: set[int], adj):
    seen, out = set(), []
    for s in nodes:
        if s in seen:
            continue
        stack, n = [s], 0
        seen.add(s)
        while stack:
            v = stack.pop()
            n += 1
            for w in adj[v]:
                if w in nodes and w not in seen:
                    seen.add(w)
                    stack.append(w)
        out.append(n)
    return out


def seat_count(plan, k, gov_share, party, s=0.0):
    return search.seats_at(plan, k, search.tile_share(gov_share, party, s))[0]


def build(seed: int, quick: bool):
    rng = random.Random(seed)
    tiles, adj, index, north, south = geometry()
    n = len(tiles)
    cities = north | south
    muni = ["North City" if i in north else "South City" if i in south else "County" for i in range(n)]
    gov = make_votes(tiles, adj, index, north, south, rng)
    lo, hi = solver.int_band(n, K, BAND)
    lo8, hi8 = solver.int_band(n, K + 1, BAND)

    # --- fair start map: each city split into two pure districts; countryside into three
    county = [i for i in range(n) if i not in cities]
    edges = [(i, j) for i in range(n) for j in adj[i] if i < j]
    best = None
    for _ in range(300 if quick else 2000):
        groups = [
            random_partition(sorted(north), adj, 2, 7, rng, tries=200),
            random_partition(sorted(south), adj, 2, 7, rng, tries=200),
            random_partition(county, adj, 3, 7, rng, tries=200),
        ]
        if not all(groups):
            continue
        parts = [p for g in groups for p in g]
        plan = [0] * n
        for d, part in enumerate(parts):
            for i in part:
                plan[i] = d
        opp0 = seat_count(plan, K, gov, OPP)
        if opp0 != 4:
            continue
        cut = sum(plan[i] != plan[j] for i, j in edges)
        if best is None or cut < best[0]:
            best = (cut, plan)
    if not best:
        return None, "no fair start map"
    start = best[1]

    steps, restarts = (6000, 8) if quick else (15000, 24)
    goal_a = search.Goal(GOV, K // 2 + 1, [0.0, -SWING])
    goal_b = search.Goal(OPP, B_SEATS[K], [0.0, -SWING])
    locked = search.Rules(K, lo, hi, lock=True)
    open_ = search.Rules(K, lo, hi, lock=False)

    a_locked = search.find_solutions(start, gov, goal_a, adj, muni, locked, restarts=restarts, steps=steps, seed=seed)
    if a_locked:
        return None, f"Task A solvable without lifting city limits (drift {a_locked[0][0]})"
    a_open = search.find_solutions(start, gov, goal_a, adj, muni, open_, restarts=restarts, steps=steps, seed=seed + 1)
    if not a_open:
        return None, "Task A unreachable even with city limits lifted"
    par_a = a_open[0][0]
    if not (6 <= par_a <= 16):
        return None, f"Task A best drift {par_a} out of range"
    if search.goal_met(start, K, gov, goal_b):
        return None, "fair start already gives the Opposition Task B"
    b_open = search.find_solutions(start, gov, goal_b, adj, muni, open_, restarts=restarts, steps=steps, seed=seed + 2)
    if not b_open:
        return None, "Task B unreachable"

    # Bonus Seat variants (8 districts, majority 5): seed a new district from a random hex.
    def seeded(rng_):
        p = list(start)
        while True:
            t = rng_.randrange(n)
            if sum(x == p[t] for x in p) > lo8:
                p[t] = K
                return p

    bonus_rules = search.Rules(K + 1, 1, hi8, lock=False)  # new district starts at 1 hex
    goal_a8 = search.Goal(GOV, A_SEATS[K + 1], [0.0, -SWING])
    goal_b8 = search.Goal(OPP, B_SEATS[K + 1], [0.0, -SWING])

    def finish_band(sols):
        return [(d, p) for d, p in sols if all(lo8 <= p.count(x) <= hi8 for x in range(K + 1))]

    a8 = finish_band(search.find_solutions(start, gov, goal_a8, adj, muni, bonus_rules, restarts=restarts // 2, steps=steps, seed=seed + 3, init_fn=seeded, final_lo=lo8))
    b8 = finish_band(search.find_solutions(start, gov, goal_b8, adj, muni, bonus_rules, restarts=restarts // 2, steps=steps, seed=seed + 4, init_fn=seeded, final_lo=lo8))

    cap = max(3, par_a - 2)
    report = (
        f"start opp seats {seat_count(start, K, gov, OPP)}/{K} (gov at -3%: {seat_count(start, K, gov, GOV, -SWING)}), "
        f"province opp {1 - sum(gov) / n:.3f}; A locked: none; A open best {par_a} ({len(a_open)} sols); "
        f"B open best {b_open[0][0]} ({len(b_open)}); A8 {len(a8)}; B8 {len(b8)}; cap {cap}"
    )

    icons = []
    towns = {index[rc] for rc in TOWNS} - cities
    for i, t in enumerate(tiles):
        rc = (t["row"], t["col"])
        icons.append(
            "city" if i in cities else "town" if i in towns else "pumpjack" if rc in PUMPJACKS
            else "mountain" if rc in MOUNTAINS else "farm"
        )

    sols = lambda lst, k, lock, m=12: [{"k": k, "lock": lock, "plan": p} for _, p in lst[:m]]
    board = {
        "id": "w2",
        "title": "Prairie Province",
        "parties": [
            {"id": "government", "label": "Government", "color": "blue"},
            {"id": "opposition", "label": "Opposition", "color": "orange"},
        ],
        "tiles": [
            {
                "id": i,
                "q": t["q"],
                "r": t["r"],
                "tier": 1,
                "pop": 1,
                "votes": {"government": gov[i], "opposition": round(1 - gov[i], 3)},
                "muni": muni[i] if i in cities else None,
                "icon": icons[i],
                "outline": None,
            }
            for i, t in enumerate(tiles)
        ],
        "adjacency": adj,
        "start": start,
        "rules": {
            "nDistricts": K,
            "band": BAND,
            "muniLock": True,
            "powers": ["seat", "limits", "hearings", "toss"],
            "driftCap": cap,
        },
        "tasks": [
            {
                "id": "ta",
                "role": "government",
                "intro": ["You're the Government.", "You're behind in the cities.", "You also hold the pen."],
                "prompt": "Win a Government majority that survives a 3-point swing.",
                "goal": {"party": "government", "minSeats": A_SEATS[K], "minSeatsByK": {str(k): v for k, v in A_SEATS.items()}, "swings": [0, -SWING]},
                "par": None,
                "success": "A majority — even if 3% of voters turn on you.",
                "caption": "Government's map",
            },
            {
                "id": "tb",
                "role": "opposition",
                "intro": ["Now imagine the Opposition wins.", "And they get the pen."],
                "prompt": "Win 5 of 7 seats for the Opposition — even after a 3-point swing.",
                "goal": {"party": "opposition", "minSeats": B_SEATS[K], "minSeatsByK": {str(k): v for k, v in B_SEATS.items()}, "swings": [0, -SWING]},
                "par": None,
                "success": "Same votes. Same trick. Other side.",
                "caption": "Opposition's map",
            },
        ],
        "stats": {"nPlans": 0, "seatDist": {}, "bestDrift": {"ta": par_a, "tb": b_open[0][0]}},
        "solutions": {
            "ta": sols(a_open, K, False) + sols(a8, K + 1, False, 6),
            "tb": sols(b_open, K, False) + sols(b8, K + 1, False, 6),
        },
    }
    return board, report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--tries", type=int, default=12)
    ap.add_argument("--quick", action="store_true")
    args = ap.parse_args()
    for s in range(args.seed, args.seed + args.tries):
        board, report = build(s, args.quick)
        print(f"seed {s}: {report}", flush=True)
        if board:
            OUT_JSON.write_text(json.dumps(board, indent=1, ensure_ascii=False) + "\n")
            print(f"wrote {OUT_JSON}")
            return
    raise SystemExit("no seed satisfied the design checks")


if __name__ == "__main__":
    main()
