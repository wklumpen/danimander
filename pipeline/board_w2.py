"""Generate World 2 ("Prairie Province") and write boards/w2.json.

    python board_w2.py

35 hexes, 5 districts of exactly 7. One city of 21 hexes (three districts' worth) whose limits
start locked; 14 hexes of countryside (two districts). Hexes are solid Government (blue) or
Opposition (orange), like World 1. Opposition 18/35 ≈ 51%, concentrated in the city; the city
has only 3 Government hexes, so while the limits are locked no city district can go Government
and the Government can win at most the 2 rural seats.

Two mechanics:
  * 🚧 Erase the City Limits — districts may mix city and countryside.
  * 👀 Scrutiny cap (tiles changed vs baseline, enforced on every move) + 🗑️ Toss the Ref's
    Report — resets the baseline to the current map, once.

Every valid map is enumerated (≈724k), so pars and shares are exact:
  * Task A: Government 3 of 5. Impossible with limits locked (checked). Par P_A with them erased.
    Cap = ceil(P_A / 2) < P_A, so the toss is required, and one toss is enough.
  * Task B: Opposition 4 of 5, starting from the player's Task A map.
"""

from __future__ import annotations

import json
import math
from itertools import permutations
from pathlib import Path

import numpy as np

import solver

ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "boards" / "w2.json"
CACHE = Path(__file__).resolve().parent / "out" / "w2_plans.npy"

K, SIZE = 5, 7
GOV, OPP = 0, 1
ROWS = [(0, 5), (0, 5), (0, 5), (1, 5), (2, 5), (2, 5), (2, 5)]  # SW corner stepped (foothills)
CITY_CENTRE = (0, 4)  # the city: 14 hexes, two districts
CITY_SIZE = 14
TOWN_CENTRE = (5, 4)  # the town: a 7-hex rosette, one district — small enough to crack
N_OPP = 18  # 18/35 ≈ 51% Opposition
LIMITS_SCRUTINY = 2  # erasing the city limits is itself noticed
# Design loop targets (exact, from full enumeration)
A_SHARE_MAX = 0.25   # a Government majority should be the unusual map
A_PAR = (5, 8)       # ...that takes real redrawing (cap = ceil(par/2) ≥ 3)
B_PAR = (4, 9)
# Minority hexes per area (keeps the lock proof: ≤ 3 Government hexes in any city/town district)
GOV_IN_CITY, GOV_IN_TOWN, OPP_IN_COUNTY = 2, 2, 1
PUMPJACKS = {(0, 0), (2, 1)}
MOUNTAINS = {(3, 1), (4, 2), (5, 2), (6, 2)}

N_A_SOLUTIONS = 60   # hint targets shipped for Task A
N_B_SOLUTIONS = 160  # Task B starts from the player's own map, so ship a wider spread


