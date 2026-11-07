import { useMemo, useRef, useState } from "react";
import { districtVotes } from "../game/score";
import { colorOf, type Board as BoardT } from "../game/types";
import { intBand } from "../game/solver";
import { isConnected } from "../game/validate";
import { center, edges, hexPoints, labelPoint, viewBox } from "./hex";

// Shape backup for colour (SPEC accessibility): ▲ first party, ● second.
const GLYPHS = ["▲", "●"];
const ARROWS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

type Props = {
  board: BoardT;
  assignment: number[];
  nDistricts: number;
  selected?: number | null;
  targets?: Set<number>;
  invalid?: Set<number>;
  ghost?: boolean;
  onTap?: (tile: number) => void;
  onAssign?: (tile: number, district: number) => void;
  /** District the hint suggests; pulses on top of the normal target highlight. */
  hintDistrict?: number | null;
  /** Draw city-limit lines (World 2+, while the municipal lock is on). */
  cityLimits?: boolean;
  mini?: boolean;
  label?: string;
  /** Tutorial art: an arrow from one tile's centre to another's. */
  arrow?: [number, number];
};

export function Board(props: Props) {
  const { board, assignment, nDistricts, selected = null, targets, invalid, ghost, onTap, onAssign, hintDistrict = null, mini, label, cityLimits, arrow } = props;
  // Binary boards (World 1, dailies) show hex counts on badges; split-vote boards show the leader's %.
  const binary = useMemo(() => board.tiles.every((t) => Object.values(t.votes).every((v) => v === 0 || v === 1)), [board]);
  const picking = selected !== null && !!targets;
  const allEdges = useMemo(() => edges(board.tiles), [board]);
  const vb = useMemo(() => viewBox(board.tiles), [board]);
  const parties = board.parties.map((p) => p.id);
  const [focus, setFocus] = useState(0);
  const down = useRef<{ tile: number; deferDeselect: boolean } | null>(null);
  const interactive = !!onTap;

  const totals = districtVotes(board, assignment, nDistricts);
  const [lo, hi] = intBand(board.tiles.length, nDistricts, board.rules.band);
  const badges = Array.from({ length: nDistricts }, (_, d) => {
    const members = board.tiles.filter((_, i) => assignment[i] === d);
    const at = labelPoint(members);
    if (!at) return null;
    const [x, y] = at;
    const [a, b] = parties.map((p) => totals[d][p]);
    const pct = Math.round((Math.max(a, b) / (a + b || 1)) * 100);
    const leader = a === b ? null : a > b ? parties[0] : parties[1];
    // A red district's badge says what's wrong: "split" first (its count is beside the point
    // until it's one piece again), else hex count vs what's needed.
    const n = members.length;
    const split = () => !isConnected(assignment.flatMap((a, i) => (a === d ? [i] : [])), (t) => assignment[t] === d, board.adjacency);
    const fix = invalid?.has(d) ? (split() || (n >= lo && n <= hi) ? "split" : `${n}/${lo === hi ? lo : n < lo ? lo : hi}`) : null;
    return { d, x, y, a, b, leader, pct, fix };
  });

  // Pointer: tap-tap and drag share one path. Down selects; up over a different tile moves.
  const tileAt = (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-tile]");
    return el ? Number(el.getAttribute("data-tile")) : null;
  };
  const onDown = (i: number) => (e: React.PointerEvent) => {
    if (!onTap) return;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    setFocus(i);
    if (selected === i) down.current = { tile: i, deferDeselect: true };
    else {
      down.current = { tile: i, deferDeselect: false };
      onTap(i);
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d || !onTap) return;
    const j = tileAt(e);
    if (j === null) return;
    if (j !== d.tile) onTap(j);
    else if (d.deferDeselect) onTap(j);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!onTap) return;
    const dir = ARROWS[e.key];
    if (dir) {
      e.preventDefault();
      const [fx, fy] = center(board.tiles[focus]);
      let best = focus;
      let bestScore = -Infinity;
      for (const n of board.adjacency[focus]) {
        const [nx, ny] = center(board.tiles[n]);
        const len = Math.hypot(nx - fx, ny - fy);
        const score = ((nx - fx) * dir[0] + (ny - fy) * dir[1]) / len;
        if (score > 0.3 && score > bestScore) [best, bestScore] = [n, score];
      }
      setFocus(best);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTap(focus);
    } else if (/^[1-9]$/.test(e.key) && onAssign) {
      onAssign(selected ?? focus, Number(e.key) - 1);
    } else if (e.key === "Escape" && selected !== null) {
      onTap(selected);
    }
  };

  return (
    <svg
      className={mini ? "board mini" : "board"}
      viewBox={vb}
      role={interactive ? "application" : "img"}
      aria-label={label ?? board.title}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? onKey : undefined}
      onPointerUp={interactive ? onUp : undefined}
    >
      <defs>
        <pattern id="hatch" width="0.3" height="0.3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="0.3" stroke="var(--invalid)" strokeWidth="0.05" strokeOpacity="0.45" />
        </pattern>
      </defs>
      {board.tiles.map((t, i) => {
        // Lean = party with more votes on this hex; tint strength shows by how much.
        const pi = (t.votes[parties[1]] ?? 0) > (t.votes[parties[0]] ?? 0) ? 1 : 0;
        const party = parties[pi];
        const tot = parties.reduce((s, p) => s + (t.votes[p] ?? 0), 0) || 1;
        const lean = (t.votes[party] ?? 0) / tot; // 0.5..1
        const strength = binary ? 1 : Math.min(1, 0.35 + (lean - 0.5) * 3.2);
        const d = assignment[i];
        const isTarget = picking && targets!.has(d);
        const [cx, cy] = center(t);
        const cls = [
          "tile",
          isTarget && "target",
          picking && !isTarget && selected !== i && "dim",
          selected === i && "selected",
          interactive && focus === i && "focus",
        ];
        return (
          <g
            key={t.id}
            data-tile={i}
            className={cls.filter(Boolean).join(" ")}
            onPointerDown={interactive ? onDown(i) : undefined}
            aria-label={interactive ? `${board.parties[pi].label} ${t.icon}, district ${d + 1}` : undefined}
          >
            {!binary && <polygon points={hexPoints(t, 0.96)} className="fill-base" />}
            <polygon points={hexPoints(t, 0.96)} className={`fill-${colorOf(board, party)}`} fillOpacity={strength} />
            {isTarget && <polygon points={hexPoints(t, 1)} className={d === hintDistrict ? "wash hinted" : "wash"} pointerEvents="none" />}
            {invalid?.has(d) && <polygon points={hexPoints(t, 0.96)} fill="url(#hatch)" pointerEvents="none" />}
            {!mini && (
              <>
                <use href={`#ic-${t.icon}`} x={cx - 0.42} y={cy - 0.62} width={0.84} height={0.84} pointerEvents="none" />
                <text x={cx} y={cy + 0.58} className="glyph" pointerEvents="none">{GLYPHS[pi]}</text>
              </>
            )}
          </g>
        );
      })}
      {cityLimits &&
        allEdges
          .filter((e) => e.b !== null && (board.tiles[e.a].muni ?? "") !== (board.tiles[e.b].muni ?? ""))
          .map((e, k) => <line key={`c${k}`} {...lineProps(e)} className="city-limit" />)}
      {ghost &&
        allEdges
          .filter((e) => e.b !== null && board.start[e.a] !== board.start[e.b])
          .map((e, k) => <line key={`g${k}`} {...lineProps(e)} className="ghost" />)}
      {allEdges
        .filter((e) => e.b === null || assignment[e.a] !== assignment[e.b])
        .map((e, k) => {
          const bad = invalid && (invalid.has(assignment[e.a]) || (e.b !== null && invalid.has(assignment[e.b])));
          return <line key={k} {...lineProps(e)} className={bad ? "border bad" : "border"} />;
        })}
      {picking &&
        allEdges
          .filter((e) => {
            const a = assignment[e.a];
            const b = e.b === null ? null : assignment[e.b];
            return a !== b && (targets!.has(a) || (b !== null && targets!.has(b)));
          })
          .map((e, k) => <line key={`t${k}`} {...lineProps(e)} className="target-edge" />)}
      {picking && selected !== null && (
        <polygon points={hexPoints(board.tiles[selected], 0.9)} className="lifted" pointerEvents="none" />
      )}
      {arrow && <Arrow from={center(board.tiles[arrow[0]])} to={center(board.tiles[arrow[1]])} />}
      {badges.map(
        (b) =>
          b &&
          (b.fix && !mini ? (
            <g key={`${b.d}-fix`} className="badge fix" pointerEvents="none" style={{ transformOrigin: `${b.x}px ${b.y}px` }}>
              <rect x={b.x - 0.5} y={b.y - 0.27} width={1} height={0.54} rx={0.27} />
              <text x={b.x} y={b.y + 0.12}>{b.fix}</text>
            </g>
          ) : (
            // Keyed on leader so a flip remounts the badge and replays the pop animation.
            <g key={`${b.d}-${b.leader}`} className="badge" pointerEvents="none" style={{ transformOrigin: `${b.x}px ${b.y}px` }}>
              <circle cx={b.x} cy={b.y} r={mini ? 0.7 : 0.42} className={b.leader ? `fill-${colorOf(board, b.leader)} strong` : "fill-tie"} />
              {!mini && (
                <text x={b.x} y={b.y + 0.13} className={b.leader ? `on-${colorOf(board, b.leader)}` : undefined}>
                  {binary ? `${b.a}–${b.b}` : `${b.pct}%`}
                </text>
              )}
            </g>
          )),
      )}
    </svg>
  );
}

