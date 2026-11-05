"""Generate World 1 ("Coulee County") candidates, filter them, and write boards/w1.json.

Usage:
    python board_w1.py                 # search, write report + boards/w1.json (best candidate)
    python board_w1.py --pick 3        # write candidate #3 from the report instead
    python board_w1.py --seed 7 --samples 40000

Design filters (SPEC §11):
    start map is 3-2 Blue and compact; task 1 par in [2, 4]; task 2 par in [3, 6];
    goal plans are < 15% of all valid plans.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

import solver

ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "boards" / "w1.json"
REPORT = Path(__file__).resolve().parent / "out" / "w1_candidates.txt"

N_DISTRICTS = 5
N_ORANGE = 10  # 15 Blue / 10 Orange
BLUE, ORANGE = 0, 1

# Mini-Alberta: rows north -> south, (first_col, last_col) in odd-r offset coords.
# The SW corner is cut away in steps to suggest the Rockies.
ROWS = [(0, 4), (0, 4), (0, 4), (1, 4), (2, 4), (2, 4)]
TOWN = {(2, 2), (2, 3), (1, 2)}  # (row, col)
PUMPJACK = {(0, 4), (1, 4), (3, 4)}
MOUNTAIN = {(2, 0), (3, 1), (4, 2), (5, 2)}

T1_PAR = (2, 4)
T2_PAR = (3, 6)
MAX_GOAL_SHARE = 0.15


def silhouette():
    tiles = []
    for row, (c0, c1) in enumerate(ROWS):
        for col in range(c0, c1 + 1):
            q = col - (row - (row & 1)) // 2
            icon = (
                "town" if (row, col) in TOWN
                else "pumpjack" if (row, col) in PUMPJACK
                else "mountain" if (row, col) in MOUNTAIN
                else "farm"
            )
            tiles.append({"row": row, "col": col, "q": q, "r": row, "icon": icon})
    return tiles


def ascii_map(tiles, labels) -> str:
    lines = []
    for row, (c0, c1) in enumerate(ROWS):
        cells = {t["col"]: labels[i] for i, t in enumerate(tiles) if t["row"] == row}
        line = ("  " if row & 1 else "") + "".join(
            f"{cells[c]:>4}" if c in cells else "    " for c in range(5)
        )
        lines.append(line)
    return "\n".join(lines)


def sample_layouts(tiles, rng, n_samples):
    """Half uniform-random, half town-leaning (Orange more likely near town)."""
    n = len(tiles)
    town = [i for i, t in enumerate(tiles) if t["icon"] == "town"]
    coords = np.array([(t["q"], t["r"]) for t in tiles])

    def hexdist(a, b):
        dq, dr = a[0] - b[0], a[1] - b[1]
        return (abs(dq) + abs(dr) + abs(dq + dr)) / 2

    d_town = np.array([min(hexdist(coords[i], coords[j]) for j in town) for i in range(n)])
    seen = set()
    for k in range(n_samples):
        if k % 2 == 0:
            oranges = rng.choice(n, N_ORANGE, replace=False)
        else:
            score = -d_town * rng.uniform(0.3, 1.5) + rng.normal(0, 1.2, n)
            oranges = np.argsort(-score)[:N_ORANGE]
        key = tuple(sorted(oranges.tolist()))
        if key in seen:
            continue
        seen.add(key)
        yield np.array(key)


def search(seed: int, n_samples: int, n_starts: int):
    tiles = silhouette()
    coords = [(t["q"], t["r"]) for t in tiles]
    adj = solver.hex_adjacency(coords)
    n = len(tiles)
    size = n // N_DISTRICTS

    plans = solver.enumerate_plans(adj, N_DISTRICTS, size, size)
    print(f"{len(plans)} valid plans")
    membership = solver.one_hot(plans, N_DISTRICTS)
    cuts = solver.cut_edges(plans, adj)

    # Candidate start maps: the most compact plans.
    start_idx = np.argsort(cuts, kind="stable")[:n_starts]
    print(f"start candidates: cut edges {cuts[start_idx].min()}..{cuts[start_idx].max()} "
          f"(all plans {cuts.min()}..{cuts.max()})")
    dists = np.stack([solver.tiles_changed(membership, plans[s], N_DISTRICTS) for s in start_idx])

    rng = np.random.default_rng(seed)
    survivors = []
    for oranges in sample_layouts(tiles, rng, n_samples):
        votes = np.zeros((n, 2), dtype=np.float32)
        votes[:, BLUE] = 1
        votes[oranges, BLUE] = 0
        votes[oranges, ORANGE] = 1
        orange_in = membership @ votes[:, ORANGE]  # (P, k)
        orange_seats = (orange_in >= 3).sum(axis=1)
        g1 = orange_seats >= 3
        g2 = orange_seats == 0
        share1, share2 = g1.mean(), g2.mean()
        if not (0 < share1 < MAX_GOAL_SHARE and 0 < share2 < MAX_GOAL_SHARE):
            continue
        for si, s in enumerate(start_idx):
            if orange_seats[s] != 2:
                continue
            par1 = dists[si][g1].min()
            par2 = dists[si][g2].min()
            if not (T1_PAR[0] <= par1 <= T1_PAR[1] and T2_PAR[0] <= par2 <= T2_PAR[1]):
                continue
            # Prefer: compact start, mid-range pars, rarer goals, and a 3-2 start that is typical.
            score = (
                abs(par1 - 3) + abs(par2 - 4.5) * 0.7
                + (cuts[s] - cuts.min()) * 0.5
                + (share1 + share2) * 10
                - (orange_seats == 2).mean() * 2
            )
            survivors.append(dict(score=float(score), oranges=oranges, start=int(s),
                                  par1=int(par1), par2=int(par2),
                                  share1=float(share1), share2=float(share2), cuts=int(cuts[s])))
    survivors.sort(key=lambda c: c["score"])
    # One entry per vote layout (keep its best start map).
    uniq, seen = [], set()
    for c in survivors:
        key = tuple(c["oranges"].tolist())
        if key not in seen:
            seen.add(key)
            uniq.append(c)
    return tiles, adj, plans, membership, uniq


def relabel_to(start, plan) -> list[int]:
    """Relabel plan's districts to best match start (so unchanged districts keep their ids)."""
    from scipy.optimize import linear_sum_assignment

    m = np.zeros((N_DISTRICTS, N_DISTRICTS))
    for a, b in zip(start, plan):
        m[a, b] += 1
    r, c = linear_sum_assignment(-m)
    to_start = {int(cc): int(rr) for rr, cc in zip(r, c)}
    return [to_start[int(b)] for b in plan]


