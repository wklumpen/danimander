import { useState } from "react";
import { howto } from "../content/howto";
import { intBand } from "../game/solver";
import type { Board as BoardT } from "../game/types";
import { Board } from "./Board";
import { AXIAL_DIRS } from "./hex";

const SEEN = "dm:howto";
const SEEN_W2 = "dm:howto-w2";

export function seenHowTo(w2: boolean): boolean {
  try {
    return !!localStorage.getItem(w2 ? SEEN_W2 : SEEN);
  } catch {
    return true; // storage disabled: don't nag on every load
  }
}

function markSeen(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // storage disabled
  }
}

/**
 * The example: 9 hexes in three rows, three districts of 3. Moving hex 2 down makes the rows
 * 2 and 4 (red); moving hex 3 up fixes them and flips the middle district.
 */
const START = [0, 0, 0, 1, 1, 1, 2, 2, 2];
const MOVED = [0, 0, 1, 1, 1, 1, 2, 2, 2];
const FIXED = [0, 0, 1, 0, 1, 1, 2, 2, 2];
const SECOND = new Set([0, 1, 2, 4]); // hexes voting for the board's second party
const ICONS = ["farm", "farm", "farm", "farm", "town", "farm", "pumpjack", "farm", "farm"];

function exampleBoard(parties: BoardT["parties"]): BoardT {
  const tiles = START.map((_, i) => {
    const r = Math.floor(i / 3);
    const q = (i % 3) - Math.floor(r / 2);
    const votes = Object.fromEntries(parties.map((p, pi) => [p.id, Number(SECOND.has(i) === (pi === 1))]));
    return { id: i, q, r, tier: 0, pop: 1, votes, muni: null, icon: ICONS[i], outline: null };
  });
  const at = new Map(tiles.map((t, i) => [`${t.q},${t.r}`, i]));
  const adjacency = tiles.map((t) => AXIAL_DIRS.flatMap(([dq, dr]) => at.get(`${t.q + dq},${t.r + dr}`) ?? []));
  return {
    id: "howto",
    title: howto.title,
    parties,
    tiles,
    adjacency,
    start: START,
    rules: { nDistricts: 3, band: 0, muniLock: false, powers: [] },
    tasks: [],
    stats: { nPlans: 0, seatDist: {} },
  };
}

function Frame({ caption, children }: { caption?: string; children: React.ReactNode }) {
  return (
    <figure className="howto-frame">
      {children}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** Step-by-step "How to play": shown the first time a puzzle opens, and from the "?" button. */
export function HowTo({ board, onClose, startAt = 0 }: { board: BoardT; onClose: () => void; startAt?: number }) {
  const w2 = board.rules.powers.length > 0;
  const n = board.rules.nDistricts;
  const [lo, hi] = intBand(board.tiles.length, n, board.rules.band);
  const steps = howto.steps(lo === hi ? `${lo}` : `${lo} to ${hi}`);
  const ex = exampleBoard(board.parties);
  const B = (a: number[], extra: Partial<React.ComponentProps<typeof Board>> = {}) => (
    <Board board={ex} assignment={a} nDistricts={3} label={howto.title} {...extra} />
  );
  const bad = new Set([0, 1]);
  const art = [
    <Frame key="0">{B(START)}</Frame>,
    <>
      <Frame caption={howto.before}>{B(START, { selected: 2, targets: new Set([1]), arrow: [2, 4] })}</Frame>
      <span className="howto-to" aria-hidden>→</span>
      <Frame caption={howto.tooBig}>{B(MOVED, { invalid: bad })}</Frame>
    </>,
    <>
      <Frame caption={howto.another}>{B(MOVED, { invalid: bad, selected: 3, targets: new Set([0]), arrow: [3, 1] })}</Frame>
      <span className="howto-to" aria-hidden>→</span>
      <Frame caption={howto.fixed}>{B(FIXED)}</Frame>
    </>,
    <>
      <Frame caption={howto.wins(board.parties[0].label)}>{B(START)}</Frame>
      <span className="howto-to" aria-hidden>→</span>
      <Frame caption={howto.wins(board.parties[1].label)}>{B(FIXED)}</Frame>
    </>,
  ];
  const total = steps.length + (w2 ? 1 : 0);
  const [page, setPage] = useState(Math.min(startAt, total - 1));
  const close = () => {
    markSeen(SEEN);
    if (w2) markSeen(SEEN_W2);
    onClose();
  };
  const last = page === total - 1;
  const step = steps[page];

  return (
    <div className="overlay center" role="dialog" aria-label={howto.title} onClick={close}>
      <div className="splash howto" onClick={(e) => e.stopPropagation()}>
        <p className="daily-tag">{howto.title}</p>
        {step ? (
          <>
            <div className="howto-art">{art[page]}</div>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
          </>
        ) : (
          <>
            <h2>{howto.extrasTitle}</h2>
            <ul>
              {howto.extras.map((r) => (
                <li key={r.text}>
                  <span className="ic" aria-hidden>{r.icon}</span>
                  <span>{r.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="dots" aria-hidden>
          {Array.from({ length: total }, (_, i) => <i key={i} className={i === page ? "on" : undefined} />)}
        </div>
        <button className="primary" onClick={last ? close : () => setPage(page + 1)} autoFocus>
          {last ? howto.close : `${howto.next} →`}
        </button>
        {!last && <button className="link skip" onClick={close}>{howto.skip}</button>}
      </div>
    </div>
  );
}
