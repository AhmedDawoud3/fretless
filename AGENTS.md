# Fretless: rules for coding agents

This file is the single source of project rules. `CLAUDE.md` only imports it.
Nothing about this project may live only in an agent's private memory.

Read [docs/DESIGN.md](docs/DESIGN.md) for what is being built and why, and
[docs/GLOSSARY.md](docs/GLOSSARY.md) for domain terms. Use glossary terms in
code names; add a term there when you introduce one.

## Stack

- Backend: Python 3.13, uv, FastAPI. Package in `src/fretless/`, tests in `tests/`.
- Frontend: React, Vite, TypeScript strict, in `frontend/`. Tests beside source: `*.test.ts` for pure logic (runs in node, no DOM), `*.test.tsx` for anything touching the DOM (runs in jsdom). No wall-clock timing assertions in the suite.
- All music logic (tunings, maqam, chord voicing, tab conversion) lives in Python
  and is served as JSON. The frontend draws, plays sound, and listens to the
  microphone. It does not reimplement music logic.

## Commands

Run through `just`; CI runs the same recipes.

- `just check`: lint, type check, tests for both languages. Must pass before every commit.
- `just format`: apply ruff and Biome fixes.
- `just gen-api`: regenerate `frontend/src/api/schema.d.ts`. Run after any API change and commit the result.
- `just quality`: crapper, dryer, mutator.
- `just api` / `just web`: dev servers.

## Code rules

- Pitch is an integer count of quarter-tone steps from C0 (24 per octave) in
  Python, the API, and TypeScript. Cents and frequencies exist only at the
  browser edge (audio, microphone, continuous clicks).
- Domain types are frozen dataclasses with no FastAPI or Pydantic import.
  Pydantic and FastAPI appear only in the `fretless/api/` package, validate once at entry, and
  convert to domain types.
- Business logic is pure functions.
- Frontend API types come from `schema.d.ts`. Do not hand-write a type the API already defines.
- Python: ruff format, line 100, double quotes; lint rules in `pyproject.toml`; all
  functions annotated; ty must pass. No `# type: ignore`, no `# noqa` without a reason on the same line.
- TypeScript: Biome, strict; no `any`, no `@ts-ignore`, no non-null `!`.
- Add a dependency only when a few lines of own code cannot do the job.
- Never make a large files, always try to follow SOLID, and make smaller more manageable and readable files.

## Working method (ub-mode)

Every change, in this order:

1. Make it work
   - Get the data shape right before the logic.
   - Write the failing test first and see it fail for the expected reason.
   - Smallest change that passes. One decision lives in one place.
   - Tests call code the way its user does. Property tests (Hypothesis) for music math.
   - A new requirement that does not fit: redesign as if it had been there from the start, do not bolt on.
2. Make it right
   - `crapper`: every function under CRAP 10.
   - `dryer`: remove duplication scoring 0.8 or above.
   - `mutator`: cover the uncovered, kill survivors, delete dead code.
   - Refactor only with behaviour pinned by tests.
3. Practice
   - Append what you did and why to `docs/LOG.md`, newest entry at the bottom.
   - Small ordered commits straight to `main`, pushed at the end of the task.

## Commits

- Conventional Commits: `feat(neck): ...`, `fix(tab): ...`, `chore: ...`, `docs: ...`.
- Body says why, what changed, and how it was proved.
- No `Co-Authored-By`, no session links, no other AI attribution lines.
- No pre-commit hooks; CI on GitHub Actions is the gate.

## Orchestration

- The lead agent plans and assigns; it does not implement. Each plan is a
  self-contained unit handed to a subagent (Sonnet) to finish.
- A subagent owns only the paths named in its plan, commits only those paths,
  and does not push or edit `docs/LOG.md`. It reports log lines back; the lead
  appends them, runs `just check`, and pushes.
- Units that touch disjoint paths may run in parallel; otherwise in sequence.