def build_board(tiles, adj, plans, membership, cand):
    n = len(tiles)
    votes = np.zeros((n, 2), dtype=np.float32)
    votes[:, BLUE] = 1
    votes[cand["oranges"], BLUE] = 0
    votes[cand["oranges"], ORANGE] = 1
    seat_counts = solver.seats(membership, votes)  # (P, 2)

    def dist(col):
        vals, counts = np.unique(seat_counts[:, col], return_counts=True)
        return {str(int(v)): round(float(c) / len(plans), 4) for v, c in zip(vals, counts)}

    start = plans[cand["start"]].tolist()
    # Closest goal-satisfying plan per task (used for the OG image and as a hint/answer key).
    changed = solver.tiles_changed(membership, np.array(start), N_DISTRICTS)
    orange = seat_counts[:, ORANGE]
    examples = {}
    for tid, ok in (("t1", orange >= 3), ("t2", orange == 0)):
        idx = np.flatnonzero(ok)
        examples[tid] = relabel_to(start, plans[idx[np.argmin(changed[idx])]])
    return {
        "id": "w1",
        "title": "Coulee County",
        "parties": [{"id": "blue", "label": "Blue"}, {"id": "orange", "label": "Orange"}],
        "tiles": [
            {
                "id": i,
                "q": t["q"],
                "r": t["r"],
                "tier": 1,
                "pop": 1,
                "votes": {"blue": int(votes[i, BLUE]), "orange": int(votes[i, ORANGE])},
                "muni": None,
                "icon": t["icon"],
                "outline": None,
            }
            for i, t in enumerate(tiles)
        ],
        "adjacency": adj,
        "start": start,
        "rules": {"nDistricts": N_DISTRICTS, "band": 0.0, "muniLock": False, "powers": []},
        "tasks": [
            {
                "id": "t1",
                "prompt": "Help Orange win 3 seats.",
                "goal": {"party": "orange", "minSeats": 3, "swings": [0]},
                "par": cand["par1"],
                "success": "Nice — that's called packing: stuff their voters into a few districts.",
            },
            {
                "id": "t2",
                "prompt": "Now give Blue all 5.",
                "goal": {"party": "blue", "minSeats": 5, "swings": [0]},
                "par": cand["par2"],
                "success": "That's cracking: spread their voters thin so they lose everywhere.",
            },
            {
                "id": "t3",
                "prompt": "No votes changed. No weird shapes.",
                "goal": None,
                "par": None,
                "success": None,
            },
        ],
        "stats": {
            "nPlans": int(len(plans)),
            "seatDist": {"blue": dist(BLUE), "orange": dist(ORANGE)},
            "goalShare": {"t1": round(cand["share1"], 4), "t2": round(cand["share2"], 4)},
        },
        "examples": examples,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--samples", type=int, default=20000)
    ap.add_argument("--starts", type=int, default=300)
    ap.add_argument("--pick", type=int, default=0, help="index into the ranked report")
    ap.add_argument("--report", type=int, default=20, help="how many candidates to print")
    args = ap.parse_args()

    tiles, adj, plans, membership, cands = search(args.seed, args.samples, args.starts)
    print(f"{len(cands)} surviving vote layouts")
    if not cands:
        raise SystemExit("no candidates survived the filters")

    REPORT.parent.mkdir(exist_ok=True)
    with REPORT.open("w") as f:
        for i, c in enumerate(cands[: args.report]):
            votes = ["G" if j in set(c["oranges"].tolist()) else "p" for j in range(len(tiles))]
            start = plans[c["start"]]
            both = [f"{votes[j]}{start[j]}" for j in range(len(tiles))]
            f.write(
                f"#{i}  score={c['score']:.2f}  par1={c['par1']} par2={c['par2']}  "
                f"orange3={c['share1']:.1%} blue5={c['share2']:.1%}  start_cuts={c['cuts']}\n"
            )
            f.write(ascii_map(tiles, both) + "\n\n")
    print(f"report: {REPORT}")

    board = build_board(tiles, adj, plans, membership, cands[args.pick])
    OUT_JSON.parent.mkdir(exist_ok=True)
    OUT_JSON.write_text(json.dumps(board, indent=1, ensure_ascii=False) + "\n")
    c = cands[args.pick]
    print(f"wrote {OUT_JSON} (candidate #{args.pick}: par1={c['par1']} par2={c['par2']}, "
          f"orange3={c['share1']:.1%}, blue5={c['share2']:.1%})")


if __name__ == "__main__":
    main()
