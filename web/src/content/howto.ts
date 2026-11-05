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
    { icon: "🏙️", text: "Dashed lines are city and town limits. While they're locked, a hex can't cross them." },
    { icon: "👀", text: "Every hex you redraw adds public scrutiny. At the limit, you can't redraw any more." },
    { icon: "🃏", text: "Power cards bend the rules, once each. Both really happened in Alberta — tap one to see." },
  ],
  close: "Got it",
};

export const daily = {
  menu: (n: number) => `Daily puzzle #${n}`,
  step: (i: number, n: number) => `part ${i} of ${n}`,
  summary: "Same votes. Both winners.",
  share: "Share result",
  copied: "Copied!",
  back: "Back to the main game",
  tomorrow: "New puzzle tomorrow.",
};
