# Dani-Mander — Project Spec

> *Why let voters pick their MLA when the MLA can pick their voters?*

A free, mobile-first browser game that teaches how gerrymandering works, makes the player feel why the party in power redrawing the map is cheating, and backs it up with sourced receipts on what the UCP government is doing to Alberta's electoral boundaries.

- **Domain:** `danimander.ca` (primary), `dani-mander.ca` → 301 redirect at registrar
- **Hosting:** GitHub Pages, static, zero cost
- **Distribution:** Alberta's Voice

---

## 1. Purpose and message

**Core sentence (everything builds toward this):**
*Same votes, different map, different winner — that's why the people who win elections shouldn't draw the map.*

**Goals**
1. Teach the basics: packing, cracking, and the misconceptions (no weird shapes needed; no votes change; most votes ≠ most seats; not just an American thing).
2. Make the player *feel* that the party in power redrawing the map is cheating — by giving them the pen, then giving it to the other side.
3. Be dead simple to explain to someone else: one sentence, one share image.
4. Provide sourced receipts that this is happening in Alberta now.

**Stance:** openly critical of the UCP's handling of the boundaries process. Guardrails that keep this credible:
- Mechanics, math and data are scrupulously fair. The branding has a side; the math doesn't.
- **No fabricated quotes** from Danielle Smith or anyone else. Real quotes only, sourced, on the info page.
- **No likeness** of real people (photos or caricatures). The mascot is a salamander.
- The cheating argument is about **who holds the pen**, not about rural weighting or seat additions being illegitimate in themselves. Copy must not attack rural Albertans.

**Non-goals:** full redistricting tool; predicting 2027; accounts, leaderboards, user-generated galleries.

## 2. Audience

**Primary:** people who sense this isn't right but can't explain it.
**Real target:** their less-convinced relatives — casual mobile gamers (Candy Crush players) arriving from a Facebook post or text message.

Design implications:
- Mobile-first, portrait, one thumb. Desktop is secondary but must work.
- First win in **under 30 seconds**. First screen is the board, not text.
- Max **one sentence** on screen at a time. Teach by doing; name the concept *after* the player does it ("Nice — that's called **packing**.").
- Juicy feedback: tiles animate on reassignment, seat counter ticks, confetti on district flip, stars vs par. Sound off by default.
- The **share card is the product** — many relatives will only ever see it.

## 3. Experience flow

```
Landing (board + "Play" — 1 line of copy)
  → World 1: Coulee County      (abstract, Alberta-flavoured, neutral parties)
  → World 2: Prairie Province   (abstract, Government vs Opposition, power cards, side-switch)
  → World 3: The Real Thing     (Calgary + collar, real 2023 data, UCP vs NDP)
  → End screen (share card + share text + link to info)
Info page reachable from every screen.
Level-select map shows worlds/tasks with star ratings (localStorage, try/catch wrapped).
```

Each world is 3–5 short **tasks**. A player who quits after World 1 should still get the core sentence.

## 4. Core mechanics (all worlds)

### 4.1 Board
- Tiles on a hex grid, **pointy-top, axial coordinates (q, r)**.
- Each tile: population, votes per party, tier (World 3 only), municipality (World 3 only), icon (decorative).
- Adjacency precomputed in board JSON (not derived at runtime).

### 4.2 Starting state
- Every tile is pre-assigned to a district. The start map is a **fair map** (seat share roughly tracks vote share).
- Player goal is always to **change** the existing borders.

### 4.3 Edit move
- Move one tile from district X to an adjacent district Y.
- **Mobile:** tap tile → tap a tile of target district (target highlights valid neighbours). **Desktop:** drag, plus tap-tap.
- Tile must be adjacent to at least one tile in Y.
- Districts may be **temporarily invalid** (size out of band, or disconnected). Invalid districts render with red outline + hatch and are listed in the status bar.
- **Run Election** disabled until all districts are valid.

### 4.4 Validity rules
- **Contiguity:** each district is one connected component in the adjacency graph.
- **Size band:** district pop ∈ [quota·(1−band), quota·(1+band)], quota = total pop / nDistricts. World 1–2 tiles have pop = 1 so this is a tile count.
- **Municipal lock** (World 3 Commission mode): a district may not contain tiles from more than one municipality unless the start map's district already did.
- **Sparse district** (power card): exactly one district may sit at quota·0.5 minimum.

