import { w1 as copy } from "../content/w1";
import { w2 } from "../content/w2";
import type { Board } from "../game/types";

const col = (p: { id: string; color?: string }) => p.color ?? p.id;

type Props = {
  board: Board;
  nDistricts: number;
  /** World 2+: public scrutiny vs the cap (replaces "hexes moved"). */
  scrutiny?: { value: number; cap: number; frozen: boolean };
  /** Election blocked for a reason other than invalid districts (e.g. scrutiny over the cap). */
  blocked?: boolean;
  seats: Record<string, number>;
  startSeats: Record<string, number>;
  share: Record<string, number>;
  changed: number;
  nInvalid: number;
  ghost: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  onGhost: () => void;
  onRun: () => void;
  onHint: () => void;
  hintsUsed: number;
  note?: string | null;
};

/**
 * Election-night seat bar: one box per seat, first party filling from the left, second from
 * the right. Outlined brackets mark the original map's split, so a flipped seat visibly
 * crosses its bracket.
 */
function SeatBar({ board, seats, startSeats, nDistricts: k }: Pick<Props, "board" | "seats" | "startSeats" | "nDistricts">) {
  const [a, b] = board.parties;
  // Bracket width for n square boxes, in terms of the CSS box/gap variables.
  const span = (n: number) => `calc(${n} * var(--seat) + ${Math.max(n - 1, 0)} * var(--seat-gap) + 2 * var(--seat-pad))`;
  return (
    <div className={k > 5 || a.label.length + b.label.length > 12 ? "seatbar stacked" : "seatbar"} role="img" aria-label={`${a.label} ${seats[a.id]} seats, ${b.label} ${seats[b.id]} seats`}>
      <span className={`seat-label text-${col(a)}`}>{a.label} <b>{seats[a.id]}</b></span>
      <div className="seat-row">
        {Array.from({ length: k }, (_, i) => {
          const party = i < seats[a.id] ? col(a) : i >= k - seats[b.id] ? col(b) : null;
          return <div key={i} className={`seat ${party ? `bg-${party}` : "bg-tie"}`} />;
        })}
        {startSeats[a.id] > 0 && <div className={`bracket border-${col(a)}`} style={{ left: "calc(-1 * var(--seat-pad))", width: span(startSeats[a.id]) }} />}
        {startSeats[b.id] > 0 && <div className={`bracket border-${col(b)}`} style={{ right: "calc(-1 * var(--seat-pad))", width: span(startSeats[b.id]) }} />}
      </div>
      <span className={`seat-label right text-${col(b)}`}><b>{seats[b.id]}</b> {b.label}</span>
    </div>
  );
}

function VoteBar({ board, share }: Pick<Props, "board" | "share">) {
  const [a, b] = board.parties;
  return (
    <div className="votebar">
      <span className="muted">{copy.hud.votes}</span>
      <div className="vote-row" aria-label={`Votes: ${a.label} ${Math.round(share[a.id] * 100)}%, ${b.label} ${Math.round(share[b.id] * 100)}%`}>
        <div className={`bg-${col(a)}`} style={{ width: `${share[a.id] * 100}%` }}>{Math.round(share[a.id] * 100)}%</div>
        <div className={`bg-${col(b)}`} style={{ width: `${share[b.id] * 100}%` }}>{Math.round(share[b.id] * 100)}%</div>
      </div>
      <span className="muted">{copy.hud.votesNote}</span>
    </div>
  );
}

export function Hud(p: Props) {
  const status = [
    p.scrutiny ? null : `${copy.hud.changed} ${p.changed}`,
    p.hintsUsed > 0 ? copy.hud.hintsUsed(p.hintsUsed) : null,
  ].filter(Boolean);
  const sc = p.scrutiny;
  const meter = sc && (
    <span className={`meter${sc.value > sc.cap ? " over" : ""}`} title={sc.frozen ? w2.frozen : undefined}>
      {w2.scrutiny}
      <span className="meter-bar" aria-hidden><i style={{ width: `${Math.min(100, (sc.value / sc.cap) * 100)}%` }} /></span>
      {sc.value}/{sc.cap}
      {sc.frozen && " 🔇"}
    </span>
  );
  return (
    <div className="hud">
      <div aria-live="polite">
        <SeatBar board={p.board} seats={p.seats} startSeats={p.startSeats} nDistricts={p.nDistricts} />
      </div>
      <VoteBar board={p.board} share={p.share} />
      <div className="status" aria-live="polite">
        {meter}
        {p.note ? (
          <span className={p.blocked ? "warn" : undefined}>{meter && " · "}{p.note}</span>
        ) : (
          <>
            {meter && status.length > 0 && " · "}
            <span>{status.join(" · ")}</span>
            {p.nInvalid > 0 && <span className="warn"> · {copy.hud.invalid(p.nInvalid)}</span>}
            {p.ghost && <span className="muted"> · {copy.hud.ghostCaption}</span>}
          </>
        )}
      </div>
      <div className="controls">
        <button onClick={p.onUndo} disabled={!p.canUndo}>↶ {copy.hud.undo}</button>
        <button onClick={p.onReset}>⟲ {copy.hud.reset}</button>
        <button onClick={p.onGhost} aria-pressed={p.ghost}>👁 {copy.hud.ghost}</button>
        <button onClick={p.onHint}>💡 {copy.hud.hint}</button>
        <button className="primary" onClick={p.onRun} disabled={p.nInvalid > 0 || p.blocked}>
          🗳️ {copy.hud.run}
        </button>
      </div>
    </div>
  );
}
