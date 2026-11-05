// Copy for World 2 ("Prairie Province") and the power-card HUD.
export const w2 = {
  scrutiny: "Scrutiny",
  tooObvious: (cap: number) => `Too obvious — scrutiny is over ${cap}. The public would notice.`,
  mixed: "Limits are locked: districts can't mix 🌾 country, 🏙️ city and 🏘️ town.",
  capBlocked: "Too obvious — the public would notice. Toss the report?",
  lockBlocked: "Limits are locked: hexes can only join districts of the same land (🌾 🏙️ 🏘️).",
  noRoom: "Scrutiny's maxed out. Undo a few moves and plan your toss.",
  start: "Start drawing ✏️",
  reveal: {
    headline: "Neither side should be able to do this.",
    sub: "In Alberta, right now, one side is.",
    original: "Original",
    redrawn: (n: number) => `You redrew ${n} hexes`,
    stat: (nPlans: number, pct: string) => `Of ${nPlans.toLocaleString("en-CA")} possible maps, ${pct} give the Government a majority. The fair one isn't among them.`,
    cta: "See what's happening in Alberta →",
    again: "Play again",
  },
};
