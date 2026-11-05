import { useMemo } from "react";
import { share } from "../content/share";
import { w1 as copy } from "../content/w1";
import { encodePlan } from "../game/encode";
import { seatTally, winners } from "../game/score";
import type { Board as BoardT } from "../game/types";
import { Board } from "./Board";
import { ShareButtons } from "./ShareButtons";
import { ShareText } from "./ShareText";
import { shareText } from "../game/shareText";
import { tilesChanged } from "../game/drift";
import { cardSvg } from "./shareCard";

export function MapPanels({ board, panels }: { board: BoardT; panels: [string, number[], number?][] }) {
  return (
    <div className="panels" style={{ gridTemplateColumns: `repeat(${panels.length}, 1fr)` }}>
      {panels.map(([title, a, kk]) => {
        const k = kk ?? board.rules.nDistricts;
        const s = seatTally(board, winners(board, a, k));
        return (
          <figure key={title}>
            <Board board={board} assignment={a} nDistricts={k} mini label={title} />
            <figcaption>
              {title}
              <br />
              {board.parties.map((p) => (
                <b key={p.id} className={`text-${p.color ?? p.id}`}> {s[p.id]} </b>
              ))}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

export function Reveal({ board, maps, onAgain, onNext }: { board: BoardT; maps: Record<string, number[]>; onAgain: () => void; onNext?: () => void }) {
  const t1 = maps.t1 ?? board.examples?.t1 ?? board.start;
  const t2 = maps.t2 ?? board.examples?.t2 ?? board.start;
  const pct = `${((board.stats.goalShare?.t1 ?? 0) * 100).toFixed(1)}%`;
  const svg = useMemo(
    () =>
      cardSvg(board, board.start, t1, {
        headline: share.cardHeadline,
        core: share.cardCore,
        url: share.cardUrl,
        left: share.original,
        right: share.mine,
      }),
    [board, t1],
  );
  const link = `${location.origin}${location.pathname}${encodePlan(
    { boardId: board.id, taskId: "t1", role: "orange", assignment: t1, powersUsed: [], nDistricts: board.rules.nDistricts },
    board.start,
  )}`;
  return (
    <div className="reveal">
      <h2>{copy.reveal.headline}</h2>
      <MapPanels
        board={board}
        panels={[
          [copy.reveal.original, board.start],
          [copy.reveal.orangeMap, t1],
          [copy.reveal.blueMap, t2],
        ]}
      />
      <p>{copy.reveal.stat(board.stats.nPlans, pct)}</p>
      <p className="core">{copy.reveal.core}</p>
      <h3>{copy.reveal.shareTitle}</h3>
      <ShareText
        event="w1"
        text={shareText(
          board,
          board.title,
          [t1, t2].map((a) => ({ assignment: a, moves: tilesChanged(board.start, a) })),
          `${location.origin}${location.pathname}`,
        )}
      />
      <ShareButtons svg={svg} link={link} />
      {onNext && <button className="primary" onClick={onNext}>{copy.reveal.next}</button>}
      <button onClick={onAgain}>{copy.reveal.again}</button>
    </div>
  );
}