### 4.5 Election
- District winner = party with most summed votes. World 1 uses odd district sizes with binary tiles → no ties. Worlds 2–3 use fractional shares; ties broken by the start map's winner (document in info page).
- **Swing:** apply uniform swing `s` to party A share per tile, clamped to [0,1].

### 4.6 Always-visible HUD
- Seat tally (current map) vs original-map seats.
- Vote share (never changes — say so).
- **Ghost borders** toggle (original lines as dashed outline).
- **Tiles changed** meter: tiles whose district differs from start. District labels are matched start↔current via Hungarian assignment on overlap so relabelling doesn't inflate the count.
- Controls: undo (unlimited), reset, ghost toggle, Run Election.

## 5. Worlds

### World 1 — "Coulee County"
- **Board:** 25 equal tiles, mini-Alberta silhouette (rough rectangle, jagged SW "Rockies" edge), small town centre, farms around. Icons: 🏘️ town, 🌾 farm, 🛢️ pumpjack, 🏔️ mountain edge (decorative only).
- **Districts:** 5 × exactly 5 tiles.
- **Parties:** neutral — **Purple** and **Green** (colour-blind-safe pair + per-tile pattern/glyph backup).
- **Votes:** binary tiles, 15 Purple / 10 Green (60/40).
- **Start map:** 3–2 Purple.
- **Tasks:**
  1. "Help Green win 3 seats." (requires packing Purple) → "Nice — that's called **packing**: stuff their voters into a few districts."
  2. Reset. "Now give Purple all 5." (requires cracking Green) → "That's **cracking**: spread their voters thin so they lose everywhere."
  3. Reveal: original vs both player maps, seat counts. "No votes changed. No weird shapes." + solver stat: "Of N possible maps, only X% give Green 3 seats — you found one."
- **No powers.** Par + 1–3 stars per task.

### World 2 — "Prairie Province"
- **Board:** ~49 equal tiles, 7 districts, two cities (north + south), towns along a highway corridor, rural in between.
- **Parties:** **The Government** (blue) vs **The Opposition** (orange). Unnamed.
- **Votes:** fractional tile shares (≈0.2–0.8), province-wide ≈ 52% Opposition. Government is behind in the cities.
- **Task A:** "You're the Government. You're behind in the cities. You also hold the pen." Power cards available. Goal: win a majority that survives a 3-point swing against you (election run at s=0 and s=−0.03).
- **Task B (side-switch):** "Now imagine the Opposition wins — and *they* get the pen." Player plays Opposition, starting from their own Task-A map, with power cards. Ghost borders show the original fair map.
- **Reveal:** three maps (original / Government's / Opposition's), seats under identical votes, cumulative tiles changed. "Neither side should be able to do this. In Alberta, right now, one side is." → CTA to info page (60-second layer).

### World 3 — "The Real Thing" (M3)
- **Board:** Calgary + collar (Airdrie, Cochrane, Okotoks, Strathmore, surrounding MDs), ~10–12 seats, ~40–60 leaf tiles.
- **Tiles:** variable size, 3 tiers (urban / town-suburban / rural) via 7-hex rosette hierarchy; each tile carries real population. HUD shows per-district population vs quota (±%).
- **Start map:** simplified current ridings.
- **Votes:** 2023 two-party (UCP/NDP) share, rendered as colour intensity.
- **Modes:**
  - **"What the independent commission did":** ±25% band, municipal lock on, drift meter on. Task: rebalance after population growth (scenario adds pop to urban tiles) and keep it fair.
  - **"What the UCP's committee can do":** same board, power cards on. Task: maximize seats for the party of your choice.
- **Reveal:** player map placed on neutral-ensemble distribution ("Your map gives the UCP more seats than 97% of 10,000 neutral maps"), efficiency gap, link to real-map analysis.

## 6. Power cards (Worlds 2–3, party-in-power role only)

| Card | Effect | Receipt anchor (info page) |
|---|---|---|
| ➕ **Bonus Seat** | +1 district grown from a seed tile the player picks; quota recomputed; neighbours cede tiles | Seat count set by legislation (87 → 89 → 91 via Motion 37) |
| 🚧 **Erase the City Limits** | Disables municipal lock / lets districts cross city–collar boundary | 2024 removal of municipal-boundary requirement |
| 🔇 **Skip the Hearings** | Edits stop counting toward the drift meter | Committee process with no public hearings |
| 🗑️ **Toss the Ref's Report** | Resets the drift meter's baseline to the current map | First-ever rejection of an Alberta EBC final report |

