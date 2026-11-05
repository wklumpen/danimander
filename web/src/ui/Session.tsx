import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { powers, powerUi } from "../content/powers";
import { quips } from "../content/quips";
import { w1 as copy } from "../content/w1";
import { w2 } from "../content/w2";
import { tilesChanged } from "../game/drift";
import { allowedTargets, canPlay, drift, initPlay, overCap, playReducer, runElection, type PlayInit } from "../game/play";
import { seatTally, voteShare, winners } from "../game/score";
import { hint } from "../game/solver";
import type { Board as BoardT, PowerId, Task } from "../game/types";
import { isLastTile, moveTargets, validatePlan } from "../game/validate";
import { Board } from "./Board";
import { Confetti } from "./Confetti";
import { Hud } from "./Hud";
import { PartyText } from "./PartyText";
import { PowerCards } from "./PowerCards";

export type WinResult = ReturnType<typeof runElection> & { assignment: number[]; hintsUsed: number; nDistricts: number };

type Props = {
  board: BoardT;
  task: Task;
  /** Start from a map other than the board's (World 2 Task B starts from the Task A map). */
  init?: PlayInit;
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

/** One playable task: board + HUD + election + hints (+ power cards). Remount (key) to start fresh. */
export function Session({ board, task, init, onWin, winActions }: Props) {
  const reducer = useMemo(() => playReducer(board, init), [board, init]);
  const [play, dispatch] = useReducer(reducer, undefined, () => initPlay(board, init));
  const k = play.nDistricts;
  const [ghost, setGhost] = useState(false);
  const [result, setResult] = useState<WinResult | null>(null);
  const [missed, setMissed] = useState<ReturnType<typeof runElection> | null>(null);
  const [hintDistrict, setHintDistrict] = useState<number | null>(null);
  const [hintCard, setHintCard] = useState<PowerId | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const problems = useMemo(
    () => validatePlan(board, play.assignment, k, play.muniLock),
    [board, play.assignment, k, play.muniLock],
  );
  const invalid = new Set(problems.map((p) => p.district));
  const mixed = problems.some((p) => p.kind === "mixed");
  const seats = seatTally(board, winners(board, play.assignment, k));
  const startSeats = useMemo(() => seatTally(board, winners(board, board.start, board.rules.nDistricts)), [board]);
  const share = useMemo(() => voteShare(board), [board]);
  const targets = play.selected === null ? undefined : allowedTargets(board, play, play.selected);
  const capBlocked =
    play.selected !== null && targets!.size === 0 && moveTargets(board, play.assignment, play.selected).size > 0;
  const lastHex = play.selected !== null && isLastTile(play.assignment, play.selected);
  const goalParty = board.parties.find((p) => p.id === task.goal!.party)!;
  const cap = play.cap;
  const scrutiny = drift(play);
  const tooObvious = cap !== undefined && scrutiny > cap;

  // The Dani-Mander's commentary: react to flips, broken districts, and every few moves.
  const [quip, setQuip] = useState<{ text: string; n: number } | null>(null);
  const say = (text: string) => setQuip((q) => ({ text, n: (q?.n ?? 0) + 1 }));
  const prev = useRef({ assignment: play.assignment, moves: 0, invalid: 0, k });
  const decks = useRef<Record<string, string[]>>({});
  const draw = (pool: "flip" | "invalid" | "move") => {
    if (!decks.current[pool]?.length) decks.current[pool] = [...quips[pool]].sort(() => Math.random() - 0.5);
    return decks.current[pool].pop()!;
  };
  useEffect(() => {
    const p = prev.current;
    const moved = play.history.length > p.moves && p.assignment !== play.assignment; // ignore undo/reset/cards
    const before = seatTally(board, winners(board, p.assignment, p.k));
    prev.current = { assignment: play.assignment, moves: play.history.length, invalid: invalid.size, k };
    if (!moved) return;
    const flipped = board.parties.some((party) => before[party.id] !== seats[party.id]);
    if (flipped) say(draw("flip"));
    else if (invalid.size > p.invalid && Math.random() < 0.5) say(draw("invalid"));
    else if (play.history.length % quips.everyNMoves === 0) say(draw("move"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play.assignment]);

  const clearTransient = () => {
    setMissed(null);
    setNote(null);
    setHintDistrict(null);
    setHintCard(null);
  };

  const run = () => {
    const r = runElection(board, task, play.assignment, hintsUsed, k);
    if (!r.met) {
      setMissed(r);
      return;
    }
    const win = { ...r, assignment: play.assignment, hintsUsed, nDistricts: k };
    if (task.par !== null) saveStars(board.id, task.id, r.stars);
    setResult(win);
    onWin(win);
  };

  const onHint = () => {
    clearTransient();
    const h = hint(board, task.goal!, play.assignment, {
      taskId: task.id,
      nDistricts: k,
      muniLock: play.muniLock,
      canPlay: (id) => canPlay(board, play, id),
    });
    if (!h) {
      setNote(copy.hud.noHint);
      return;
    }
    setHintsUsed((n) => n + 1);
    // The next move would be too obvious? Point at the card that resets scrutiny.
    if (!("card" in h) && overCap(play, h.tile, h.district)) {
      if (canPlay(board, play, "toss")) {
        setHintCard("toss");
        setNote(powerUi.tryCard(`${powers.toss.icon} ${powers.toss.name}`));
      } else setNote(w2.noRoom);
      return;
    }
    if ("card" in h) {
      setHintCard(h.card);
      setNote(powerUi.tryCard(`${powers[h.card].icon} ${powers[h.card].name}`));
      return;
    }
    dispatch({ type: "select", tile: h.tile });
    setHintDistrict(h.district);
  };

  const instruction = play.seeding
    ? w2.seeding
    : play.selected === null
      ? copy.hud.pickTile
      : lastHex
        ? copy.hud.lastHex
        : capBlocked
          ? w2.capBlocked
          : copy.hud.pickTarget;

  const status = note ?? (tooObvious ? w2.tooObvious(cap!) : mixed ? w2.mixed : null);

  return (
    <>
      <header>
        <h1 className="prompt"><PartyText text={task.prompt} board={board} /></h1>
        {quip && !result && play.selected === null && !play.seeding ? (
          <p key={quip.n} className="hint quip-line" aria-hidden onAnimationEnd={() => setQuip(null)}>
            <svg viewBox="0 0 24 24" aria-hidden><use href="#ic-salamander" /></svg> {quip.text}
          </p>
        ) : (
          <p className={lastHex || play.seeding || capBlocked ? "hint warn-soft" : "hint"}>
            {instruction}
            {play.seeding && (
              <button className="link inline" onClick={() => dispatch({ type: "cancelSeed" })}> {w2.cancel}</button>
            )}
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
          cityLimits={play.muniLock}
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
      {board.rules.powers.length > 0 && (
        <PowerCards
          available={board.rules.powers}
          used={play.powersUsed}
          canPlay={(id) => canPlay(board, play, id)}
          highlight={hintCard}
          onPlay={(id) => {
            clearTransient();
            dispatch({ type: "power", id });
            if (id !== "seat") say(powers[id].quip);
          }}
        />
      )}
      <Hud
        board={board}
        nDistricts={k}
        seats={seats}
        startSeats={startSeats}
        share={share}
        changed={tilesChanged(board.start, play.assignment)}
        scrutiny={cap !== undefined ? { value: scrutiny, cap, frozen: play.frozenDrift !== null } : undefined}
        nInvalid={invalid.size}
        blocked={tooObvious}
        ghost={ghost}
        canUndo={play.history.length > 0}
        onUndo={() => (clearTransient(), dispatch({ type: "undo" }))}
        onReset={() => (clearTransient(), dispatch({ type: "reset" }))}
        onGhost={() => setGhost((g) => !g)}
        onRun={run}
        onHint={onHint}
        hintsUsed={hintsUsed}
        note={status}
      />
      {missed && (
        <div className="result" role="status">
          <p>
            {copy.result.missed(goalParty.label, missed.seats[goalParty.id])}
          </p>
          <button onClick={() => setMissed(null)}>{copy.result.retry}</button>
        </div>
      )}
      {result && (
        <div className="result win" role="status">
          <Confetti />
          {task.par !== null && (
            <div className="stars" aria-label={`${result.stars} of 3 stars`}>
              {"★".repeat(result.stars)}
              {"☆".repeat(3 - result.stars)}
            </div>
          )}
          <p>{task.success}</p>
          {winActions(result)}
        </div>
      )}
    </>
  );
}
