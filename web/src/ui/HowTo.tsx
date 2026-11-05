import { howto } from "../content/howto";
import type { Board } from "../game/types";

export function HowTo({ board, onClose }: { board: Board; onClose: () => void }) {
  const n = board.rules.nDistricts;
  const size = Math.round(board.tiles.length / n);
  return (
    <div className="overlay" role="dialog" aria-label={howto.title} onClick={onClose}>
      <div className="sheet howto" onClick={(e) => e.stopPropagation()}>
        <h2>{howto.title}</h2>
        <ul>
          {howto.rules(size, n).map((r) => (
            <li key={r.text}>
              <span className="ic" aria-hidden>{r.icon}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
        <button className="primary" onClick={onClose}>{howto.close}</button>
      </div>
    </div>
  );
}
