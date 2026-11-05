import type { PowerId } from "../game/types";

// Power cards (World 2+). Each links to its real-world receipt on the info page.
export const powers: Record<PowerId, { icon: string; name: string; effect: string; receipt: string; quip: string }> = {
  seat: {
    icon: "➕",
    name: "Bonus Seat",
    effect: "Add one more district. Tap a hex to start it, then grow it.",
    receipt: "card-seat",
    quip: "More seats, more representation. For some.",
  },
  limits: {
    icon: "🚧",
    name: "Erase the City Limits",
    effect: "Districts may now mix city, town and countryside. Changing the law gets noticed: +2 scrutiny.",
    receipt: "card-limits",
    quip: "Who needs municipal boundaries?",
  },
  hearings: {
    icon: "🔇",
    name: "Skip the Hearings",
    effect: "From now on, your changes stop adding to public scrutiny.",
    receipt: "card-hearings",
    quip: "No public hearings required.",
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
