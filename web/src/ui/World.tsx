import { useEffect, useMemo, useState } from "react";
import { track } from "../analytics";
import { w1 as copy } from "../content/w1";
import { w2 } from "../content/w2";
import { tilesChanged } from "../game/drift";
import { continueInit, taskBoard } from "../game/play";
import { shareText } from "../game/shareText";
import type { Board as BoardT } from "../game/types";
import { MapPanels } from "./Reveal";
import { Session, type WinResult } from "./Session";
import { ShareText } from "./ShareText";

function Intro({ title, lines, onGo }: { title: string; lines: string[]; onGo: () => void }) {
  return (
    <div className="overlay center" role="dialog">
      <div className="splash">
        <p className="daily-tag">{title}</p>
        {lines.map((l, i) => (
          <p key={l} className={i === lines.length - 1 ? "intro-punch" : "intro-line"}>{l}</p>
        ))}
        <button className="primary" onClick={onGo} autoFocus>{w2.start}</button>
      </div>
    </div>
  );
}

type Props = {
  board: BoardT;
  onInfo: () => void;
  /** Reveal button to the next world, if any. */
  next?: { label: string; go: () => void };
  onStage?: (playing: boolean) => void;
};

/**
 * Government vs Opposition worlds: the tasks in order (each with its own cards and scrutiny cap,
 * a "continues" task picking up the player's previous map), then the reveal.
 */
export function World({ board, onInfo, next, onStage }: Props) {
  const tasks = board.tasks;
  const [stage, setStage] = useState(0); // task index; tasks.length = reveal
  const [intro, setIntro] = useState(true);
  const [wins, setWins] = useState<WinResult[]>([]);
  const [run, setRun] = useState(0);
  const revealing = stage >= tasks.length;
  const boards = useMemo(() => tasks.map((t) => taskBoard(board, t)), [board, tasks]);
  useEffect(() => onStage?.(!revealing), [revealing, onStage]);
  useEffect(() => track(`${board.id}-start`), [board.id]);

  if (revealing) {
    // Moves per shown map: from the start, or from the previous map for a continuing task.
    const shown = tasks.flatMap((t, i) => (t.caption ? [{ t, w: wins[i], moves: t.continues ? tilesChanged(wins[i - 1].assignment, wins[i].assignment) : wins[i].changed }] : []));
    const url = `${location.origin}${location.pathname}#${board.id}`;
    return (
      <div className="reveal">
        <p className="daily-tag">{board.title}</p>
        <h2>{w2.reveal.headline}</h2>
        <MapPanels
          board={board}
          panels={[[w2.reveal.original, board.start, board.rules.nDistricts], ...shown.map(({ t, w }) => [t.caption!, w.assignment, w.nDistricts] as [string, number[], number])]}
        />
        <p>
          {w2.reveal.stat(board.stats.nPlans, `${Math.round((board.stats.goalShare?.[tasks[0].id] ?? 0) * 100)}%`)}{" "}
          {w2.reveal.redrawn(shown.reduce((s, x) => s + x.moves, 0))}.
        </p>
        <p className="core">{w2.reveal.sub}</p>
        <button className="primary" onClick={onInfo}>{w2.reveal.cta}</button>
        <ShareText
          event={board.id}
          text={shareText(board, board.title, shown.map(({ w, moves }) => ({ assignment: w.assignment, moves, nDistricts: w.nDistricts, hints: w.hintsUsed })), url)}
        />
        {next && <button onClick={next.go}>{next.label}</button>}
        <button className="link" onClick={() => (setWins([]), setRun((r) => r + 1), setStage(0), setIntro(true))}>{w2.reveal.again}</button>
      </div>
    );
  }

  const task = tasks[stage];
  const prev = wins[stage - 1];
  const init = task.continues && prev ? continueInit(board, task, prev.assignment, prev.nDistricts) : undefined;
  return (
    <>
      <Session
        key={`${task.id}-${run}`}
        board={boards[stage]}
        task={task}
        init={init}
        onWin={(r) => {
          setWins((w) => [...w.slice(0, stage), r]);
          track(`${board.id}-${task.id}`);
        }}
        winActions={() => (
          <button
            className="primary"
            onClick={() => {
              if (stage + 1 >= tasks.length) track(`${board.id}-done`);
              setStage(stage + 1);
              setIntro(true);
            }}
          >
            {copy.result.next} →
          </button>
        )}
      />
      {intro && task.intro && <Intro title={board.title} lines={task.intro} onGo={() => setIntro(false)} />}
    </>
  );
}
