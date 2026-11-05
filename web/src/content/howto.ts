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
    { icon: "🏙️", text: "Dashed lines are city limits. While they're locked, a district can't mix city and country." },
    { icon: "🗳️", text: "Lighter hexes are closer races. Your majority has to survive a 3-point swing against you." },
    { icon: "👀", text: "Redraw too much and the public notices: watch the scrutiny meter." },
    { icon: "🃏", text: "Power cards bend the rules. Each one really happened in Alberta — tap it to see." },
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
