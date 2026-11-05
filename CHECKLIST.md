# Pre-launch checklist (M1)

## Facts — `web/src/content/info.ts`
Every claim has sources; all were opened and read on 2026-11-05 except where noted. Items marked `verify:` in the file need a human:

- [ ] **Bill 31 municipal/community-boundary change** — confirm wording against the statute (SA 2024 c 17; CanLII blocks automated fetches). The government fact sheet only says the factors were "updated and clarified"; the CTV article body couldn't be read automatically. Used in the timeline and the 🚧 card.
- [ ] **Who nominated Evans and Martin** — the final report lists members but not nominators; attribution comes from Sherwood Park News.
- [ ] **"First time in history"** — sourced to Lethbridge Herald reporter narration (Apr 30, 2026). Consider a second source.
- [ ] Re-run `npm run check-links` and re-read the timeline right before launch — the situation is moving (committee report tabled Nov 2026; map not yet law).

## Legal / distribution
- [ ] Confirm with Alberta's Voice whether third-party political advertising identification ("authorized by…") is needed.
- [ ] Register `danimander.ca` + `dani-mander.ca` (301 at registrar); grab `@danimander` handles.
- [ ] **Create the `danimander` GoatCounter site** — until then analytics requests get HTTP 400 and nothing is counted.
- [ ] Send the Alberta's Voice signup/campaign URL for the "What you can do" section.
- [ ] Poll figures (Probe Research, May 2026, online panel — no margin of error) are quoted from the report's charts: 68% / 66% UCP (AI5b), 64% (AI5c). Re-check if a newer poll lands.
- [ ] GitHub repo → Settings → Pages → Source: GitHub Actions; set custom domain + enforce HTTPS.

## QA
- [ ] Share PNG on real iOS Safari and Android Chrome (native share sheet with file; fallback download).
- [ ] First-time player completes World 1 Task 1 in < 60 s without instructions (hallway test).
- [ ] Lighthouse mobile ≥ 90 on the deployed site (local preview: perf 100, a11y 100).

## Known UI limits
- [ ] World 2 hexes are ~36px wide on 360×640 phones (56px at 412×780) — below the 44px target only on the smallest screens.
