import type { Board } from "../game/types";

/** Render text with every party label coloured as that party (e.g. "Help Orange win 3 seats."). */
export function PartyText({ text, board }: { text: string; board: Board }) {
  const labels = board.parties.map((p) => p.label);
  const re = new RegExp(`\\b(${labels.join("|")})\\b`, "g");
  return (
    <>
      {text.split(re).map((part, i) => {
        const party = board.parties.find((p) => p.label === part);
        return party ? <span key={i} className={`text-${party.id} party-name`}>{part}</span> : part;
      })}
    </>
  );
}
