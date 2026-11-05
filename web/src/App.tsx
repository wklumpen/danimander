import { useEffect, useMemo, useState } from "react";
import boardJson from "../../boards/w1.json";
import { track } from "./analytics";
import { daily as dailyCopy } from "./content/howto";
import { info } from "./content/info";
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
import { cardSvg } from "./ui/shareCard";

const board = boardJson as unknown as BoardT;
const playable = board.tasks.filter((t) => t.goal);
const boards: Record<string, BoardT> = { [board.id]: board };

type Route = { view: "play" } | { view: "daily" } | { view: "info" } | { view: "shared"; assignment: number[] };

function routeFromHash(): Route {
  const h = location.hash.slice(1);
  if (h === "info" || h === "timeline" || h.startsWith("card-")) return { view: "info" };
  if (h === "daily") return { view: "daily" };
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
  } else if (route.view === "daily") {
    body = <Daily date={today} n={dailyN} onBack={() => go("")} />;
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

  return (
    <main>
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
        <p>{info.analytics}</p>
      </footer>
      {menu && (
        <Menu
          board={board}
          dailyId={`daily-${today}`}
          dailyNumber={dailyN}
          onPick={startTask}
          onDaily={() => go("daily")}
          onAlberta={() => setMenu(false)}
          onClose={() => setMenu(false)}
        />
      )}
      {howto && <HowTo board={board} onClose={() => setHowto(false)} />}
    </main>
  );
}

function Daily({ date, n, onBack }: { date: string; n: number; onBack: () => void }) {
  const b = useMemo(() => dailyBoard(board, date), [date]);
  const [run, setRun] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => track("daily-start"), []);

  const shareResult = async (r: WinResult) => {
    const text = dailyCopy.solved(n, r.stars, r.changed, r.hintsUsed);
    const url = `${location.origin}${location.pathname}#daily`;
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
      }
      track("daily-share");
    } catch {
      // cancelled
    }
  };

  return (
    <>
      <p className="daily-tag">📅 {b.title}</p>
      <Session
        key={run}
        board={b}
        task={b.tasks[0]}
        onWin={() => track("daily-done")}
        winActions={(r) => (
          <div className="share">
            <button className="primary" onClick={() => shareResult(r)}>
              📤 {copied ? dailyCopy.copied : dailyCopy.share}
            </button>
            <p className="muted small">{dailyCopy.tomorrow}</p>
            <button onClick={onBack}>{dailyCopy.back}</button>
            <button className="link" onClick={() => setRun((x) => x + 1)}>{copy.hud.reset}</button>
          </div>
        )}
      />
    </>
  );
}
