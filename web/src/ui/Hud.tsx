import { w1 as copy } from "../content/w1";
import type { Board } from "../game/types";

type Props = {
  board: Board;
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
};

export function Hud(p: Props) {
  return (
    <div className="hud">
      <div className="stats" aria-live="polite">
        <div>
          <span className="k">{copy.hud.seats}</span>
          {p.board.parties.map((party) => (
            <span key={party.id} className={`chip text-${party.id}`}>
              {party.label} <b>{p.seats[party.id]}</b>
              <small> ({copy.hud.was} {p.startSeats[party.id]})</small>
            </span>
          ))}
        </div>
        <div>
          <span className="k">{copy.hud.votes}</span>
          {p.board.parties.map((party) => (
            <span key={party.id} className={`chip text-${party.id}`}>
              {Math.round(p.share[party.id] * 100)}%
            </span>
          ))}
          <small className="muted">{copy.hud.votesNote}</small>
        </div>
        <div>
          <span className="k">{copy.hud.changed}</span> <b>{p.changed}</b>
          {p.nInvalid > 0 && <span className="warn"> · {copy.hud.invalid(p.nInvalid)}</span>}
        </div>
      </div>
      <div className="controls">
        <button onClick={p.onUndo} disabled={!p.canUndo}>↶ {copy.hud.undo}</button>
        <button onClick={p.onReset}>⟲ {copy.hud.reset}</button>
        <button onClick={p.onGhost} aria-pressed={p.ghost}>┄ {copy.hud.ghost}</button>
        <button className="primary" onClick={p.onRun} disabled={p.nInvalid > 0}>
          🗳️ {copy.hud.run}
        </button>
      </div>
    </div>
  );
}
