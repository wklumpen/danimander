// Copy for World 2 ("Prairie Province") and the power-card HUD.
export const w2 = {
  scrutiny: "Scrutiny",
  frozen: "hearings skipped",
  tooObvious: (cap: number) => `Too obvious — scrutiny is over ${cap}. The public would notice.`,
  mixed: "City limits are locked: districts can't mix city and country.",
  seeding: "Tap a hex to start your new district.",
  cancel: "Cancel",
  swingResult: (label: string, seats: number, swung: number, need: number) =>
    `Today: ${label} ${seats}. After a 3-point swing: ${swung}. You need ${need} both times.`,
  start: "Start drawing ✏️",
  reveal: {
    headline: "Neither side should be able to do this.",
    sub: "In Alberta, right now, one side is.",
    original: "Original",
    redrawn: (n: number) => `${n} hexes redrawn in total`,
    cta: "See what's happening in Alberta →",
    again: "Play again",
  },
};
