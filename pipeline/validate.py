"""Validate every board in /boards and (optionally) write TS parity fixtures.

    python validate.py                   # validate, exit 1 on any failure
    python validate.py --write-fixtures  # also write boards/fixtures/<id>.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

import solver

ROOT = Path(__file__).resolve().parent.parent
BOARDS = ROOT / "boards"
FIXTURES = BOARDS / "fixtures"

PAR_RANGES = {"w1": {"t1": (2, 4), "t2": (3, 6)}}


def load_boards():
    return sorted(p for p in BOARDS.glob("*.json"))


def check_board(board: dict) -> list[str]:
    errs = []
    tiles = board["tiles"]
    n = len(tiles)
    rules = board["rules"]
    k = rules["nDistricts"]
    pop = [t["pop"] for t in tiles]
    adj = board["adjacency"]
    parties = [p["id"] for p in board["parties"]]

    if [t["id"] for t in tiles] != list(range(n)):
        errs.append("tile ids must be 0..n-1 in order")
    if len(adj) != n or any(i not in adj[j] for i in range(n) for j in adj[i]):
        errs.append("adjacency must have n rows and be symmetric")
    if all(t["outline"] is None for t in tiles):
        expected = solver.hex_adjacency([(t["q"], t["r"]) for t in tiles])
        if expected != [sorted(a) for a in adj]:
            errs.append("adjacency does not match hex coordinates")
    if len(board["start"]) != n:
        errs.append("start length != n tiles")
    errs += [f"start: {p}" for p in solver.validate_plan(board["start"], adj, pop, k, rules["band"])]

    # Exhaustive checks for unit-pop boards small enough to enumerate.
    if all(p == 1 for p in pop) and n <= 30:
        lo, hi = solver.int_band(n, k, rules["band"])
        plans = solver.enumerate_plans(adj, k, lo, hi)
        if board["stats"]["nPlans"] != len(plans):
            errs.append(f"stats.nPlans {board['stats']['nPlans']} != enumerated {len(plans)}")
        m = solver.one_hot(plans, k)
        votes = np.array([[t["votes"][p] for p in parties] for t in tiles], dtype=np.float32)
        seat_counts = solver.seats(m, votes)
        dist = solver.tiles_changed(m, np.array(board["start"]), k)
        for task in board["tasks"]:
            goal = task.get("goal")
            if not goal:
                continue
            col = parties.index(goal["party"])
            ok = seat_counts[:, col] >= goal["minSeats"]
            if not ok.any():
                errs.append(f"task {task['id']} unreachable")
                continue
            par = int(dist[ok].min())
            if par != task["par"]:
                errs.append(f"task {task['id']} par {task['par']} != solver {par}")
            rng = PAR_RANGES.get(board["id"], {}).get(task["id"])
            if rng and not (rng[0] <= par <= rng[1]):
                errs.append(f"task {task['id']} par {par} outside design range {rng}")
    return errs


def write_fixtures(board: dict, n_random: int = 40, seed: int = 0):
    """Plans + expected results so the TS game logic can be checked against Python."""
    rng = np.random.default_rng(seed)
    tiles, adj, rules = board["tiles"], board["adjacency"], board["rules"]
    n, k = len(tiles), rules["nDistricts"]
    pop = [t["pop"] for t in tiles]
    parties = [p["id"] for p in board["parties"]]
    votes = np.array([[t["votes"][p] for p in parties] for t in tiles], dtype=np.float32)
    start = board["start"]

    plans = [list(start)]
    lo, hi = solver.int_band(n, k, rules["band"])
    valid = solver.enumerate_plans(adj, k, lo, hi)
    for i in rng.choice(len(valid), n_random // 2, replace=False):
        perm = rng.permutation(k)  # non-canonical labels exercise Hungarian matching
        plans.append([int(perm[d]) for d in valid[i]])
    for _ in range(n_random // 2):  # random single/multi-tile edits, often invalid
        p = list(start)
        for _ in range(rng.integers(1, 5)):
            t = int(rng.integers(n))
            p[t] = int(rng.integers(k))
        plans.append(p)

    cases = []
    for p in plans:
        problems = solver.validate_plan(p, adj, pop, k, rules["band"])
        arr = np.array([p])
        m = solver.one_hot(arr, k)
        dv = solver.district_votes(m, votes)[0]
        winners = [parties[int(np.argmax(r))] if np.sum(r == r.max()) == 1 else None for r in dv]
        cases.append({
            "assignment": p,
            "valid": not problems,
            "tilesChanged": solver.hungarian_tiles_changed(start, p, k),
            "winners": winners,
        })
    FIXTURES.mkdir(exist_ok=True)
    out = FIXTURES / f"{board['id']}.json"
    out.write_text(json.dumps({"board": board["id"], "cases": cases}) + "\n")
    print(f"wrote {out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write-fixtures", action="store_true")
    args = ap.parse_args()
    failed = False
    for path in load_boards():
        board = json.loads(path.read_text())
        errs = check_board(board)
        status = "ok" if not errs else "FAIL"
        print(f"{path.name}: {status}")
        for e in errs:
            print(f"  - {e}")
        failed |= bool(errs)
        if args.write_fixtures and not errs:
            write_fixtures(board)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
