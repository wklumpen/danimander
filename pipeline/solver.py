"""Partition enumeration, seat scoring, and par computation for Dani-Mander boards.

A *plan* is an assignment tile -> district id. Enumerated plans use canonical
labels: district 0 contains tile 0, district 1 contains the lowest tile not in
district 0, and so on. Label permutations are therefore never double counted.
"""

from __future__ import annotations

from itertools import permutations
from math import ceil, floor

import numpy as np
from scipy.optimize import linear_sum_assignment

# ---------------------------------------------------------------------------
# Hex geometry (pointy-top, axial q,r)
# ---------------------------------------------------------------------------

AXIAL_DIRS = [(1, 0), (1, -1), (0, -1), (-1, 0), (-1, 1), (0, 1)]


def hex_adjacency(coords: list[tuple[int, int]]) -> list[list[int]]:
    index = {c: i for i, c in enumerate(coords)}
    return [
        sorted(index[(q + dq, r + dr)] for dq, dr in AXIAL_DIRS if (q + dq, r + dr) in index)
        for q, r in coords
    ]


# ---------------------------------------------------------------------------
# Band / validity
# ---------------------------------------------------------------------------


def size_band(total_pop: float, n_districts: int, band: float) -> tuple[float, float]:
    quota = total_pop / n_districts
    return quota * (1 - band), quota * (1 + band)


def int_band(n_tiles: int, n_districts: int, band: float) -> tuple[int, int]:
    """Integer tile-count band for unit-population boards."""
    lo, hi = size_band(n_tiles, n_districts, band)
    return ceil(lo - 1e-9), floor(hi + 1e-9)


def is_connected(tiles: set[int], adj: list[list[int]]) -> bool:
    if not tiles:
        return False
    start = next(iter(tiles))
    seen = {start}
    stack = [start]
    while stack:
        v = stack.pop()
        for w in adj[v]:
            if w in tiles and w not in seen:
                seen.add(w)
                stack.append(w)
    return len(seen) == len(tiles)


def validate_plan(
    assignment: list[int], adj: list[list[int]], pop: list[float], n_districts: int, band: float,
    muni: list | None = None, muni_lock: bool = False,
) -> list[str]:
    """Return a list of problems (empty == valid). With muni_lock, a district may not mix munis."""
    problems = []
    lo, hi = size_band(sum(pop), n_districts, band)
    for d in range(n_districts):
        tiles = {i for i, a in enumerate(assignment) if a == d}
        if not tiles:
            problems.append(f"district {d} empty")
            continue
        p = sum(pop[i] for i in tiles)
        if not (lo - 1e-9 <= p <= hi + 1e-9):
            problems.append(f"district {d} pop {p} outside [{lo}, {hi}]")
        if not is_connected(tiles, adj):
            problems.append(f"district {d} disconnected")
        if muni_lock and muni is not None and len({muni[i] or "" for i in tiles}) > 1:
            problems.append(f"district {d} mixes municipalities")
    if any(a < 0 or a >= n_districts for a in assignment):
        problems.append("assignment label out of range")
    return problems


# ---------------------------------------------------------------------------
# Enumeration
# ---------------------------------------------------------------------------


def _components(free: set[int], adj: list[list[int]]) -> list[int]:
    sizes = []
    seen: set[int] = set()
    for s in free:
        if s in seen:
            continue
        seen.add(s)
        stack, n = [s], 0
        while stack:
            v = stack.pop()
            n += 1
            for w in adj[v]:
                if w in free and w not in seen:
                    seen.add(w)
                    stack.append(w)
        sizes.append(n)
    return sizes


def _connected_sets(root: int, free: set[int], adj: list[list[int]], lo: int, hi: int):
    """Yield every connected subset of `free` containing `root` with size in [lo, hi].

    Uses the standard extension-set algorithm: each subset is produced exactly once.
    """

    def extend(current: list[int], ext: list[int], nbhd: set[int]):
        # ESU: nbhd = current ∪ N(current); new candidates are only exclusive neighbours of w.
        if len(current) >= lo:
            yield current
        if len(current) == hi:
            return
        ext = list(ext)
        while ext:
            w = ext.pop()
            new = [u for u in adj[w] if u in free and u not in nbhd]
            yield from extend(current + [w], ext + new, nbhd | set(new))

    ext0 = [u for u in adj[root] if u in free]
    yield from extend([root], ext0, {root} | set(ext0))