function Arrow({ from: [x1, y1], to: [x2, y2] }: { from: [number, number]; to: [number, number] }) {
  // Stop short of both centres; bow the line a little so it reads as a gesture.
  const len = Math.hypot(x2 - x1, y2 - y1);
  const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
  const [ax, ay] = [x1 + ux * 0.35, y1 + uy * 0.35];
  const [bx, by] = [x2 - ux * 0.45, y2 - uy * 0.45];
  const [cx, cy] = [(ax + bx) / 2 - uy * 0.4, (ay + by) / 2 + ux * 0.4];
  const h = 0.32; // head length
  const [hx, hy] = [bx - cx, by - cy].map((v) => v / Math.hypot(bx - cx, by - cy));
  const head = [
    [bx, by],
    [bx - hx * h - hy * h * 0.6, by - hy * h + hx * h * 0.6],
    [bx - hx * h + hy * h * 0.6, by - hy * h - hx * h * 0.6],
  ];
  return (
    <g className="arrow" pointerEvents="none">
      <path d={`M${ax},${ay} Q${cx},${cy} ${bx},${by}`} />
      <polygon points={head.map((p) => p.join(",")).join(" ")} />
    </g>
  );
}

function lineProps(e: { x1: number; y1: number; x2: number; y2: number }) {
  return { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, strokeLinecap: "round" as const };
}
