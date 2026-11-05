# Dani-Mander

*Why let voters pick their MLA when the MLA can pick their voters?*

A mobile-first browser game about gerrymandering and Alberta's electoral boundaries. See [SPEC.md](SPEC.md).

## Layout

- `pipeline/` — Python board generator, partition solver, validator
- `boards/` — generated board JSON (committed) + TS parity fixtures
- `web/` — Vite + React + TypeScript game

## Pipeline

```sh
cd pipeline
uv venv --python 3.12 .venv && uv pip install --python .venv -r requirements.txt
.venv/bin/python board_w1.py            # search layouts; writes out/w1_candidates.txt + ../boards/w1.json
.venv/bin/python board_w1.py --pick 3   # use a different candidate from the report
.venv/bin/python validate.py --write-fixtures
```

## Web

```sh
cd web
npm install
npm run dev     # http://localhost:5173
npm test
npm run build
```

Pushes to `main` deploy to GitHub Pages (`.github/workflows/deploy.yml`).