- Each card once per task; greyed when unavailable. Tapping a card shows a one-line effect + "This really happened →" link to the receipt.
- Cards belong to whoever **holds power** — Opposition gets them in World 2 Task B only because they won.
- Bonus Seat band math must produce integer-feasible bands on small boards (e.g. 25 tiles, 6 districts, ±25% → sizes 4–5). Solver validates.

## 7. Info page

Two layers:

**Layer 1 — "The 60-second version"**: five facts with icons, one sentence each, each linking down to its receipt.

**Layer 2 — "The receipts"**:
1. **Timeline** with primary-source links: 2024 Electoral Boundaries Commission Act amendments (89 seats; municipal-boundary requirement removed) → 2025 commission appointed → interim report → March 2026 final report with first-ever minority report (two UCP-appointed members) → April 2026 government rejects report; Motion 37 creates Select Special Committee; no public hearings → June 2026 advisory panel appointed, mandate 91 seats → Oct/Nov 2026 panel report; Elections Alberta CEO letter on timing → what's next.
2. **Verified process facts** — each with source link. Includes the government's stated rationale in their own words (fairly quoted).
3. **Analysis** (M4, publish only when numbers exist): majority / minority / panel maps scored on 2023 votes — seats, efficiency gap, population variance, municipal splits, hybrid districts — placed on the neutral ensemble.
4. **How the game was built** — data, methods, simplifications, repo link.
5. **The power cards in real life** — one anchor per card.
6. **What you can do** — contact your MLA, etc.

All source links must be checked before launch. No claims about the panel map's partisan effect until the analysis is run.

## 8. Sharing

- **Link previews:** one static site-wide `og:image` (1200×630 PNG, pre-rendered at build time) + per-world variants. Must make the point without being read: two mini maps, "Same votes. Different winner."
- **Personal result card:** player's original-vs-their-map, seat counts, core sentence, `danimander.ca`. Rendered client-side SVG → canvas → **PNG**.
  - Mobile: `navigator.share({ files: [png], text, url })` when `navigator.canShare` supports files.
  - Fallback: download PNG + copy link.
  - Pre-filled share text: *"Try this, it takes 2 minutes. It's what the UCP is doing to our ridings. danimander.ca"*
- **Gotcha:** SVG rasterized via canvas can't load external fonts/images. Share-card SVG must inline a **subsetted base64 `@font-face`** and inline all icon `<symbol>`s.
- **Share link:** URL hash encodes the plan (see §10) so the exact map reopens.

## 9. Analytics

**GoatCounter** (free for non-commercial, cookieless, no consent banner).

```html
<script data-goatcounter="https://danimander.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
```

See `web/src/analytics.ts` for the `track()` helper.

Events: `w1-start`, `w1-t1`, `w1-t2`, `w1-done`, `w2-ta`, `w2-tb`, `w2-done`, `w3-done`, `share-native`, `share-download`, `share-copy`, `info-view`, `receipts-open`. Distribution links tagged `?ref=av-fb`, `?ref=av-email`, etc.

Footer: *"We count visits and level completions. No cookies, no personal data, no tracking across sites."*

## 10. Data schemas

### `boards/<id>.json`
```json
{
  "id": "w1",
  "title": "Coulee County",
  "parties": [
    {"id": "purple", "label": "Purple"},
    {"id": "green",  "label": "Green"}
  ],
  "tiles": [
    {
      "id": 0,
      "q": 0, "r": 0,
      "tier": 1,
      "pop": 1,
      "votes": {"purple": 1, "green": 0},
      "muni": null,
      "icon": "farm",
      "outline": null
    }
  ],
  "adjacency": [[1, 5], [0, 2, 5, 6]],
  "start": [0, 0, 1, 1, 2],
  "rules": {
    "nDistricts": 5,
    "band": 0.0,
    "muniLock": false,
    "powers": []
  },
  "tasks": [
    {
      "id": "t1",
      "prompt": "Help Green win 3 seats.",
      "goal": {"party": "green", "minSeats": 3, "swings": [0]},
      "par": 4,
      "success": "Nice — that's called packing."
    }
  ],
  "stats": {
    "nPlans": 0,
    "seatDist": {"green": {"1": 0.0, "2": 0.0, "3": 0.0}}
  }
}
```
- `outline`: null for single-hex tiles (renderer draws hex from q,r); polygon (board units) for World 3 rosette tiles.
- World 3 `stats` adds ensemble histograms keyed by `ruleset` × `nDistricts`.

