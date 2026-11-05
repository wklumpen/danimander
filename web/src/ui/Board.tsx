import { useMemo } from "react";
import { districtVotes } from "../game/score";
import type { Board as BoardT } from "../game/types";
import { center, edges, hexPoints, viewBox } from "./hex";

const ICONS: Record<string, string> = { town: "🏘️", farm: "🌾", pumpjack: "🛢️", mountain: "🏔️" };
// Shape backup for colour (SPEC accessibility): ▲ first party, ● second.
const GLYPHS = ["▲", "●"];

type Props = {
  board: BoardT;
  assignment: number[];
  nDistricts: number;
  selected?: number | null;
  targets?: Set<number>;
  invalid?: Set<number>;
  ghost?: boolean;
  onTap?: (tile: number) => void;
  mini?: boolean;
  label?: string;
};

export function Board({ board, assignment, nDistricts, selected = null, targets, invalid, ghost, onTap, mini, label }: Props) {
  const allEdges = useMemo(() => edges(board.tiles), [board]);
  const vb = useMemo(() => viewBox(board.tiles), [board]);
  const parties = board.parties.map((p) => p.id);

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

  return (
    <svg className={mini ? "board mini" : "board"} viewBox={vb} role="img" aria-label={label ?? board.title}>
      <defs>
        <pattern id="hatch" width="0.3" height="0.3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="0.3" stroke="var(--invalid)" strokeWidth="0.08" />
        </pattern>
      </defs>
      {board.tiles.map((t, i) => {
        const party = parties.find((p) => t.votes[p] > 0) ?? parties[0];
        const pi = parties.indexOf(party);
        const d = assignment[i];
        const isTarget = selected !== null && targets?.has(d);
        const [cx, cy] = center(t);
        return (
          <g
            key={t.id}
            className={`tile ${isTarget ? "target" : ""} ${selected === i ? "selected" : ""}`}
            onClick={onTap ? () => onTap(i) : undefined}
            role={onTap ? "button" : undefined}
            aria-label={onTap ? `${board.parties[pi].label} ${t.icon}, district ${d + 1}` : undefined}
          >
            <polygon points={hexPoints(t, 0.96)} className={`fill-${party}`} />
            {invalid?.has(d) && <polygon points={hexPoints(t, 0.96)} fill="url(#hatch)" pointerEvents="none" />}
            {!mini && (
              <>
                <text x={cx} y={cy - 0.1} className="icon" pointerEvents="none">{ICONS[t.icon] ?? ""}</text>
                <text x={cx} y={cy + 0.55} className="glyph" pointerEvents="none">{GLYPHS[pi]}</text>
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
      {badges.map(
        (b) =>
          b && (
            <g key={b.d} className="badge" pointerEvents="none">
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
