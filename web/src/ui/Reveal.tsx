import { w1 as copy } from "../content/w1";
import { seatTally, winners } from "../game/score";
import type { Board as BoardT } from "../game/types";
import { Board } from "./Board";

export function Reveal({ board, maps, onAgain }: { board: BoardT; maps: Record<string, number[]>; onAgain: () => void }) {
  const k = board.rules.nDistricts;
  const panels: [string, number[]][] = [
    [copy.reveal.original, board.start],
    [copy.reveal.greenMap, maps.t1],
    [copy.reveal.purpleMap, maps.t2],
  ];
  const pct = `${((board.stats.goalShare?.t1 ?? 0) * 100).toFixed(1)}%`;
  return (
    <div className="reveal">
      <h2>{copy.reveal.headline}</h2>
      <div className="panels">
        {panels.map(([title, a]) => {
          const s = seatTally(board, winners(board, a, k));
          return (
            <figure key={title}>
              <Board board={board} assignment={a} nDistricts={k} mini label={title} />
              <figcaption>
                {title}
                <br />
                {board.parties.map((p) => (
                  <b key={p.id} className={`text-${p.id}`}> {s[p.id]} </b>
                ))}
              </figcaption>
            </figure>
          );
        })}
      </div>
      <p>{copy.reveal.stat(board.stats.nPlans, pct)}</p>
      <p className="core">{copy.reveal.core}</p>
      <button className="primary" onClick={onAgain}>{copy.reveal.again}</button>
    </div>
  );
}
