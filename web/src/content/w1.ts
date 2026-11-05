// All player-facing copy for World 1. Task prompts/success lines live in boards/w1.json.
export const w1 = {
  hud: {
    seats: "Seats",
    was: "was",
    votes: "Votes",
    votesNote: "never changes",
    changed: "Tiles moved",
    undo: "Undo",
    reset: "Reset",
    ghost: "Old lines",
    run: "Run election",
    invalid: (n: number) => (n === 1 ? "1 district needs fixing" : `${n} districts need fixing`),
    pickTile: "Tap a hex to pick it up.",
    pickTarget: "Tap a yellow district to move this hex into it.",
    hint: "Hint",
    noHint: "Already there — run the election!",
    hintsUsed: (n: number) => `${n} hint${n > 1 ? "s" : ""} used (max ★★)`,
  },
  result: {
    missed: (party: string, seats: number) => `${party} won ${seats}. Keep drawing.`,
    next: "Next",
    retry: "Keep drawing",
  },
  reveal: {
    headline: "No votes changed. No weird shapes.",
    original: "Original",
    greenMap: "Your Green map",
    purpleMap: "Your Purple map",
    stat: (nPlans: number, pct: string) =>
      `Of ${nPlans.toLocaleString("en-CA")} possible maps, only ${pct} give Green 3 seats — you found one.`,
    core: "Same votes, different map, different winner — that's why the people who win elections shouldn't draw the map.",
    again: "Play again",
    shareTitle: "Show someone what you did",
  },
  menu: {
    title: "Levels",
    worlds: [
      { id: "w1", title: "1 · Coulee County", available: true },
      { id: "w2", title: "2 · Prairie Province", available: false },
      { id: "w3", title: "3 · The Real Thing", available: false },
    ],
    soon: "Coming soon",
    alberta: "What's happening in Alberta? →",
    reveal: "The reveal",
    close: "Close",
  },
  nav: { menu: "Levels", howto: "How to play", info: "What's happening in Alberta?" },
};
