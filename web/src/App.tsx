import { useEffect, useMemo, useReducer, useState } from "react";
import boardJson from "../../boards/w1.json";
import { track } from "./analytics";
import { w1 as copy } from "./content/w1";
import { tilesChanged } from "./game/drift";
import { initPlay, playReducer, runElection } from "./game/play";
import { seatTally, voteShare, winners } from "./game/score";
import type { Board as BoardT } from "./game/types";
import { moveTargets, validatePlan } from "./game/validate";
import { Board } from "./ui/Board";
import { Hud } from "./ui/Hud";
import { Reveal } from "./ui/Reveal";

const board = boardJson as unknown as BoardT;
const k = board.rules.nDistricts;
const playable = board.tasks.filter((t) => t.goal);

function saveStars(taskId: string, n: number) {
  try {
    const key = `dm:stars:${board.id}:${taskId}`;
    if (n > Number(localStorage.getItem(key) ?? 0)) localStorage.setItem(key, String(n));
  } catch {
    // private mode / storage disabled
  }
}

type Result = ReturnType<typeof runElection>;

export default function App() {
  const [taskIdx, setTaskIdx] = useState(0);
  const [maps, setMaps] = useState<Record<string, number[]>>({});
  const [play, dispatch] = useReducer(playReducer(board), board, initPlay);
  const [ghost, setGhost] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => track("w1-start"), []);

  const task = playable[taskIdx];
  const problems = useMemo(() => validatePlan(board, play.assignment), [play.assignment]);
  const invalid = new Set(problems.map((p) => p.district));
  const seats = seatTally(board, winners(board, play.assignment, k));
  const startSeats = useMemo(() => seatTally(board, winners(board, board.start, k)), []);
  const share = useMemo(() => voteShare(board), []);
  const targets = play.selected === null ? undefined : moveTargets(board, play.assignment, play.selected);

  if (!task) {
    return (
      <main>
        <Reveal
          board={board}
          maps={maps}
          onAgain={() => {
            setMaps({});
            setTaskIdx(0);
            dispatch({ type: "reset" });
          }}
        />
      </main>
    );
  }

  const run = () => {
    const r = runElection(board, task, play.assignment);
    setResult(r);
    if (r.met) {
      saveStars(task.id, r.stars);
      track(`w1-${task.id}`);
    }
  };

  const next = () => {
    setMaps((m) => ({ ...m, [task.id]: play.assignment }));
    setResult(null);
    dispatch({ type: "reset" });
    if (taskIdx + 1 >= playable.length) track("w1-done");
    setTaskIdx(taskIdx + 1);
  };

  const goalParty = board.parties.find((p) => p.id === task.goal!.party)!;

  return (
    <main>
      <header>
        <h1 className="prompt">{task.prompt}</h1>
        <p className="hint">{play.selected === null ? copy.hud.pickTile : copy.hud.pickTarget}</p>
      </header>
      <Board
        board={board}
        assignment={play.assignment}
        nDistricts={k}
        selected={play.selected}
        targets={targets}
        invalid={invalid}
        ghost={ghost}
        onTap={(tile) => {
          setResult(null);
          dispatch({ type: "tap", tile });
        }}
      />
      <Hud
        board={board}
        seats={seats}
        startSeats={startSeats}
        share={share}
        changed={tilesChanged(board.start, play.assignment)}
        nInvalid={invalid.size}
        ghost={ghost}
        canUndo={play.history.length > 0}
        onUndo={() => dispatch({ type: "undo" })}
        onReset={() => dispatch({ type: "reset" })}
        onGhost={() => setGhost((g) => !g)}
        onRun={run}
      />
      {result && (
        <div className={`result ${result.met ? "win" : ""}`} role="status">
          {result.met ? (
            <>
              <div className="stars" aria-label={`${result.stars} of 3 stars`}>
                {"★".repeat(result.stars)}
                {"☆".repeat(3 - result.stars)}
              </div>
              <p>{task.success}</p>
              <button className="primary" onClick={next}>{copy.result.next} →</button>
            </>
          ) : (
            <>
              <p>{copy.result.missed(goalParty.label, result.seats[goalParty.id])}</p>
              <button onClick={() => setResult(null)}>{copy.result.retry}</button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
