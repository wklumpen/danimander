import { useEffect, useState } from "react";
import boardJson from "../../../boards/w2.json";
import { track } from "../analytics";
import { w1 as copy } from "../content/w1";
import { w2 } from "../content/w2";
import { tilesChanged } from "../game/drift";
import { shareText } from "../game/shareText";
import type { Board as BoardT } from "../game/types";
import { MapPanels } from "./Reveal";
import { Session, type WinResult } from "./Session";
import { ShareText } from "./ShareText";

export const board2 = boardJson as unknown as BoardT;

type Stage = "introA" | "a" | "introB" | "b" | "reveal";

function Intro({ lines, onGo }: { lines: string[]; onGo: () => void }) {
  return (
    <div className="overlay center" role="dialog">
      <div className="splash">
        <p className="daily-tag">{board2.title}</p>
        {lines.map((l, i) => (
          <p key={l} className={i === lines.length - 1 ? "intro-punch" : "intro-line"}>{l}</p>
        ))}
        <button className="primary" onClick={onGo} autoFocus>{w2.start}</button>
      </div>
    </div>
  );
}

/** World 2: the Government rigs the map, then the Opposition gets the pen. */
export function World2({ onInfo, onStage }: { onInfo: () => void; onStage?: (playing: boolean) => void }) {
  const [stage, setStage] = useState<Stage>("introA");
  const [a, setA] = useState<WinResult | null>(null);
  const [b, setB] = useState<WinResult | null>(null);
  const [run, setRun] = useState(0);
  const [taskA, taskB] = board2.tasks;
  useEffect(() => onStage?.(stage !== "reveal"), [stage, onStage]);
  useEffect(() => track("w2-start"), []);

  if (stage === "reveal" && a && b) {
    const movedB = tilesChanged(a.assignment, b.assignment);
    const url = `${location.origin}${location.pathname}#w2`;
    return (
      <div className="reveal">
        <p className="daily-tag">{board2.title}</p>
        <h2>{w2.reveal.headline}</h2>
        <MapPanels
          board={board2}
          panels={[
            [w2.reveal.original, board2.start, board2.rules.nDistricts],
            [taskA.caption ?? "A", a.assignment, a.nDistricts],
            [taskB.caption ?? "B", b.assignment, b.nDistricts],
          ]}
        />
        <p>{w2.reveal.redrawn(a.changed + movedB)}</p>
        <p className="core">{w2.reveal.sub}</p>
        <button className="primary" onClick={onInfo}>{w2.reveal.cta}</button>
        <ShareText
          event="w2"
          text={shareText(
            board2,
            board2.title,
            [
              { assignment: a.assignment, moves: a.changed, nDistricts: a.nDistricts, hints: a.hintsUsed },
              { assignment: b.assignment, moves: movedB, nDistricts: b.nDistricts, hints: b.hintsUsed },
            ],
            url,
          )}
        />
        <button onClick={() => (setA(null), setB(null), setRun((r) => r + 1), setStage("introA"))}>{w2.reveal.again}</button>
      </div>
    );
  }

  const inB = stage === "introB" || stage === "b";
  const task = inB ? taskB : taskA;
  return (
    <>
      <Session
        key={`${inB ? "b" : "a"}-${run}`}
        board={board2}
        task={task}
        init={inB && a ? { assignment: a.assignment, nDistricts: a.nDistricts } : undefined}
        onWin={(r) => {
          if (inB) setB(r);
          else setA(r);
          track(inB ? "w2-tb" : "w2-ta");
        }}
        winActions={() => (
          <button
            className="primary"
            onClick={() => {
              if (inB) {
                track("w2-done");
                setStage("reveal");
              } else setStage("introB");
            }}
          >
            {copy.result.next} →
          </button>
        )}
      />
      {(stage === "introA" || stage === "introB") && (
        <Intro lines={task.intro ?? []} onGo={() => setStage(inB ? "b" : "a")} />
      )}
    </>
  );
}
