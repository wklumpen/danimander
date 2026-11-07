// First-visit tutorial (also behind the "?" button). One idea per step, shown on a tiny example map.
export const howto = {
  title: "How to play",
  steps: (size: string) => [
    {
      title: "Black lines mark districts",
      text: "Each district is won by whichever colour has more hexes in it.",
    },
    {
      title: "Move a hex",
      text: "Tap a hex, then tap a yellow district next to it. The hex joins that district.",
    },
    {
      title: "Fix the red",
      text: `Every district needs exactly ${size} hexes, all touching. Red means a district breaks a rule.`,
    },
    {
      title: "Win the seats",
      text: "Redraw until you hit the goal at the top — then tap Call election.",
    },
  ],
  /** Captions under the before/after art. */
  before: "Before",
  after: "After",
  tooBig: "Too many / too few",
  another: "Move another",
  fixed: "All fixed",
  wins: (party: string) => `${party} wins 2–1`,
  extrasTitle: (world: string) => `${world} rules`,
  /** Land names by tile icon, for the list of land types on a board. */
  lands: { farm: "🌾 country", city: "🏙️ city", town: "🏘️ town" } as Record<string, string>,
  extras: (lands: string[]) => [
    { icon: "🏙️", text: `The land is ${lands.slice(0, -1).join(", ")} and ${lands[lands.length - 1]}. While the city limits are locked, a hex can only join a district of its own kind.` },
    { icon: "👀", text: "Every hex you redraw adds public scrutiny. At the limit, you can't redraw any more." },
    { icon: "🃏", text: "Power cards bend the rules, once each. Both really happened in Alberta — tap one to see." },
  ],
  next: "Next",
  skip: "Skip",
  close: "Let's play",
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
