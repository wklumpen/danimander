import type { PowerId } from "../game/types";

// Power cards (World 2+). Each links to its real-world receipt on the info page.
export const powers: Record<PowerId, { icon: string; name: string; effect: string; receipt: string; quip: string }> = {
  limits: {
    icon: "🚧",
    name: "Erase the City Limits",
    effect: "Districts may now mix 🌾 country, 🏙️ city and 🏘️ town. Changing the law gets noticed: +2 scrutiny.",
    receipt: "card-limits",
    quip: "Who needs municipal boundaries?",
  },
  toss: {
    icon: "🗑️",
    name: "Toss the Ref's Report",
    effect: "Public scrutiny resets to zero. The old map no longer counts.",
    receipt: "card-toss",
    quip: "What report?",
  },
};

export const powerUi = {
  real: "This really happened →",
  play: "Play card",
  notNow: "Not yet",
  used: "used",
  tryCard: (name: string) => `Stuck? Try a power card: ${name}.`,
};
