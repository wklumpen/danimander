"""Generate World 2 ("Prairie City") and write boards/w2.json.

    python board_w2.py

A small map that teaches the Government's tools one at a time: 15 hexes, 3 districts of exactly 5,
three rows of five. Farmland in the west (one district), a city in the east (two districts). Hexes
are solid Government (blue) or Opposition (orange): the Government has 6 of 15 (40%), four farms
plus two city hexes, so while the city limits hold, no city district can go Government.

Levels (same map, same votes):
  1. 🚧 Erase the City Limits only. Government 2 of 3: impossible while locked (checked), par P.
  2. The same goal under a scrutiny cap, plus 🗑️ Toss the Ref's Report. The erase costs
     LIMITS_SCRUTINY, and cap < P + LIMITS_SCRUTINY <= 2·cap, so exactly one toss is needed.
  3. The Opposition takes the pen from the player's level-2 map (limits still gone) and sweeps
     all 3. The web app sizes this level's cap from the player's map so one toss is enough.

The vote layout was picked by exhaustive search over small shapes for: lock blocks a Government
majority, compact fair start (Opposition 2–1), Government-majority maps rare (<20%) and at
least 4 hexes away, and an Opposition sweep possible.
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

K, SIZE = 3, 5
ROWS, COLS = 3, 5
COUNTRY = {0, 1, 5, 10, 11}  # west: one district of farmland
OPP_FARMS = {0}
GOV_CITY = {2, 8}
LIMITS_SCRUTINY = 2


def distances(plans: np.ndarray, start: np.ndarray) -> np.ndarray:
    perms = np.array(list(permutations(range(K))))
    rows = np.arange(K)
    sm = (start[None, :] == rows[:, None]).astype(np.int16)
    m = (plans[:, None, :] == rows[None, :, None]).astype(np.int16)
    ov = np.einsum("an,cbn->cab", sm, m)
    return plans.shape[1] - ov[:, rows[None, :], perms].sum(axis=2).max(axis=1)


def main():
    coords = [(c - (r - (r & 1)) // 2, r) for r in range(ROWS) for c in range(COLS)]
    n = len(coords)
    adj = solver.hex_adjacency(coords)
    city = [i for i in range(n) if i not in COUNTRY]
    opp = np.array([int(i in OPP_FARMS or (i not in COUNTRY and i not in GOV_CITY)) for i in range(n)])
    assert opp.sum() == 9

    plans = solver.enumerate_plans(adj, K, SIZE, SIZE)
    masks = [plans == d for d in range(K)]
    opp_seats = sum(((m @ opp) >= 3).astype(np.int8) for m in masks)
    gov_seats = K - opp_seats
    country = np.array(sorted(COUNTRY))
    locked = np.array([len(set(p[country])) == 1 and p[country[0]] not in p[city] for p in plans])
    assert not (locked & (gov_seats >= 2)).any(), "the lock must block a Government majority"

    edges = np.array([(i, j) for i in range(n) for j in adj[i] if i < j])
    cuts = (plans[:, edges[:, 0]] != plans[:, edges[:, 1]]).sum(axis=1)
    fair = np.flatnonzero(locked & (opp_seats == 2))
    s = fair[np.argmin(cuts[fair])]
    start = plans[s].astype(int)

    goal_gov, goal_opp = gov_seats >= 2, opp_seats == 3
    dist = distances(plans, start)
    par = int(dist[goal_gov].min())
    need = par + LIMITS_SCRUTINY
    cap = max(LIMITS_SCRUTINY, math.ceil(need / 2))
    assert cap < need <= 2 * cap
    assert goal_gov.mean() < 0.2 and par >= 4 and goal_opp.any()
    print(f"{len(plans)} maps; Government majority {goal_gov.sum()} ({goal_gov.mean():.1%}), par {par}, "
          f"scrutiny cap {cap}; Opposition sweep {goal_opp.sum()}")

    gov_plans = [plans[i].tolist() for i in np.flatnonzero(goal_gov)[np.argsort(dist[goal_gov], kind="stable")]]
    opp_plans = [plans[i].tolist() for i in np.flatnonzero(goal_opp)]
    sol = lambda ps: [{"k": K, "lock": False, "plan": p} for p in ps]  # noqa: E731

    board = {
        "id": "w2",
        "title": "Prairie City",
        "parties": [
            {"id": "government", "label": "Government", "color": "blue"},
            {"id": "opposition", "label": "Opposition", "color": "orange"},
        ],
        "tiles": [
            {
                "id": i,
                "q": q,
                "r": r,
                "tier": 1,
                "pop": 1,
                "votes": {"government": int(1 - opp[i]), "opposition": int(opp[i])},
                "muni": None if i in COUNTRY else "City",
                "icon": "farm" if i in COUNTRY else "city",
                "outline": None,
            }
            for i, (q, r) in enumerate(coords)
        ],
        "adjacency": adj,
        "start": start.tolist(),
        "rules": {"nDistricts": K, "band": 0.0, "muniLock": True, "powers": ["limits", "toss"], "limitsScrutiny": LIMITS_SCRUTINY},
        "tasks": [
            {
                "id": "l1",
                "role": "government",
                "powers": ["limits"],
                "intro": ["You're the Government.", "The city votes Opposition.", "The city limits keep it that way."],
                "prompt": "Government: win 2 seats.",
                "goal": {"party": "government", "minSeats": 2, "swings": [0]},
                "par": None,
                "success": "Limits gone, city split. Same votes as before.",
            },
            {
                "id": "l2",
                "role": "government",
                "powers": ["limits", "toss"],
                "driftCap": cap,
                "intro": ["Same map. Same votes.", "But now people are watching.", "Every hex you redraw adds scrutiny."],
                "prompt": "Government: win 2 seats — quietly.",
                "goal": {"party": "government", "minSeats": 2, "swings": [0]},
                "par": None,
                "success": "Report tossed. Nobody's counting any more.",
                "caption": "Government's map",
            },
            {
                "id": "l3",
                "role": "opposition",
                "powers": ["toss"],
                "driftCap": cap,
                "continues": True,
                "intro": ["Now imagine the Opposition wins.", "The city limits are still gone.", "And now they hold the pen."],
                "prompt": "Opposition: win all 3 seats.",
                "goal": {"party": "opposition", "minSeats": 3, "swings": [0]},
                "par": None,
                "success": "Same votes. Same trick. Other side.",
                "caption": "Opposition's map",
            },
        ],
        "stats": {
            "nPlans": int(len(plans)),
            "seatDist": {},
            "goalShare": {"l1": round(float(goal_gov.mean()), 4), "l2": round(float(goal_gov.mean()), 4), "l3": round(float(goal_opp.mean()), 4)},
            "bestDrift": {"l1": par, "l2": par},
        },
        "solutions": {"l1": sol(gov_plans), "l2": sol(gov_plans), "l3": sol(opp_plans)},
    }
    OUT_JSON.write_text(json.dumps(board, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {OUT_JSON}")


if __name__ == "__main__":
    main()
