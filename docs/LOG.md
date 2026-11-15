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

## 2026-11-15: phase 1, units A (backend) and B (audio)

Work is now planned by the lead agent and implemented by subagents (see
AGENTS.md, Orchestration). Units A and B ran in parallel on disjoint paths.

Unit A, backend:
- `pitch.py`, `tuning.py`, `neck.py`, `maqam.py` as pure frozen dataclasses and
  functions; `api.py` with Pydantic only at the edge. Tests first; Hypothesis
  covers pitch round trip, neck range, `lowest_location`, and spelling of all
  8 maqamat on all 24 roots.
- Added `pitch.spell(pitch, letter, alter)`, not in the plan: picks the octave
  so a B raised or C lowered across an octave boundary still names its pitch.
- Scale endpoint's `tuning` query defaults to `cc`.
- `playback[].location` is nullable in the schema but never null with the two
  shipped tunings, so no test exercises null.
- Glossary: fixed C4 = 96 (was wrongly 192), added Location, Pitch class,
  Letter, Alter, Degree.
- dryer found one duplicate (two 404 lookups), merged into `_find`.
- mutator, run per file with `--no-coverage --mutate-all --test-command
  "uv run pytest -x -q tests" --max-workers 1`: 35 killed, 2 survivors, both
  equivalent mutants.
- Maqam descriptions were written by the agent and not yet read by a musician.

Unit B, audio:
- `frontend/src/audio`: `stepsToFrequency`, pure Karplus-Strong `renderPluck`,
  thin Web Audio player. Player untested (jsdom has no Web Audio); its timing
  maths is in the tested pure `schedule.ts`.
- Each course renders as two strings detuned 3 cents either way.
- All-pass fractional delay replaced linear interpolation, which killed high
  notes too fast. Noise burst is mean-removed and output DC-blocked, because a
  DC offset silenced the oscillation.
- Buffers cached per 0.1 step, capped at 64 entries.
- Not verified: nobody has listened to the sound; measured decay (0.5 to 1 s)
  is shorter than the 1.5 to 2 s target. `player.ts` has not run in a browser.
- mutator is unreliable for TypeScript on this Windows machine (`os.killpg`
  missing, cp1252 errors): no mutation evidence for the audio code.

Owner added a rule to AGENTS.md: small files, SOLID. `api.py` (220 lines) is
queued for a split.
