export const share = {
  text: "Try this, it takes 2 minutes. It's what the UCP is doing to our ridings. danimander.ca",
  cardHeadline: "Same votes. Different winner.",
  cardCore: "That's why the people who win elections shouldn't draw the map.",
  cardUrl: "danimander.ca",
  original: "Original map",
  mine: "My map",
  example: "Redrawn map",
  buttons: { native: "Share", download: "Save image", copy: "Copy text", copied: "Copied!" },
  shared: {
    headline: "Someone redrew Coulee County.",
    play: "Try it yourself",
  },
  filename: "danimander.png",
  // Text result for chat apps: one line per puzzle, seats as coloured squares.
  squares: { blue: "🟦", orange: "🟧", purple: "🟪", green: "🟩" } as Record<string, string>,
  tieSquare: "⬜",
  heading: (what: string) => `I gerrymandered ${what} 🦎`,
  line: (squares: string, moves: number, hints: number) =>
    `${squares} in ${moves} move${moves === 1 ? "" : "s"}${hints ? ` (+${hints} hint${hints === 1 ? "" : "s"})` : ""}`,
  challenge: "Can you do it in fewer?",
  copiedText: "Copied — paste it anywhere!",
};
