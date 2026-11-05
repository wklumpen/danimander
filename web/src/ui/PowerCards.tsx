import { useState } from "react";
import { track } from "../analytics";
import { powers, powerUi } from "../content/powers";
import type { PowerId } from "../game/types";

type Props = {
  available: PowerId[];
  used: PowerId[];
  canPlay: (id: PowerId) => boolean;
  highlight?: PowerId | null;
  onPlay: (id: PowerId) => void;
};

/** Row of power cards. Tap to read what it does (and its real-world receipt), then play it. */
export function PowerCards({ available, used, canPlay, highlight, onPlay }: Props) {
  const [open, setOpen] = useState<PowerId | null>(null);
  const card = open ? powers[open] : null;
  return (
    <>
      <div className="powers" role="toolbar" aria-label="Power cards">
        {available.map((id) => {
          const p = powers[id];
          const isUsed = used.includes(id) || !canPlay(id);
          return (
            <button
              key={id}
              className={["power", isUsed && "used", highlight === id && "hinted"].filter(Boolean).join(" ")}
              disabled={isUsed}
              onClick={() => setOpen(id)}
              aria-label={`${p.name}${isUsed ? ` (${powerUi.used})` : ""}`}
            >
              <span className="power-icon" aria-hidden>{p.icon}</span>
              <span className="power-name">{p.name}</span>
            </button>
          );
        })}
      </div>
      {card && open && (
        <div className="overlay" role="dialog" aria-label={card.name} onClick={() => setOpen(null)}>
          <div className="sheet power-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>
              <span aria-hidden>{card.icon}</span> {card.name}
            </h2>
            <p>{card.effect}</p>
            <a href={`#${card.receipt}`} target="_blank" rel="noopener" onClick={() => track("receipts-open")}>{powerUi.real}</a>
            <div className="row">
              <button onClick={() => setOpen(null)}>{powerUi.notNow}</button>
              <button
                className="primary"
                disabled={!canPlay(open)}
                onClick={() => {
                  onPlay(open);
                  track(`power-${open}`);
                  setOpen(null);
                }}
              >
                {powerUi.play}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
