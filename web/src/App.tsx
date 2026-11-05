import { useEffect, useMemo, useState } from "react";
import boardJson from "../../boards/w1.json";
import { track } from "./analytics";
import { daily as dailyCopy } from "./content/howto";
import { share } from "./content/share";
import { w1 as copy } from "./content/w1";
import { albertaDate, dailyBoard, puzzleNumber } from "./game/daily";
import { decodePlan } from "./game/encode";
import type { Board as BoardT } from "./game/types";
import { validatePlan } from "./game/validate";
import { HowTo } from "./ui/HowTo";
import { iconSymbols } from "./ui/icons";
import { Info } from "./ui/Info";
import { Menu } from "./ui/Menu";
import { MapPanels, Reveal } from "./ui/Reveal";
import { Session, type WinResult } from "./ui/Session";
import { Splash, shouldShowSplash } from "./ui/Splash";
import { World2, board2 } from "./ui/World2";
import { ShareText } from "./ui/ShareText";
import { shareText } from "./game/shareText";
import { cardSvg } from "./ui/shareCard";

const board = boardJson as unknown as BoardT;
const playable = board.tasks.filter((t) => t.goal);
const boards: Record<string, BoardT> = { [board.id]: board };

type Route = { view: "play" } | { view: "w2" } | { view: "daily"; date: string } | { view: "info" } | { view: "shared"; assignment: number[] };

/** `#daily` = today; `#daily=YYYY-MM-DD` = that day's puzzle (no future ones, none before #1). */
function dailyDate(h: string): string {
  const today = albertaDate();
  const d = h.split("=")[1];
  // Dev server only: allow future dates to preview upcoming puzzles.
  const okDate = d && /^\d{4}-\d{2}-\d{2}$/.test(d) && (d <= today || import.meta.env.DEV) && puzzleNumber(d) >= 1;
  return okDate ? d : today;
}

