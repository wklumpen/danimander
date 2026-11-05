export const howto = {
  title: "How to play",
  rules: (size: number, n: number) => [
    { icon: "⬡", text: `The map has ${n} districts. Each must have exactly ${size} hexes.` },
    { icon: "🔗", text: "Every district must be one connected piece." },
    { icon: "🗳️", text: "A district goes to whichever colour has more hexes in it." },
    { icon: "👆", text: "Tap a hex to pick it up, then tap a yellow district to move it there." },
    { icon: "🟥", text: "Red districts are the wrong size or in pieces — fix them before the election." },
    { icon: "⭐", text: "Use as few moves as you can. Stuck? Tap Hint." },
  ],
  close: "Got it",
};

export const daily = {
  menu: (n: number) => `Daily puzzle #${n}`,
  solved: (n: number, stars: number, moved: number, hints: number) =>
    `Dani-Mander daily #${n} ${"★".repeat(stars)}${"☆".repeat(3 - stars)} — ${moved} hexes moved${hints ? `, ${hints} hint${hints > 1 ? "s" : ""}` : ""}`,
  share: "Share result",
  copied: "Copied!",
  back: "Back to the main game",
  tomorrow: "New puzzle tomorrow.",
};
