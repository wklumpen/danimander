import { seatTally, winners } from "../game/score";
import { colorOf, type Board } from "../game/types";
import { center, edges, hexPoints, viewBox } from "./hex";
import { iconSymbols } from "./icons";

// Standalone SVG (no external fonts/images) so it rasterises identically via <img> → canvas.
// Uses the system font stack: canvas-rasterised SVG can't load web fonts, and system fonts
// avoid the base64 font-subset step entirely.
const FONT = `system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const COLORS: Record<string, [string, string]> = {
  blue: ["#a3b4ce", "#184484"],
  orange: ["#ffc799", "#ff7300"],
  purple: ["#c2a5cf", "#762a83"],
  green: ["#a6dba0", "#1b7837"],
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function miniMap(board: Board, assignment: number[], x: number, y: number, w: number, h: number): string {
  const [vx, vy, vw, vh] = viewBox(board.tiles).split(" ").map(Number);
  const s = Math.min(w / vw, h / vh);
  const ox = x + (w - vw * s) / 2 - vx * s;
  const oy = y + (h - vh * s) / 2 - vy * s;
  const k = board.rules.nDistricts;
  const parties = board.parties.map((p) => p.id);
  const tiles = board.tiles
    .map((t) => {
      const party = parties.find((p) => t.votes[p] > 0) ?? parties[0];
      return `<polygon points="${hexPoints(t, 0.96)}" fill="${COLORS[colorOf(board, party)]?.[0] ?? "#ccc"}"/>`;
    })
    .join("");
  const borders = edges(board.tiles)
    .filter((e) => e.b === null || assignment[e.a] !== assignment[e.b])
    .map((e) => `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}"/>`)
    .join("");
  const w8 = winners(board, assignment, k);
  const badges = w8
    .map((p, d) => {
      const cs = board.tiles.filter((_, i) => assignment[i] === d).map(center);
      const cx = cs.reduce((a, c) => a + c[0], 0) / cs.length;
      const cy = cs.reduce((a, c) => a + c[1], 0) / cs.length;
      return `<circle cx="${cx}" cy="${cy}" r="0.55" fill="${p ? COLORS[colorOf(board, p)][1] : "#888"}" stroke="#fff" stroke-width="0.08"/>`;
    })
    .join("");
  return `<g transform="translate(${ox} ${oy}) scale(${s})">${tiles}<g stroke="#1d1b22" stroke-width="0.14" stroke-linecap="round">${borders}</g>${badges}</g>`;
}

function seatLine(board: Board, assignment: number[]): string {
  const t = seatTally(board, winners(board, assignment, board.rules.nDistricts));
  return board.parties
    .map((p) => `<tspan fill="${colorOf(board, p.id) === "orange" ? "#b34f00" : (COLORS[colorOf(board, p.id)]?.[1] ?? "#000")}" font-weight="800">${esc(p.label)} ${t[p.id]}</tspan>`)
    .join(`<tspan fill="#6b6672">  ·  </tspan>`);
}

export type CardCopy = { headline: string; core: string; url: string; left: string; right: string };

export function cardSvg(board: Board, left: number[], right: number[], copy: CardCopy): string {
  const W = 1200;
  const H = 630;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${iconSymbols()}</defs>
  <rect width="${W}" height="${H}" fill="#fbf7ef"/>
  <text x="600" y="78" text-anchor="middle" font-family="${FONT}" font-size="54" font-weight="800" fill="#1d1b22">${esc(copy.headline)}</text>
  <rect x="60" y="112" width="520" height="390" rx="22" fill="#fff" stroke="#1d1b22" stroke-width="3"/>
  <rect x="620" y="112" width="520" height="390" rx="22" fill="#fff" stroke="#1d1b22" stroke-width="3"/>
  ${miniMap(board, left, 80, 130, 480, 300)}
  ${miniMap(board, right, 640, 130, 480, 300)}
  <text x="320" y="466" text-anchor="middle" font-family="${FONT}" font-size="26" fill="#6b6672">${esc(copy.left)}</text>
  <text x="880" y="466" text-anchor="middle" font-family="${FONT}" font-size="26" fill="#6b6672">${esc(copy.right)}</text>
  <text x="320" y="494" text-anchor="middle" font-family="${FONT}" font-size="28">${seatLine(board, left)}</text>
  <text x="880" y="494" text-anchor="middle" font-family="${FONT}" font-size="28">${seatLine(board, right)}</text>
  <text x="600" y="560" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="600" fill="#1d1b22">${esc(copy.core)}</text>
  <use href="#ic-salamander" xlink:href="#ic-salamander" x="60" y="560" width="64" height="64"/>
  <text x="1140" y="606" text-anchor="end" font-family="${FONT}" font-size="30" font-weight="800" fill="#1d1b22">${esc(copy.url)}</text>
</svg>`;
}

export async function svgToPng(svg: string, width = 1200, height = 630): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("share card failed to load"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
