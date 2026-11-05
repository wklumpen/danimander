import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { quips } from "../content/quips";
import { w1 as copy } from "../content/w1";
import { tilesChanged } from "../game/drift";
import { initPlay, playReducer, runElection } from "../game/play";
import { seatTally, voteShare, winners } from "../game/score";
import { hint } from "../game/solver";
import type { Board as BoardT, Task } from "../game/types";
import { isLastTile, moveTargets, validatePlan } from "../game/validate";
import { Board } from "./Board";
import { Confetti } from "./Confetti";
import { Hud } from "./Hud";
import { PartyText } from "./PartyText";

export type WinResult = ReturnType<typeof runElection> & { assignment: number[]; hintsUsed: number };

type Props = {
  board: BoardT;
  task: Task;
  onWin: (r: WinResult) => void;
  /** Rendered inside the win panel (Next button, share, …). */
  winActions: (r: WinResult) => React.ReactNode;
};

function saveStars(boardId: string, taskId: string, n: number) {
  try {
    const key = `dm:stars:${boardId}:${taskId}`;
    if (n > Number(localStorage.getItem(key) ?? 0)) localStorage.setItem(key, String(n));
  } catch {
    // private mode / storage disabled
  }
}

/** One playable task: board + HUD + election + hints. Remount (key) to start fresh. */
export function Session({ board, task, onWin, winActions }: Props) {
  const k = board.rules.nDistricts;
  const reducer = useMemo(() => playReducer(board), [board]);
  const [play, dispatch] = useReducer(reducer, board, initPlay);
  const [ghost, setGhost] = useState(false);
  const [result, setResult] = useState<WinResult | null>(null);
  const [missed, setMissed] = useState<number | null>(null);
  const [hintDistrict, setHintDistrict] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const problems = useMemo(() => validatePlan(board, play.assignment), [board, play.assignment]);
  const invalid = new Set(problems.map((p) => p.district));
  const seats = seatTally(board, winners(board, play.assignment, k));
  const startSeats = useMemo(() => seatTally(board, winners(board, board.start, k)), [board]);
  const share = useMemo(() => voteShare(board), [board]);
  const targets = play.selected === null ? undefined : moveTargets(board, play.assignment, play.selected);
  const lastHex = play.selected !== null && isLastTile(play.assignment, play.selected);
  const goalParty = board.parties.find((p) => p.id === task.goal!.party)!;

  // The Dani-Mander's commentary: react to flips, broken districts, and every few moves.
  const [quip, setQuip] = useState<{ text: string; n: number } | null>(null);
  const prev = useRef({ assignment: board.start, moves: 0, invalid: 0 });
  const decks = useRef<Record<string, string[]>>({});
  const draw = (pool: keyof typeof quips & ("flip" | "invalid" | "move")) => {
    if (!decks.current[pool]?.length) decks.current[pool] = [...quips[pool]].sort(() => Math.random() - 0.5);
    return decks.current[pool].pop()!;
  };
  useEffect(() => {
    const p = prev.current;
    const moved = play.history.length > p.moves; // ignore undo/reset
    const before = seatTally(board, winners(board, p.assignment, k));
    prev.current = { assignment: play.assignment, moves: play.history.length, invalid: invalid.size };
    if (!moved) return;
    const flipped = board.parties.some((party) => before[party.id] !== seats[party.id]);
    let text: string | null = null;
    if (flipped) text = draw("flip");
    else if (invalid.size > p.invalid && Math.random() < 0.5) text = draw("invalid");
    else if (play.history.length % quips.everyNMoves === 0) text = draw("move");
    if (text) setQuip((q) => ({ text: text!, n: (q?.n ?? 0) + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play.assignment]);

  const clearTransient = () => {
    setMissed(null);
    setNote(null);
    setHintDistrict(null);
  };

  const run = () => {
    const r = runElection(board, task, play.assignment, hintsUsed);
    if (!r.met) {
      setMissed(r.seats[goalParty.id]);
      return;
    }
    const win = { ...r, assignment: play.assignment, hintsUsed };
    saveStars(board.id, task.id, r.stars);
    setResult(win);
    onWin(win);
  };

  const onHint = () => {
    clearTransient();
    const h = hint(board, task.goal!, play.assignment);
    if (!h) {
      setNote(copy.hud.noHint);
      return;
    }
    dispatch({ type: "select", tile: h.tile });
    setHintDistrict(h.district);
    setHintsUsed((n) => n + 1);
  };

  return (
    <>
      <header>
        <h1 className="prompt"><PartyText text={task.prompt} board={board} /></h1>
        {quip && !result && play.selected === null ? (
          <p key={quip.n} className="hint quip-line" aria-hidden onAnimationEnd={() => setQuip(null)}>
            <svg viewBox="0 0 24 24" aria-hidden><use href="#ic-salamander" /></svg> {quip.text}
          </p>
        ) : (
          <p className={lastHex ? "hint warn-soft" : "hint"}>
            {play.selected === null ? copy.hud.pickTile : lastHex ? copy.hud.lastHex : copy.hud.pickTarget}
          </p>
        )}
      </header>
      <div className="board-wrap">
        <Board
        board={board}
        assignment={play.assignment}
        nDistricts={k}
        selected={play.selected}
        targets={targets}
        invalid={invalid}
        ghost={ghost}
        hintDistrict={hintDistrict}
        label={task.prompt}
        onTap={(tile) => {
          if (result) return;
          clearTransient();
          dispatch({ type: "tap", tile });
        }}
        onAssign={(tile, district) => {
          if (result) return;
          clearTransient();
          dispatch({ type: "move", tile, district });
        }}
      />
      </div>
      <Hud
        board={board}
        seats={seats}
        startSeats={startSeats}
        share={share}
        changed={tilesChanged(board.start, play.assignment)}
        nInvalid={invalid.size}
        ghost={ghost}
        canUndo={play.history.length > 0}
        onUndo={() => (clearTransient(), dispatch({ type: "undo" }))}
        onReset={() => (clearTransient(), dispatch({ type: "reset" }))}
        onGhost={() => setGhost((g) => !g)}
        onRun={run}
        onHint={onHint}
        hintsUsed={hintsUsed}
        note={note}
      />
      {missed !== null && (
        <div className="result" role="status">
          <p>{copy.result.missed(goalParty.label, missed)}</p>
          <button onClick={() => setMissed(null)}>{copy.result.retry}</button>
        </div>
      )}
      {result && (
        <div className="result win" role="status">
          <Confetti />
          <div className="stars" aria-label={`${result.stars} of 3 stars`}>
            {"★".repeat(result.stars)}
            {"☆".repeat(3 - result.stars)}
          </div>
          <p>{task.success}</p>
          {winActions(result)}
        </div>
      )}
    </>
  );
}
