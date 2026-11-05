import { useEffect, useMemo, useReducer, useState } from "react";
import boardJson from "../../boards/w1.json";
import { track } from "./analytics";
import { info } from "./content/info";
import { share } from "./content/share";
import { w1 as copy } from "./content/w1";
import { tilesChanged } from "./game/drift";
import { decodePlan } from "./game/encode";
import { initPlay, playReducer, runElection } from "./game/play";
import { seatTally, voteShare, winners } from "./game/score";
import type { Board as BoardT } from "./game/types";
import { moveTargets, validatePlan } from "./game/validate";
import { Board } from "./ui/Board";
import { Confetti } from "./ui/Confetti";
import { Hud } from "./ui/Hud";
import { iconSymbols } from "./ui/icons";
import { Info } from "./ui/Info";
import { Menu } from "./ui/Menu";
import { MapPanels, Reveal } from "./ui/Reveal";
import { cardSvg } from "./ui/shareCard";

const board = boardJson as unknown as BoardT;
const k = board.rules.nDistricts;
const playable = board.tasks.filter((t) => t.goal);
const boards: Record<string, BoardT> = { [board.id]: board };

function saveStars(taskId: string, n: number) {
  try {
    const key = `dm:stars:${board.id}:${taskId}`;
    if (n > Number(localStorage.getItem(key) ?? 0)) localStorage.setItem(key, String(n));
  } catch {
    // private mode / storage disabled
  }
}

type Route = { view: "play" } | { view: "info" } | { view: "shared"; assignment: number[] };

function routeFromHash(): Route {
  const h = location.hash.slice(1);
  if (h === "info" || h === "timeline" || h.startsWith("card-")) return { view: "info" };
  if (h.startsWith("b=")) {
    const plan = decodePlan(location.hash, (id) => boards[id]?.start);
    if (plan && boards[plan.boardId] && validatePlan(boards[plan.boardId], plan.assignment).length === 0)
      return { view: "shared", assignment: plan.assignment };
  }
  return { view: "play" };
}

const Sprite = () => <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden dangerouslySetInnerHTML={{ __html: iconSymbols() }} />;

export default function App() {
  if (new URLSearchParams(location.search).has("og")) return <OgCard />;
  return <Game />;
}

/** Static link-preview image, rendered at 1200×630 for `npm run og` to screenshot. */
function OgCard() {
  const svg = cardSvg(board, board.start, board.examples?.t1 ?? board.start, {
    headline: share.cardHeadline,
    core: share.cardCore,
    url: share.cardUrl,
    left: share.original,
    right: share.example,
  });
  return <div className="og" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Game() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [taskIdx, setTaskIdx] = useState(0);
  const [maps, setMaps] = useState<Record<string, number[]>>({});
  const [play, dispatch] = useReducer(playReducer(board), board, initPlay);
  const [ghost, setGhost] = useState(false);
  const [menu, setMenu] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof runElection> | null>(null);

  useEffect(() => {
    const on = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useEffect(() => track("w1-start"), []);

  const task = playable[taskIdx];
  const problems = useMemo(() => validatePlan(board, play.assignment), [play.assignment]);
  const invalid = new Set(problems.map((p) => p.district));
  const seats = seatTally(board, winners(board, play.assignment, k));
  const startSeats = useMemo(() => seatTally(board, winners(board, board.start, k)), []);
  const share_ = useMemo(() => voteShare(board), []);
  const targets = play.selected === null ? undefined : moveTargets(board, play.assignment, play.selected);

  const go = (hash: string) => {
    if (hash) location.hash = hash;
    else history.pushState(null, "", location.pathname + location.search);
    setRoute(routeFromHash());
  };
  const startTask = (i: number) => {
    setResult(null);
    dispatch({ type: "reset" });
    setTaskIdx(i);
    setMenu(false);
    go("");
  };

  const nav = (
    <nav className="topnav">
      <button className="icon-btn" onClick={() => setMenu(true)} aria-label={copy.nav.menu}>☰</button>
      <svg className="mascot" viewBox="0 0 24 24" aria-hidden><use href="#ic-salamander" /></svg>
      <button className="icon-btn" onClick={() => go("info")} aria-label={copy.nav.info}><span className="info-i">i</span></button>
    </nav>
  );
  const footer = (
    <footer>
      <a href="#info">{copy.nav.info} →</a>
      <p>{info.analytics}</p>
    </footer>
  );

  let body: React.ReactNode;
  if (route.view === "info") {
    body = <Info onBack={() => go("")} />;
  } else if (route.view === "shared") {
    body = (
      <div className="reveal">
        <h2>{share.shared.headline}</h2>
        <MapPanels board={board} panels={[[copy.reveal.original, board.start], [share.example, route.assignment]]} />
        <p className="core">{copy.reveal.core}</p>
        <button className="primary" onClick={() => startTask(0)}>{share.shared.play} →</button>
      </div>
    );
  } else if (!task) {
    body = (
      <Reveal
        board={board}
        maps={maps}
        onAgain={() => {
          setMaps({});
          startTask(0);
        }}
      />
    );
  } else {
    const goalParty = board.parties.find((p) => p.id === task.goal!.party)!;
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
      if (taskIdx + 1 >= playable.length) track("w1-done");
      startTask(taskIdx + 1);
    };
    body = (
      <>
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
          label={task.prompt}
          onTap={(tile) => {
            setResult(null);
            dispatch({ type: "tap", tile });
          }}
          onAssign={(tile, district) => {
            setResult(null);
            dispatch({ type: "move", tile, district });
          }}
        />
        <Hud
          board={board}
          seats={seats}
          startSeats={startSeats}
          share={share_}
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
                <Confetti />
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
      </>
    );
  }

  return (
    <main>
      <Sprite />
      {nav}
      {body}
      {footer}
      {menu && <Menu board={board} onPick={startTask} onClose={() => setMenu(false)} />}
    </main>
  );
}
