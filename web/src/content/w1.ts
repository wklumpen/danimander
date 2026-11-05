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
    pickTile: "Tap a tile to move it.",
    pickTarget: "Now tap a highlighted district.",
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
  },
};
