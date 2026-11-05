import { share as copy } from "../content/share";
import { seatTally, winners } from "./score";
import type { Board } from "./types";

/** Seats as coloured squares, first party from the left, second from the right (matches the seat bar). */
export function seatSquares(board: Board, assignment: number[], nDistricts = board.rules.nDistricts): string {
  const t = seatTally(board, winners(board, assignment, nDistricts));
  const [a, b] = board.parties;
  const sq = (p: { id: string; color?: string }) => copy.squares[p.color ?? p.id] ?? "⬛";
  const ties = nDistricts - t[a.id] - t[b.id];
  return sq(a).repeat(t[a.id]) + copy.tieSquare.repeat(ties) + sq(b).repeat(t[b.id]);
}

export type ResultLine = { assignment: number[]; moves: number; hints?: number; nDistricts?: number };

/**
 * Paste-anywhere result, e.g.
 *   I gerrymandered Dani-Mander #1 🦎
 *   🟦🟦🟧🟧🟧 in 4 moves
 *   🟦🟦🟦🟦🟦 in 2 moves
 *   Can you do it in fewer? https://danimander.ca/#daily=2026-11-05
 */
export function shareText(board: Board, what: string, lines: ResultLine[], url: string): string {
  return [
    copy.heading(what),
    ...lines.map((l) => copy.line(seatSquares(board, l.assignment, l.nDistricts), l.moves, l.hints ?? 0)),
    `${copy.challenge} ${url}`,
  ].join("\n");
}

/** Copy text; falls back to a hidden textarea + execCommand on plain-http pages (no Clipboard API). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/** Native share sheet when available (secure contexts), otherwise copy. Returns what happened. */
export async function shareOrCopy(text: string): Promise<"shared" | "copied" | "failed" | "cancelled"> {
  if (window.isSecureContext && navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  return (await copyText(text)) ? "copied" : "failed";
}