### Plan state (client)
```ts
type PlanState = {
  boardId: string;
  taskId: string;
  role: string;              // party id holding the pen
  assignment: number[];      // tile index -> district id
  powersUsed: string[];
  nDistricts: number;        // may change via Bonus Seat
};
```
URL hash: `#b=<boardId>&t=<taskId>&p=<payload>` where payload = lz-string-compressed JSON of `{role, diff, powersUsed, nDistricts}` and `diff` = `[[tileIdx, district], ...]` vs `start`.

## 11. Solver and validation (Python)

- **Worlds 1–2:** enumerate all valid partitions (connected, in-band) of the tile graph. Use a canonical-labelling search (grow districts from the lowest-index unassigned tile) to avoid label permutations.
  - Outputs: `nPlans`, seat distributions per party, per-task reachability and **par** = min tiles changed (with Hungarian label matching) over plans satisfying the goal.
  - World 2 (49 tiles / 7 districts) may be too large to enumerate exhaustively — fall back to GerryChain ReCom sampling for stats and heuristic search (simulated annealing on tiles-changed subject to goal) for par.
- **World 3:** GerryChain ReCom ensemble (≥10k plans per ruleset), store histograms only.
- **Board design loop for World 1:** script generates candidate vote layouts on the fixed silhouette, filters to those where: start map is 3–2 and compact-looking; task 1 par ∈ [2, 4]; task 2 par ∈ [3, 6]; goal plans are a minority (<15%) of all plans. Pick by eye from the survivors.
- **CI:** every board loads; start map valid; every task reachable; par within design range; TS validator and Python validator agree on a fixture set of plans.

## 12. World 3 data pipeline (M3)

1. **Inputs:** 2021 Census DA boundaries + population; Elections Alberta 2023 poll-level results; polling subdivision (PSD) boundaries matching the 2023 election (confirm vintage — open-data catalogue lists a 2015 file; may need to request current from Elections Alberta); municipal boundaries.
2. **Vote allocation:** distribute advance/mobile/special ballots across each ED's election-day polls proportional to their votes; PSD → DA via population-weighted dasymetric overlay; collapse to UCP/NDP two-party share, retain `other`.
3. **Projection:** EPSG:3400 (Alberta 10-TM) or UTM 11/12N.
4. **Base grid:** planar axial hex grid over the board polygon.
5. **Hierarchy:** 7-hex rosette tiers (1 / 7 / 49 base hexes). Top-down split: start coarse, split any tile whose pop exceeds threshold; tune threshold to ~40–60 leaves for ~10–12 seats.
6. **Tile attributes:** pop, votes, muni (majority by pop), tier, outline = union of base hexes.
7. **Adjacency:** shared-edge via base-hex adjacency.
8. **Start districts:** assign tile to current ED containing majority of its pop; hand-fix contiguity/band.
9. **Ensemble:** GerryChain per ruleset.
10. **Real maps (info page analysis, M4):** rebuild majority / minority / panel maps from report boundary descriptions or georeferenced PDFs; score on the same 2023 allocation.

## 13. Tech stack

- **Pipeline:** Python 3.12, GeoPandas, shapely, numpy, networkx, scipy (`linear_sum_assignment`), GerryChain. Writes static JSON to `/boards`.
- **Front end:** Vite + React + TypeScript. Board rendered as **SVG** (fine at ≤100 tiles; easy hit-testing and a11y). State via `useReducer` or Zustand.
- **Game logic:** pure TS modules (`validate`, `score`, `swing`, `encode/decode`, `drift`), unit-tested with Vitest; mirrors Python logic; fixture parity test.
- **Art:** all SVG. One `icons.svg` sprite (`<symbol>`s: town, city, suburb, farm, pumpjack, mountain, salamander). Two stroke weights, flat fills, palette as CSS custom properties. Share card reuses the same components.
- **Mascot:** "the Dani-Mander" — cartoon salamander in a cowboy/hard hat; built from a few paths so its body can later be morphed to a district outline.
- **Hosting:** GitHub Pages via GitHub Action on push to `main`; custom domain `danimander.ca` with HTTPS; `dani-mander.ca` 301 at registrar.
- **No backend.**

