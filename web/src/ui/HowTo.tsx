import { howto } from "../content/howto";
import { intBand } from "../game/solver";
import type { Board } from "../game/types";

export function HowTo({ board, onClose }: { board: Board; onClose: () => void }) {
  const n = board.rules.nDistricts;
  const [lo, hi] = intBand(board.tiles.length, n, board.rules.band);
  const size = lo === hi ? `exactly ${lo}` : `${lo} to ${hi}`;
  const rules = [...howto.rules(size, n), ...(board.rules.powers.length ? howto.extras : [])];
  return (
    <div className="overlay" role="dialog" aria-label={howto.title} onClick={onClose}>
      <div className="sheet howto" onClick={(e) => e.stopPropagation()}>
        <h2>{howto.title}</h2>
        <ul>
          {rules.map((r) => (
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