def geometry():
    tiles = []
    for row, (c0, c1) in enumerate(ROWS):
        for col in range(c0, c1 + 1):
            tiles.append({"q": col - (row - (row & 1)) // 2, "r": row, "row": row, "col": col})
    adj = solver.hex_adjacency([(t["q"], t["r"]) for t in tiles])
    index = {(t["row"], t["col"]): i for i, t in enumerate(tiles)}

    def hd(a, b):
        dq, dr = a["q"] - b["q"], a["r"] - b["r"]
        return (abs(dq) + abs(dr) + abs(dq + dr)) / 2

    c = tiles[index[CITY_CENTRE]]
    order = sorted(range(len(tiles)), key=lambda i: (hd(tiles[i], c), -tiles[i]["col"], i))
    city = set(order[:CITY_SIZE])
    t = index[TOWN_CENTRE]
    town = {t, *adj[t]}
    assert len(town) == SIZE and not (town & city)
    return tiles, adj, index, city, town


def all_plans(adj):
    if CACHE.exists():
        return np.load(CACHE)
    plans = solver.enumerate_plans(adj, K, SIZE, SIZE)
    CACHE.parent.mkdir(exist_ok=True)
    np.save(CACHE, plans)
    return plans


def distances(plans: np.ndarray, start: np.ndarray, chunk: int = 40000) -> np.ndarray:
    """Hungarian tiles-changed from `start` for every plan (permutation max over 5! labelings)."""
    perms = np.array(list(permutations(range(K))))
    rows = np.arange(K)
    start_m = (start[None, :] == rows[:, None]).astype(np.int16)  # (K, n)
    out = np.empty(len(plans), dtype=np.int16)
    for a in range(0, len(plans), chunk):
        p = plans[a : a + chunk]
        m = (p[:, None, :] == rows[None, :, None]).astype(np.int16)  # (c, K, n)
        ov = np.einsum("an,cbn->cab", start_m, m)  # (c, K, K)
        best = ov[:, rows[None, :], perms].sum(axis=2).max(axis=1)
        out[a : a + chunk] = plans.shape[1] - best
    return out


def main(seed: int = 7):
    tiles, adj, index, city, town = geometry()
    n = len(tiles)
    county = [i for i in range(n) if i not in city and i not in town]
    assert len(county) == 2 * SIZE

    plans = all_plans(adj)
    print(f"{len(plans)} valid plans")
    muni_id = np.array([1 if i in city else 2 if i in town else 0 for i in range(n)])
    # a plan respects the limits if no district mixes areas
    locked_ok = np.ones(len(plans), dtype=bool)
    for d in range(K):
        m = plans == d
        present = np.stack([(m & (muni_id == u)).any(axis=1) for u in range(3)], axis=1).sum(axis=1)
        locked_ok &= present == 1
    print(f"lock-respecting plans: {locked_ok.sum()}")
    masks = [plans == d for d in range(K)]

    def opp_seats_of(opp):
        o = opp.astype(np.int8)
        return sum(((m @ o) >= 4).astype(np.int8) for m in masks)

    edges = np.array([(i, j) for i in range(n) for j in adj[i] if i < j])
    cuts = (plans[:, edges[:, 0]] != plans[:, edges[:, 1]]).sum(axis=1)

    # Design loop: where the few minority hexes sit (Government suburbs in city/town, an Opposition farm-town).
    rng = np.random.default_rng(seed)
    found = None
    for attempt in range(300):
        opp = np.array([1 if (i in city or i in town) else 0 for i in range(n)])
        opp[rng.choice(sorted(city), GOV_IN_CITY, replace=False)] = 0
        opp[rng.choice(sorted(town), GOV_IN_TOWN, replace=False)] = 0
        opp[rng.choice(county, OPP_IN_COUNTY, replace=False)] = 1
        assert opp.sum() == N_OPP
        opp_seats = opp_seats_of(opp)
        gov_seats = K - opp_seats
        assert not (locked_ok & (gov_seats >= 3)).any(), "lock must block a Government majority"
        cand = np.flatnonzero(locked_ok & (opp_seats == 3))
        if not len(cand):
            continue
        goal_a, goal_b = gov_seats >= 3, opp_seats >= 4
        if not (0 < goal_a.mean() < A_SHARE_MAX):
            print(f"  try {attempt}: A share {goal_a.mean():.1%}")
            continue
        s = cand[np.argmin(cuts[cand])]
        start = plans[s].astype(int)
        dist = distances(plans, start)
        par_a, par_b = int(dist[goal_a].min()), int(dist[goal_b].min())
        print(f"  try {attempt}: A {goal_a.mean():.1%} par {par_a}; B {goal_b.mean():.1%} par {par_b}", flush=True)
        if A_PAR[0] <= par_a <= A_PAR[1] and B_PAR[0] <= par_b <= B_PAR[1]:
            found = (opp, opp_seats, gov_seats, s, start, dist, goal_a, goal_b, par_a, par_b)
            break
    if not found:
        raise SystemExit("no vote layout satisfied the design targets")
    opp, opp_seats, gov_seats, s, start, dist, goal_a, goal_b, par_a, par_b = found
    votes = np.stack([1 - opp, opp], axis=1)  # [gov, opp]
    suburbs = {i for i in city | town if opp[i] == 0}

    # Smallest cap where one toss suffices: the erase penalty plus the redraw must fit in two caps,
    # but not in one (so the toss is required). The cap must also leave room to play the erase.
    need = par_a + LIMITS_SCRUTINY
    cap = max(LIMITS_SCRUTINY, math.ceil(need / 2))
    assert cap < need <= 2 * cap
    print(f"start cut {cuts[s]}; A: {goal_a.sum()} maps ({goal_a.mean():.2%}), par {par_a}; "
          f"B: {goal_b.sum()} maps ({goal_b.mean():.2%}), par {par_b}; scrutiny cap {cap}")

    a_idx = np.flatnonzero(goal_a)[np.argsort(dist[goal_a], kind="stable")][:N_A_SOLUTIONS]
    # Task B targets: nearest to the start, plus nearest to each shipped Task A map (where players will be).
    b_all = np.flatnonzero(goal_b)
    b_pick = list(b_all[np.argsort(dist[goal_b], kind="stable")][:60])
    for a in a_idx[:20]:
        da = distances(plans[b_all], plans[a].astype(int))
        b_pick += list(b_all[np.argsort(da, kind="stable")[:5]])
    b_idx = list(dict.fromkeys(int(i) for i in b_pick))[:N_B_SOLUTIONS]

    icons = []
    for i, t in enumerate(tiles):
        rc = (t["row"], t["col"])
        icons.append(
            # one icon per land type, so "you can only join districts of the same land" reads at a glance
            "city" if i in city else "town" if i in town else "farm"
        )

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
                "votes": {"government": int(votes[i, GOV]), "opposition": int(votes[i, OPP])},
                "muni": "City" if i in city else "Town" if i in town else None,
                "icon": icons[i],
                "outline": None,
            }
            for i, t in enumerate(tiles)
        ],
        "adjacency": adj,
        "start": start.tolist(),
        "rules": {"nDistricts": K, "band": 0.0, "muniLock": True, "powers": ["limits", "toss"], "driftCap": cap, "limitsScrutiny": LIMITS_SCRUTINY},
        "tasks": [
            {
                "id": "ta",
                "role": "government",
                "intro": ["You're the Government.", "You're behind in the city and the town.", "You also hold the pen."],
                "prompt": "Government: win 3 seats.",
                "goal": {"party": "government", "minSeats": 3, "swings": [0]},
                "par": None,
                "success": "A Government majority. Same votes as before.",
                "caption": "Government's map",
            },
            {
                "id": "tb",
                "role": "opposition",
                "intro": ["Now imagine the Opposition wins.", "The city limits are still gone.", "And now they hold the pen."],
                "prompt": "Opposition: win 4 seats.",
                "goal": {"party": "opposition", "minSeats": 4, "swings": [0]},
                "par": None,
                "success": "Same votes. Same trick. Other side.",
                "caption": "Opposition's map",
            },
        ],
        "stats": {
            "nPlans": int(len(plans)),
            "seatDist": {},
            "goalShare": {"ta": round(float(goal_a.mean()), 4), "tb": round(float(goal_b.mean()), 4)},
            "bestDrift": {"ta": par_a, "tb": par_b},
        },
        "solutions": {
            "ta": [{"k": K, "lock": False, "plan": plans[i].tolist()} for i in a_idx],
            "tb": [{"k": K, "lock": False, "plan": plans[i].tolist()} for i in b_idx],
        },
    }
    OUT_JSON.write_text(json.dumps(board, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {OUT_JSON}")


if __name__ == "__main__":
    main()
