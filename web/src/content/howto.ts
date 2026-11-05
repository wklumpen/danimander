export const howto = {
  title: "How to play",
  rules: (size: string, n: number) => [
    { icon: "⬡", text: `The map has ${n} districts. Each must have ${size} hexes.` },
    { icon: "🔗", text: "Every district must be one connected piece." },
    { icon: "🗳️", text: "A district goes to whichever colour has more hexes in it." },
    { icon: "👆", text: "Tap a hex to pick it up, then tap a yellow district to move it there." },
    { icon: "🟥", text: "Red districts are the wrong size or in pieces — fix them before the election." },
    { icon: "⭐", text: "Use as few moves as you can. Stuck? Tap Hint." },
  ],
  extras: [
    { icon: "🏙️", text: "Three kinds of land: 🌾 country, 🏙️ city, 🏘️ town. While the limits are locked, a hex can only join a district of its own kind." },
    { icon: "👀", text: "Every hex you redraw adds public scrutiny. At the limit, you can't redraw any more." },
    { icon: "🃏", text: "Power cards bend the rules, once each. Both really happened in Alberta — tap one to see." },
  ],
  close: "Got it",
};

export const daily = {
  // "The Daily Danimander": "Dani" is rendered in Government blue (see ui/DailyBrand.tsx)
  brand: { the: "The Daily ", dani: "Dani", rest: "mander" },
  shareName: (n: number) => `The Daily Danimander #${n}`,
  step: (i: number, n: number) => `part ${i} of ${n}`,
  summary: "Same votes. Both winners.",
  share: "Share result",
  copied: "Copied!",
  back: "Back to the main game",
  tomorrow: "New puzzle tomorrow.",
};
