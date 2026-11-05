"""Generate World 1 ("Coulee County") candidates, filter them, and write boards/w1.json.

Usage:
    python board_w1.py                 # search, write report + boards/w1.json (best candidate)
    python board_w1.py --pick 3        # write candidate #3 from the report instead
    python board_w1.py --seed 7 --samples 40000

Design filters (SPEC §11):
    start map is 3-2 Purple and compact; task 1 par in [2, 4]; task 2 par in [3, 6];
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
N_GREEN = 10  # 15 Purple / 10 Green
PURPLE, GREEN = 0, 1

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
    """Half uniform-random, half town-leaning (Green more likely near town)."""
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
            greens = rng.choice(n, N_GREEN, replace=False)
        else:
            score = -d_town * rng.uniform(0.3, 1.5) + rng.normal(0, 1.2, n)
            greens = np.argsort(-score)[:N_GREEN]
        key = tuple(sorted(greens.tolist()))
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
    for greens in sample_layouts(tiles, rng, n_samples):
        votes = np.zeros((n, 2), dtype=np.float32)
        votes[:, PURPLE] = 1
        votes[greens, PURPLE] = 0
        votes[greens, GREEN] = 1
        green_in = membership @ votes[:, GREEN]  # (P, k)
        green_seats = (green_in >= 3).sum(axis=1)
        g1 = green_seats >= 3
        g2 = green_seats == 0
        share1, share2 = g1.mean(), g2.mean()
        if not (0 < share1 < MAX_GOAL_SHARE and 0 < share2 < MAX_GOAL_SHARE):
            continue
        for si, s in enumerate(start_idx):
            if green_seats[s] != 2:
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
                - (green_seats == 2).mean() * 2
            )
            survivors.append(dict(score=float(score), greens=greens, start=int(s),
                                  par1=int(par1), par2=int(par2),
                                  share1=float(share1), share2=float(share2), cuts=int(cuts[s])))
    survivors.sort(key=lambda c: c["score"])
    # One entry per vote layout (keep its best start map).
    uniq, seen = [], set()
    for c in survivors:
        key = tuple(c["greens"].tolist())
        if key not in seen:
            seen.add(key)
            uniq.append(c)
    return tiles, adj, plans, membership, uniq


def build_board(tiles, adj, plans, membership, cand):
    n = len(tiles)
    votes = np.zeros((n, 2), dtype=np.float32)
    votes[:, PURPLE] = 1
    votes[cand["greens"], PURPLE] = 0
    votes[cand["greens"], GREEN] = 1
    seat_counts = solver.seats(membership, votes)  # (P, 2)

    def dist(col):
        vals, counts = np.unique(seat_counts[:, col], return_counts=True)
        return {str(int(v)): round(float(c) / len(plans), 4) for v, c in zip(vals, counts)}

    start = plans[cand["start"]].tolist()
    return {
        "id": "w1",
        "title": "Coulee County",
        "parties": [{"id": "purple", "label": "Purple"}, {"id": "green", "label": "Green"}],
        "tiles": [
            {
                "id": i,
                "q": t["q"],
                "r": t["r"],
                "tier": 1,
                "pop": 1,
                "votes": {"purple": int(votes[i, PURPLE]), "green": int(votes[i, GREEN])},
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
                "prompt": "Help Green win 3 seats.",
                "goal": {"party": "green", "minSeats": 3, "swings": [0]},
                "par": cand["par1"],
                "success": "Nice — that's called packing: stuff their voters into a few districts.",
            },
            {
                "id": "t2",
                "prompt": "Now give Purple all 5.",
                "goal": {"party": "purple", "minSeats": 5, "swings": [0]},
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
            "seatDist": {"purple": dist(PURPLE), "green": dist(GREEN)},
            "goalShare": {"t1": round(cand["share1"], 4), "t2": round(cand["share2"], 4)},
        },
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
            votes = ["G" if j in set(c["greens"].tolist()) else "p" for j in range(len(tiles))]
            start = plans[c["start"]]
            both = [f"{votes[j]}{start[j]}" for j in range(len(tiles))]
            f.write(
                f"#{i}  score={c['score']:.2f}  par1={c['par1']} par2={c['par2']}  "
                f"green3={c['share1']:.1%} purple5={c['share2']:.1%}  start_cuts={c['cuts']}\n"
            )
            f.write(ascii_map(tiles, both) + "\n\n")
    print(f"report: {REPORT}")

    board = build_board(tiles, adj, plans, membership, cands[args.pick])
    OUT_JSON.parent.mkdir(exist_ok=True)
    OUT_JSON.write_text(json.dumps(board, indent=1, ensure_ascii=False) + "\n")
    c = cands[args.pick]
    print(f"wrote {OUT_JSON} (candidate #{args.pick}: par1={c['par1']} par2={c['par2']}, "
          f"green3={c['share1']:.1%}, purple5={c['share2']:.1%})")


if __name__ == "__main__":
    main()
