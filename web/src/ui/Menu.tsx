import { w1 as copy } from "../content/w1";
import type { Board } from "../game/types";

export function readStars(boardId: string, taskId: string): number {
  try {
    return Number(localStorage.getItem(`dm:stars:${boardId}:${taskId}`) ?? 0);
  } catch {
    return 0;
  }
}

export function Menu({ board, onPick, onClose }: { board: Board; onPick: (taskIdx: number) => void; onClose: () => void }) {
  const tasks = board.tasks.filter((t) => t.goal);
  return (
    <div className="overlay" role="dialog" aria-label={copy.menu.title} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{copy.menu.title}</h2>
        {copy.menu.worlds.map((w) => (
          <section key={w.id} className={w.available ? "" : "locked"}>
            <h3>{w.title}</h3>
            {w.available ? (
              <ol>
                {tasks.map((t, i) => {
                  const s = readStars(board.id, t.id);
                  return (
                    <li key={t.id}>
                      <button onClick={() => onPick(i)}>
                        {t.prompt} <span className="stars-sm">{"★".repeat(s)}{"☆".repeat(3 - s)}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="muted">{copy.menu.soon}</p>
            )}
          </section>
        ))}
        <button onClick={onClose}>{copy.menu.close}</button>
      </div>
    </div>
  );
}
