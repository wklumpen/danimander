// Flat SVG icons (viewBox 0 0 24 24) as markup strings, so the same art is used by the
// live board (<symbol> sprite) and by the share card (inlined into a standalone SVG).
export const ICONS: Record<string, string> = {
  farm: `<path d="M12 22V9" stroke="#7a5a1e" stroke-width="1.6" stroke-linecap="round"/>
    <g fill="#e0a526" stroke="#7a5a1e" stroke-width="0.8">
      <ellipse cx="12" cy="5" rx="1.8" ry="3"/>
      <ellipse cx="9" cy="9.5" rx="1.6" ry="2.7" transform="rotate(-30 9 9.5)"/>
      <ellipse cx="15" cy="9.5" rx="1.6" ry="2.7" transform="rotate(30 15 9.5)"/>
      <ellipse cx="9" cy="14" rx="1.6" ry="2.7" transform="rotate(-30 9 14)"/>
      <ellipse cx="15" cy="14" rx="1.6" ry="2.7" transform="rotate(30 15 14)"/>
    </g>`,
  town: `<g stroke="#2a2630" stroke-width="1" stroke-linejoin="round">
      <path d="M2 21V12l5-4 5 4v9z" fill="#f2e6cf"/>
      <path d="M11 21V9l5.5-5L22 9v12z" fill="#e8d3ad"/>
      <path d="M1 12.5 7 7.5l6 5" fill="none" stroke="#b5462d" stroke-width="1.8"/>
      <path d="M10 9.5 16.5 3.5 23 9.5" fill="none" stroke="#b5462d" stroke-width="1.8"/>
    </g>
    <g fill="#5b8fb9"><rect x="5.5" y="14" width="3" height="3"/><rect x="14" y="11" width="2.5" height="2.5"/><rect x="17.5" y="11" width="2.5" height="2.5"/></g>
    <rect x="15" y="16" width="3" height="5" fill="#6b4a2b"/>`,
  pumpjack: `<g stroke="#2a2630" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 22h20" />
      <path d="M8 22 12 10l4 12" fill="none"/>
      <path d="M3 9.5 19 7.5" stroke-width="2.2"/>
      <path d="M19 7.5c2 0 3 1.2 3 3l-3 1" fill="#2a2630"/>
      <path d="M4 10v8" />
      <rect x="2.5" y="17.5" width="3" height="3" fill="#2a2630"/>
    </g>
    <circle cx="12" cy="9" r="1.3" fill="#e0a526"/>`,
  city: `<g stroke="#2a2630" stroke-width="0.9" stroke-linejoin="round">
      <rect x="3" y="10" width="5" height="12" fill="#c9cfd8"/>
      <rect x="9" y="3" width="6" height="19" fill="#aab4c3"/>
      <rect x="16" y="7" width="5" height="15" fill="#c9cfd8"/>
    </g>
    <g fill="#ffe79a"><rect x="10.5" y="5.5" width="1.2" height="1.4"/><rect x="12.6" y="5.5" width="1.2" height="1.4"/><rect x="10.5" y="9" width="1.2" height="1.4"/><rect x="12.6" y="9" width="1.2" height="1.4"/><rect x="10.5" y="12.5" width="1.2" height="1.4"/><rect x="12.6" y="12.5" width="1.2" height="1.4"/><rect x="4.4" y="12.5" width="1.2" height="1.4"/><rect x="17.4" y="9.5" width="1.2" height="1.4"/><rect x="17.4" y="13" width="1.2" height="1.4"/><rect x="4.4" y="16" width="1.2" height="1.4"/></g>`,
  mountain: `<path d="M1 22 9 7l4 6 3-4 7 13z" fill="#7d8a99" stroke="#2a2630" stroke-width="1" stroke-linejoin="round"/>
    <path d="M9 7l-2.6 4.9 1.6-0.9 1 1.2 1.2-1.4 1.1 0.5z" fill="#fff"/>
    <path d="M16 9l-1.6 2.1 1 0.4 0.6-0.6 0.8 0.7 0.6-0.5z" fill="#fff"/>`,
  // The Dani-Mander: a salamander in a cowboy hat. Simple paths so it can be morphed later.
  salamander: `<g stroke="#2a2630" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round">
      <path d="M4 15c0-3 3-5 6-5h4c3 0 4.5 1.5 6 3.5 1 1.3 2.5 1.5 3 1-0.5 2-3 2.5-4.5 1.5-1.5-1-2.5-1-4-0.5-2 0.8-4 1.5-6 1.5-3 0-4.5-0.5-4.5-2z" fill="#e8a13a"/>
      <path d="M7 16.5 5.5 20M11 17 12 20.5M15 15.5 17 19M8 11 6.5 8.5" fill="none"/>
      <circle cx="6.5" cy="13" r="0.7" fill="#2a2630" stroke="none"/>
      <circle cx="11" cy="12.5" r="0.9" fill="#3d2b1f" stroke="none"/><circle cx="15" cy="13.2" r="0.8" fill="#3d2b1f" stroke="none"/>
      <path d="M2.5 9.5c1.5 0.8 6 0.8 7.5 0" fill="none"/>
      <path d="M4 9.6c0-2 0.6-3.4 2.2-3.4s2.2 1.4 2.2 3.4" fill="#8a5a2b"/>
    </g>`,
};

export function iconSymbols(): string {
  return Object.entries(ICONS)
    .map(([id, body]) => `<symbol id="ic-${id}" viewBox="0 0 24 24">${body}</symbol>`)
    .join("");
}