def enumerate_plans(adj: list[list[int]], n_districts: int, lo: int, hi: int) -> np.ndarray:
    """All partitions of a unit-population graph into n connected districts of size in [lo, hi].

    Returns an int8 array (n_plans, n_tiles) with canonical labels.
    """
    n = len(adj)
    out: list[list[int]] = []
    assignment = [-1] * n

    def feasible(free: set[int], remaining: int) -> bool:
        if not (remaining * lo <= len(free) <= remaining * hi):
            return False
        for s in _components(free, adj):
            # A component of size s must be splittable into m districts for some m.
            if not any(m * lo <= s <= m * hi for m in range(1, remaining + 1)):
                return False
        return True

    def rec(free: set[int], d: int):
        if d == n_districts:
            if not free:
                out.append(assignment.copy())
            return
        root = min(free)
        for district in _connected_sets(root, free, adj, lo, hi):
            rest = free - set(district)
            remaining = n_districts - d - 1
            if (remaining == 0) != (not rest):
                continue
            if rest and not feasible(rest, remaining):
                continue
            for t in district:
                assignment[t] = d
            rec(rest, d + 1)
            for t in district:
                assignment[t] = -1

    rec(set(range(n)), 0)
    return np.array(out, dtype=np.int8)


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------


def one_hot(plans: np.ndarray, n_districts: int) -> np.ndarray:
    """(n_plans, n_tiles) -> (n_plans, n_districts, n_tiles) float32 membership."""
    return (plans[:, None, :] == np.arange(n_districts)[None, :, None]).astype(np.float32)


def district_votes(membership: np.ndarray, votes: np.ndarray) -> np.ndarray:
    """membership (P,k,n), votes (n, parties) -> (P, k, parties)."""
    return membership @ votes.astype(np.float32)


def seats(membership: np.ndarray, votes: np.ndarray) -> np.ndarray:
    """Seats per party for each plan: (P, parties). Raises on ties (caller must avoid)."""
    dv = district_votes(membership, votes)
    top = dv.max(axis=2, keepdims=True)
    if ((dv == top).sum(axis=2) > 1).any():
        raise ValueError("tie in at least one district; use tie-free boards or a tiebreak")
    winners = dv.argmax(axis=2)
    return np.stack([(winners == p).sum(axis=1) for p in range(votes.shape[1])], axis=1)


def cut_edges(plans: np.ndarray, adj: list[list[int]]) -> np.ndarray:
    edges = np.array([(i, j) for i, ns in enumerate(adj) for j in ns if i < j])
    return (plans[:, edges[:, 0]] != plans[:, edges[:, 1]]).sum(axis=1)


def overlap(membership: np.ndarray, start: np.ndarray, n_districts: int) -> np.ndarray:
    """(P, k_start, k_plan) overlap counts between start districts and each plan's districts."""
    start_m = (start[None, :] == np.arange(n_districts)[:, None]).astype(np.float32)  # (k, n)
    return np.einsum("an,pbn->pab", start_m, membership)


def tiles_changed(membership: np.ndarray, start: np.ndarray, n_districts: int) -> np.ndarray:
    """Tiles whose district differs from start, after optimal (Hungarian) label matching."""
    ov = overlap(membership, start, n_districts)
    n = start.shape[0]
    if n_districts <= 7:
        perms = np.array(list(permutations(range(n_districts))))  # (k!, k)
        rows = np.arange(n_districts)
        best = ov[:, rows[None, :], perms].sum(axis=2).max(axis=1)
        return (n - best).round().astype(int)
    out = np.empty(len(ov), dtype=int)
    for i, m in enumerate(ov):
        r, c = linear_sum_assignment(-m)
        out[i] = round(n - m[r, c].sum())
    return out


def hungarian_tiles_changed(start: list[int], plan: list[int], n_districts: int) -> int:
    """Reference scalar implementation (used for parity fixtures)."""
    m = np.zeros((n_districts, n_districts))
    for a, b in zip(start, plan):
        m[a, b] += 1
    r, c = linear_sum_assignment(-m)
    return int(round(len(start) - m[r, c].sum()))
