# Log

What was done and why. Newest entry at the bottom.

## 2026-11-15: scaffold

- Settled product and engineering decisions in two interview rounds; recorded in
  `docs/DESIGN.md` so they do not depend on anyone's memory.
- `uv init --package`, Python 3.13 pinned: keeps system Python untouched.
- Wrote `tests/test_api.py` first, saw it fail on missing `fretless.api`, then
  added the `/api/health` endpoint. Proves the FastAPI wiring end to end.
- Scaffolded `frontend/` from the Vite react-ts template. Removed template demo
  content, images, CSS, and oxlint (Biome replaces it).
- Wrote `App.test.tsx` first, saw it fail on the template App, then replaced App
  with a heading.
- Vite proxies `/api` to the backend so the frontend uses same-origin URLs.
- `openapi-typescript` is run through `npx` at a pinned version instead of being
  a dev dependency: it requires TypeScript 5 as a peer and the project uses
  TypeScript 7.
- `justfile` holds every command once; CI calls `just install` and `just check`.
  Recipes use `npm --prefix` rather than `cd` so they run the same in pwsh and sh.
- `AGENTS.md` holds all project rules; `CLAUDE.md` is a one-line import of it.
- Added `just coverage` (LCOV for both languages) and pointed crapper at it,
  because crapper's built-in coverage step looks for `python3` and fails on
  this Windows machine.
- Known issue: crapper still reports 0% coverage although `coverage.lcov` and
  `frontend/coverage/lcov.info` show the lines as hit (paths use backslashes;
  suspected path-matching problem in crapper on Windows). CRAP scores are
  therefore pessimistic until that is fixed. Both functions score 2.0.
- dryer: no duplicates. mutator: no mutation sites yet.
- Fix: `just check` failed once `frontend/coverage/` and `frontend/openapi.json`
  existed, because Biome linted generated files. Biome now reads the root
  `.gitignore`, so "generated, do not check" is decided in one place.
  Proved by running `just check` with both generated files present: exit 0.
