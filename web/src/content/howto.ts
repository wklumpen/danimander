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
  step: (i: number, n: number) => `part ${i} of ${n}`,
  summary: "Same votes. Both winners.",
  packMap: "Orange wins",
  crackMap: "Blue sweeps",
  solved: (n: number, stars: number[], hints: number) =>
    `Dani-Mander daily #${n}: packed ${"★".repeat(stars[0])}${"☆".repeat(3 - stars[0])}, cracked ${"★".repeat(stars[1])}${"☆".repeat(3 - stars[1])}${hints ? ` (${hints} hint${hints > 1 ? "s" : ""})` : ""}. Same votes, opposite winners.`,
  share: "Share result",
  copied: "Copied!",
  back: "Back to the main game",
  tomorrow: "New puzzle tomorrow.",
};
