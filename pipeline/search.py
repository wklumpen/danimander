"""Heuristic plan search for boards too big to enumerate (World 2+).

Simulated annealing over single-tile moves that keep every district connected and in band.
Used to (a) build a compact fair start map, (b) find goal-satisfying plans close to a
baseline (solutions + an upper bound on par), and (c) check that a task is *not* reachable
under some rule set (heuristic: no solution found in many restarts).
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field

import solver


@dataclass
class Rules:
    k: int
    lo: int
    hi: int
    lock: bool  # municipal lock: a district may not mix municipalities


@dataclass
class Goal:
    party: int  # index into the per-tile share vector (0 = first party)
    need: int
    swings: list[float] = field(default_factory=lambda: [0.0])


def tile_share(shares: list[float], party: int, s: float) -> list[float]:
    """Per-tile share for `party` after a uniform swing s toward it, clamped (two-party)."""
    out = []
    for g in shares:
        p = g if party == 0 else 1 - g
        out.append(min(1.0, max(0.0, p + s)))
    return out


def connected_without(tiles: set[int], drop: int, adj: list[list[int]]) -> bool:
    rest = tiles - {drop}
    if not rest:
        return False
    start = next(iter(rest))
    seen, stack = {start}, [start]
    while stack:
        v = stack.pop()
        for w in adj[v]:
            if w in rest and w not in seen:
                seen.add(w)
                stack.append(w)
    return len(seen) == len(rest)


class State:
    def __init__(self, assign: list[int], k: int, adj, muni):
        self.a = list(assign)
        self.k = k
        self.adj = adj
        self.muni = muni
        self.members = [set() for _ in range(k)]
        for i, d in enumerate(self.a):
            self.members[d].add(i)

    def district_muni(self, d: int) -> set:
        return {self.muni[i] for i in self.members[d]}

    def legal(self, t: int, d2: int, rules: Rules) -> bool:
        d1 = self.a[t]
        if d1 == d2:
            return False
        if len(self.members[d1]) - 1 < rules.lo or len(self.members[d2]) + 1 > rules.hi:
            return False
        if not any(self.a[j] == d2 for j in self.adj[t]):
            return False
        if rules.lock and self.members[d2] and self.district_muni(d2) != {self.muni[t]}:
            return False
        return connected_without(self.members[d1], t, self.adj)

    def move(self, t: int, d2: int):
        d1 = self.a[t]
        self.members[d1].discard(t)
        self.members[d2].add(t)
        self.a[t] = d2


def seats_at(assign: list[int], k: int, share_p: list[float]) -> tuple[int, list[float]]:
    tot = [0.0] * k
    cnt = [0] * k
    for i, d in enumerate(assign):
        tot[d] += share_p[i]
        cnt[d] += 1
    margins = [tot[d] / cnt[d] - 0.5 if cnt[d] else -1 for d in range(k)]
    return sum(m > 0 for m in margins), margins


def goal_met(assign, k, shares, goal: Goal) -> bool:
    return all(seats_at(assign, k, tile_share(shares, goal.party, s))[0] >= goal.need for s in goal.swings)


def anneal(
    init: list[int],
    k: int,
    adj,
    muni,
    rules: Rules,
    energy,
    steps: int = 20000,
    t0: float = 2.0,
    t1: float = 0.02,
    rng: random.Random | None = None,
):
    """Generic SA. `energy(assign) -> float`. Returns (best_assign, best_energy)."""
    rng = rng or random.Random(0)
    st = State(init, k, adj, muni)
    e = energy(st.a)
    best, best_e = list(st.a), e
    n = len(st.a)
    for step in range(steps):
        T = t0 * (t1 / t0) ** (step / steps)
        t = rng.randrange(n)
        nbr = [st.a[j] for j in adj[t] if st.a[j] != st.a[t]]
        if not nbr:
            continue
        d2 = rng.choice(nbr)
        if not st.legal(t, d2, rules):
            continue
        d1 = st.a[t]
        st.move(t, d2)
        e2 = energy(st.a)
        if e2 <= e or rng.random() < math.exp((e - e2) / T):
            e = e2
            if e < best_e:
                best, best_e = list(st.a), e
        else:
            st.move(t, d1)
    return best, best_e


def goal_energy(shares, goal: Goal, k: int, baseline: list[int], drift_weight: float = 1.0, final_lo: int | None = None):
    per_swing = [(s, None) for s in goal.swings]

    def energy(assign):
        deficit = 0.0
        for s, _ in per_swing:
            _, margins = seats_at(assign, k, tile_share(shares, goal.party, s))
            top = sorted(margins, reverse=True)[: goal.need]
            deficit += sum(max(0.0, 0.004 - m) for m in top)
        drift = sum(a != b for a, b in zip(assign, baseline))
        short = 0
        if final_lo:
            counts = [0] * k
            for d in assign:
                counts[d] += 1
            short = sum(max(0, final_lo - c) for c in counts)
        return 400 * deficit + drift_weight * drift + 30 * short

    return energy


def find_solutions(
    baseline: list[int],
    shares,
    goal: Goal,
    adj,
    muni,
    rules: Rules,
    restarts: int = 30,
    steps: int = 20000,
    seed: int = 0,
    init_fn=None,
    final_lo: int | None = None,
):
    """Goal plans near `baseline`. Returns list of (tiles_changed_hungarian, plan), best first, deduped."""
    rng = random.Random(seed)
    found = {}
    for r in range(restarts):
        init = init_fn(rng) if init_fn else list(baseline)
        energy = goal_energy(shares, goal, rules.k, init if init_fn else baseline, drift_weight=rng.uniform(0.05, 0.4), final_lo=final_lo)
        plan, _ = anneal(init, rules.k, adj, muni, rules, energy, steps=steps, rng=random.Random(rng.random()))
        if goal_met(plan, rules.k, shares, goal):
            key = tuple(plan)
            if key not in found:
                found[key] = solver.hungarian_tiles_changed(baseline, plan, max(rules.k, max(baseline) + 1))
    return sorted(((d, list(p)) for p, d in found.items()), key=lambda x: x[0])