### Accessibility
- Colour-blind-safe party pairs + pattern/glyph per tile.
- Keyboard play: arrows move tile focus; number keys / Enter assign to district.
- `aria-live` announcements for seat changes and validity.
- Tap targets ≥ 44px at the default zoom on a 375px-wide viewport.

### Repo layout
```
/pipeline
  board_w1.py         # silhouette, candidate layouts, filter
  board_w2.py
  board_w3/           # data pipeline (M3)
  solver.py           # enumeration, par, stats
  validate.py
/boards               # generated JSON (committed)
/web
  index.html
  /public             # og images, favicon
  /src
    /game             # validate.ts, score.ts, swing.ts, encode.ts, drift.ts
    /ui               # Board.tsx, Tile.tsx, Hud.tsx, PowerCards.tsx, Reveal.tsx, ShareCard.tsx
    /content          # world/task scripts (copy), info page (MDX)
    /assets           # icons.svg, font subset
    analytics.ts
/.github/workflows/deploy.yml
SPEC.md
```

## 14. Milestones

### M1 — World 1 + share (first release)
- World 1 board generated and validated by solver; par + solver stats in JSON.
- Board render, tap-tap + drag moves, validity display, undo/reset, ghost toggle, drift meter, Run Election, success copy, stars.
- Reveal screen.
- Share: static OG image, personal PNG card, native share / download / copy, URL-hash plans.
- Info page Layer 1 + Layer 2 timeline & process facts (no analysis).
- GoatCounter events.
- Deployed on `danimander.ca`.

**Acceptance:** a first-time player on a mid-range Android phone completes World 1 Task 1 in < 60s without instructions; share PNG renders with correct fonts on iOS Safari and Android Chrome; Lighthouse mobile performance ≥ 90; all validators pass in CI.

### M2 — World 2 + power cards + side-switch
### M3 — World 3 pipeline, board, both modes, ensemble reveal
### M4 — Info page analysis of the real majority / minority / panel maps

## 15. Open items / pre-launch checks

- Register `danimander.ca` + `dani-mander.ca`; grab `@danimander` handles.
- Confirm with Alberta's Voice whether the game needs third-party political advertising identification ("authorized by…") under Alberta election-finance rules given timing.
- Confirm 2023 PSD boundary vintage availability (M3).
- Confirm whether panel map exists as geodata or PDF/descriptions only (M4).
- Fact-check every receipt and source link immediately before launch (the situation is moving).
- Verify the Alberta tiger-salamander detail before using it in copy.

## 16. Working notes for Claude Code

- Start with **M1**. First task: `pipeline/solver.py` + `pipeline/board_w1.py` — generate and filter World 1 candidates; output `boards/w1.json`. Then the web scaffold.
- Keep game logic pure and tested; UI components thin.
- Never hard-code facts about Alberta in components — all copy lives in `/web/src/content` so it can be fact-checked in one place.
- Don't add dependencies beyond those listed without a reason in the PR description.
- Mobile portrait is the primary layout; test at 375×667.

## 17. Implementation notes (decisions that changed the spec)

- **Colours:** all worlds use Blue (#184484) vs Orange (#FF7300), named by colour only in World 1 and the daily; World 2 is Government (blue) vs Opposition (orange). Party palette is `parties[].color`.
- **Districts never disappear:** a district's last hex can't move; only ➕ Bonus Seat changes the count.
- **Daily puzzle:** generated in the browser from the Alberta date (`#daily=YYYY-MM-DD`). Two parts on the same votes and start map (pack + crack); the date picks which colour holds 60% and which part comes first. Par 3–6, goal maps <15%.
- **Hints:** World 1 / daily use full enumeration in the browser; World 2 ships known solutions (`solutions` in the board JSON) and hints point at power cards when a solution needs one.
- **Sharing:** the main share is paste-anywhere text (seat squares + move counts per puzzle + link); the PNG card is secondary.
- **World 2 board:** each city holds 14 hexes (two districts) so that the municipal lock caps the Government at the 3 rural seats; Task A needs 🚧 Erase the City Limits. A "scrutiny" cap (tiles changed vs baseline, `rules.driftCap`) blocks the election when exceeded, which is what 🔇 Skip the Hearings and 🗑️ Toss the Ref's Report get around. Task B asks the Opposition for 5 of 7 seats (a fair map already gives them a majority). No stars in World 2.
