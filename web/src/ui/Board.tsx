import { useMemo, useRef, useState } from "react";
import { districtVotes } from "../game/score";
import type { Board as BoardT } from "../game/types";
import { center, edges, hexPoints, viewBox } from "./hex";

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
  mini?: boolean;
  label?: string;
};

export function Board(props: Props) {
  const { board, assignment, nDistricts, selected = null, targets, invalid, ghost, onTap, onAssign, hintDistrict = null, mini, label } = props;
  const picking = selected !== null && !!targets;
  const allEdges = useMemo(() => edges(board.tiles), [board]);
  const vb = useMemo(() => viewBox(board.tiles), [board]);
  const parties = board.parties.map((p) => p.id);
  const [focus, setFocus] = useState(0);
  const down = useRef<{ tile: number; deferDeselect: boolean } | null>(null);
  const interactive = !!onTap;

  const totals = districtVotes(board, assignment, nDistricts);
  const badges = Array.from({ length: nDistricts }, (_, d) => {
    const cs = board.tiles.filter((_, i) => assignment[i] === d).map(center);
    if (!cs.length) return null;
    const x = cs.reduce((s, c) => s + c[0], 0) / cs.length;
    const y = cs.reduce((s, c) => s + c[1], 0) / cs.length;
    const [a, b] = parties.map((p) => totals[d][p]);
    const leader = a === b ? null : a > b ? parties[0] : parties[1];
    return { d, x, y, a, b, leader };
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
          <line x1="0" y1="0" x2="0" y2="0.3" stroke="var(--invalid)" strokeWidth="0.08" />
        </pattern>
      </defs>
      {board.tiles.map((t, i) => {
        const party = parties.find((p) => t.votes[p] > 0) ?? parties[0];
        const pi = parties.indexOf(party);
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
            <polygon points={hexPoints(t, 0.96)} className={`fill-${party}`} />
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
      {badges.map(
        (b) =>
          b && (
            // Keyed on leader so a flip remounts the badge and replays the pop animation.
            <g key={`${b.d}-${b.leader}`} className="badge" pointerEvents="none" style={{ transformOrigin: `${b.x}px ${b.y}px` }}>
              <circle cx={b.x} cy={b.y} r={mini ? 0.7 : 0.42} className={b.leader ? `fill-${b.leader} strong` : "fill-tie"} />
              {!mini && (
                <text x={b.x} y={b.y + 0.13}>
                  {b.a}–{b.b}
                </text>
              )}
            </g>
          ),
      )}
    </svg>
  );
}

function lineProps(e: { x1: number; y1: number; x2: number; y2: number }) {
  return { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, strokeLinecap: "round" as const };
}
