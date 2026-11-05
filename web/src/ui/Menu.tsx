import { daily } from "../content/howto";
import { w1 as copy } from "../content/w1";
import type { Board } from "../game/types";

export function readStars(boardId: string, taskId: string): number {
  try {
    return Number(localStorage.getItem(`dm:stars:${boardId}:${taskId}`) ?? 0);
  } catch {
    return 0;
  }
}

const Stars = ({ n }: { n: number }) => <span className="stars-sm">{"★".repeat(n)}{"☆".repeat(3 - n)}</span>;

type Props = {
  board: Board;
  dailyId: string;
  dailyNumber: number;
  onPick: (taskIdx: number) => void;
  onDaily: () => void;
  onWorld: (id: string) => void;
  onAlberta: () => void;
  onClose: () => void;
};

export function Menu({ board, dailyId, dailyNumber, onPick, onDaily, onWorld, onAlberta, onClose }: Props) {
  const tasks = board.tasks.filter((t) => t.goal);
  return (
    <div className="overlay" role="dialog" aria-label={copy.menu.title} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{copy.menu.title}</h2>
        <ol>
          <li>
            <button className="primary" onClick={onDaily}>
              📅 {daily.menu(dailyNumber)} <Stars n={Math.min(readStars(dailyId, "pack"), readStars(dailyId, "crack"))} />
            </button>
          </li>
        </ol>
        {copy.menu.worlds.map((w) => (
          <section key={w.id} className={w.available ? "" : "locked"}>
            <h3>{w.title}</h3>
            {w.available && w.id !== board.id ? (
              <ol>
                <li>
                  <button onClick={() => onWorld(w.id)}>{copy.menu.play} →</button>
                </li>
              </ol>
            ) : w.available ? (
              <ol>
                {tasks.map((t, i) => (
                  <li key={t.id}>
                    <button onClick={() => onPick(i)}>
                      {t.prompt} <Stars n={readStars(board.id, t.id)} />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">{copy.menu.soon}</p>
            )}
          </section>
        ))}
        <a className="alberta" href="#info" onClick={onAlberta}>{copy.menu.alberta}</a>
        <button onClick={onClose}>{copy.menu.close}</button>
      </div>
    </div>
  );
}