function routeFromHash(): Route {
  const h = location.hash.slice(1);
  if (h === "info" || h === "timeline" || h.startsWith("card-")) return { view: "info" };
  if (h === "daily" || h.startsWith("daily=")) return { view: "daily", date: dailyDate(h) };
  if (h === "w2") return { view: "w2" };
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
  const [run, setRun] = useState(0); // bump to remount the session
  const [maps, setMaps] = useState<Record<string, number[]>>({});
  const [menu, setMenu] = useState(false);
  const [howto, setHowto] = useState(false);
  const [w2Playing, setW2Playing] = useState(true);
  const [intro, setIntro] = useState(() => shouldShowSplash() && routeFromHash().view !== "info");
  const today = albertaDate();
  const dailyN = puzzleNumber(today);

  useEffect(() => {
    const on = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useEffect(() => track("w1-start"), []);

  const go = (hash: string) => {
    if (hash) location.hash = hash;
    else history.pushState(null, "", location.pathname + location.search);
    setRoute(routeFromHash());
    setMenu(false);
    window.scrollTo(0, 0);
  };
  const startTask = (i: number) => {
    setTaskIdx(i);
    setRun((r) => r + 1);
    go("");
  };

  let body: React.ReactNode;
  if (route.view === "info") {
    body = <Info onBack={() => go("")} />;
  } else if (route.view === "w2") {
    body = <World2 onInfo={() => go("info")} onStage={setW2Playing} />;
  } else if (route.view === "daily") {
    body = <Daily key={route.date} date={route.date} n={puzzleNumber(route.date)} onBack={() => go("")} />;
  } else if (route.view === "shared") {
    body = (
      <div className="reveal">
        <h2>{share.shared.headline}</h2>
        <MapPanels board={board} panels={[[copy.reveal.original, board.start], [share.example, route.assignment]]} />
        <p className="core">{copy.reveal.core}</p>
        <button className="primary" onClick={() => startTask(0)}>{share.shared.play} →</button>
      </div>
    );
  } else if (taskIdx >= playable.length) {
    body = (
      <Reveal
        board={board}
        maps={maps}
        onNext={() => go("w2")}
        onAgain={() => {
          setMaps({});
          startTask(0);
        }}
      />
    );
  } else {
    const task = playable[taskIdx];
    body = (
      <Session
        key={`${task.id}-${run}`}
        board={board}
        task={task}
        onWin={(r) => {
          setMaps((m) => ({ ...m, [task.id]: r.assignment }));
          track(`w1-${task.id}`);
        }}
        winActions={() => (
          <button
            className="primary"
            onClick={() => {
              if (taskIdx + 1 >= playable.length) track("w1-done");
              startTask(taskIdx + 1);
            }}
          >
            {copy.result.next} →
          </button>
        )}
      />
    );
  }

  const fits =
    route.view === "daily" || (route.view === "w2" && w2Playing) || (route.view === "play" && taskIdx < playable.length);
  return (
    <main className={fits ? "fit" : undefined}>
      <Sprite />
      <nav className="topnav">
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label={copy.nav.menu}>☰</button>
        <svg className="mascot" viewBox="0 0 24 24" aria-hidden><use href="#ic-salamander" /></svg>
        <button className="icon-btn" onClick={() => setHowto(true)} aria-label={copy.nav.howto}>
          <span className="info-i">?</span>
        </button>
      </nav>
      {body}
      <footer>
        <a href="#info">{copy.nav.info} →</a>
      </footer>
      {menu && (
        <Menu
          board={board}
          dailyId={`daily-${today}`}
          dailyNumber={dailyN}
          onPick={startTask}
          onDaily={() => go("daily")}
          onWorld={(id) => go(id === "w2" ? "w2" : "")}
          onAlberta={() => setMenu(false)}
          onClose={() => setMenu(false)}
        />
      )}
      {howto && <HowTo board={route.view === "w2" ? board2 : board} onClose={() => setHowto(false)} />}
      {intro && <Splash onClose={() => setIntro(false)} />}
    </main>
  );
}

function Daily({ date, n, onBack }: { date: string; n: number; onBack: () => void }) {
  const b = useMemo(() => dailyBoard(board, date), [date]);
  const [stage, setStage] = useState(0); // 0 = pack, 1 = crack, 2 = summary
  const [wins, setWins] = useState<WinResult[]>([]);
  const [run, setRun] = useState(0);
  useEffect(() => track("daily-start"), []);

  const text = () =>
    shareText(
      b,
      `Dani-Mander #${n}`,
      wins.map((w) => ({ assignment: w.assignment, moves: w.changed, hints: w.hintsUsed })),
      `${location.origin}${location.pathname}#daily=${date}`,
    );

  if (stage === 2) {
    return (
      <div className="reveal">
        <p className="daily-tag">📅 {b.title}</p>
        <h2>{dailyCopy.summary}</h2>
        <MapPanels
          board={b}
          panels={[
            [copy.reveal.original, b.start],
            ...b.tasks.map((t, i) => [t.caption ?? t.id, wins[i].assignment] as [string, number[]]),
          ]}
        />
        <p className="core">{copy.reveal.core}</p>
        <ShareText text={text()} event="daily" />
        <div className="share">
          <p className="muted small">{dailyCopy.tomorrow}</p>
          <button onClick={onBack}>{dailyCopy.back}</button>
        </div>
      </div>
    );
  }

  const task = b.tasks[stage];
  return (
    <>
      <p className="daily-tag">📅 {b.title} · {dailyCopy.step(stage + 1, b.tasks.length)}</p>
      <Session
        key={`${stage}-${run}`}
        board={b}
        task={task}
        onWin={(r) => {
          setWins((w) => [...w.slice(0, stage), r]);
          track(`daily-${task.id}`);
        }}
        winActions={() => (
          <div className="share">
            <button className="primary" onClick={() => setStage(stage + 1)}>{copy.result.next} →</button>
            <button className="link" onClick={() => setRun((x) => x + 1)}>{copy.hud.reset}</button>
          </div>
        )}
      />
    </>
  );
}
