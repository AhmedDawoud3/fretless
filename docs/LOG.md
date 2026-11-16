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

## 2026-11-15: phase 1, units A2 (API split) and C (oud neck UI)

Unit A2, refactor:
- Split `api.py` into the `fretless/api/` package: `schemas.py`, `mappers.py`,
  `routes.py`, `__init__.py`. Import path `fretless.api:app` unchanged.
- `_scale_out` broken into degrees, scale-locations, and playback helpers.
- Proved unchanged: tests unmodified (39 pass), OpenAPI JSON byte-identical
  before and after, `schema.d.ts` regenerates with no diff.

Unit C, explorer page:
- Typed API client, note naming (C D E / Do Re Mi) with one accidental symbol
  map, virtual fret text, fretless string geometry, whole-oud SVG split into
  small drawing parts, press-to-play with snap or continuous pitch, readout
  with nearest note and cents, tuning switch, label modes, short "why" note,
  and a "run `just api`" message when the backend is down.
- Pure logic written test first; component tests mock only `fetch` and audio.
- Deviation: no inline-SVG accidentals. The Unicode half-flat and half-sharp
  render on this Windows machine (Segoe UI Symbol); other machines may show boxes.
- Deviation: added optional `rulerLabel` prop on `OudNeck` for fret numbers
  above guide marks, so the page never prints 100 labels.
- Fixed float artefact in fret text ("3.700000000000001") by rounding to two
  decimals, with a test that failed first.
- Checked in a real browser at 1700 px and 390 px. The saved screenshot predates
  the last small edits (peg colour, favicon, fret rounding).
- Lead reviewed the screenshot: reads as an oud. To polish: only 10 pegs drawn,
  fret label 7 hidden behind the body edge, awkward step at the neck joint,
  strings parallel with no taper.
- Not built: keyboard play of strings. Not verified: sound (nobody listened).

## 2026-11-15: phase 1, unit D (maqam explorer). Phase 1 feature-complete.

- Maqam picker (free play plus 8 maqamat, Arabic names), root picker with 24
  names taken from the neck, traditional-root button; scale refetched per
  maqam, root, and tuning.
- Overlay: pill markers, root in its own tone. A label that would overlap its
  neighbour on the same course falls back to the bare name, then to the dot.
- Playback up then down without repeating the top note, 60 to 240 notes per
  minute, active marker follows the note; stops on maqam/root/tuning change and
  on unmount. Stop fades over 30 ms.
- Explanation panel: description, note names, and gaps in guitar frets from one
  pure tested function (`stepsToFrets`).
- Settings (tuning, toggles, label mode, naming, maqam, root, tempo) stored
  under one `localStorage` key, validated field by field on read. This was the
  lead's addition, not an owner request.
- Oud drawing polish: 11 pegs on a tapering pegbox, fret numbers on dark pills,
  smooth shoulder. String taper skipped: hit-testing assumes fixed y per course.
- Pluck ring time left unchanged, deviating from the plan: at 44.1 and 48 kHz it
  already reaches -40 dB at about 1.9 s (65 Hz) and 1.0 s (880 Hz). The earlier
  short figures came from the 22.05 kHz rate used in unit tests. New tests at
  44.1 kHz pin the target; they were shown to fail when ring time was cut.
- Verified in headless Edge through the DevTools protocol (Playwright tools
  would not connect): Rast on C in C-C, and Hijaz playing in F-F. Lead checked
  every Rast marker in the screenshot against the scale by hand: all correct.
- Lead's remaining visual note: the half-flat glyph is hard to tell from a flat
  at marker size.
- Not verified: sound and stop fade (nobody listened), 390 px layout with the
  new controls. If the maqam list fails to load, maqam controls silently do
  not appear.

## 2026-11-15: phase 2, unit E (chords backend)

- Chord model (16 qualities, spelling, essential roles, arpeggio), guitar
  tunings and shapes with capo, chord identification from a shape, oud
  voicings, and four endpoints: `/api/chords/qualities`,
  `/api/chords/{root}/{quality_id}`, `/api/guitar/tunings`,
  `POST /api/guitar/identify`. Existing endpoint shapes unchanged.
- Letter-stepping speller moved from `maqam` to `pitch.spell_above`, shared by
  scales and chords. Maqam tests unchanged.
- API package gained `names`, `playback` (scale playback and arpeggio share one
  mapping), and `lookup`. `fingering.py` split out of `voicing.py`.
- Voicing rules: 2 to 4 notes on contiguous courses, root and colour tone
  required, seventh required from 3 notes up, stopped notes within 8 steps,
  same-position notes on adjacent courses count as one finger. Score is
  hand-tuned and marked with a `ponytail:` comment.
- `/identify` takes strings and frets string 1 (highest) first, the reverse of
  a chord chart read left to right.
- Mutation testing showed the property tests proved returned voicings valid but
  not that valid ones are returned; completeness tests added. Remaining
  survivors are equivalent mutants.
- Lead checked the top voicings for C, Am, G7, D (C-C) and C (F-F) by hand
  against the tunings: notes correct, shapes within a 3-fret reach.
- Known weakness: top results are often near-duplicates (one note moved an
  octave); no diversity rule yet. Barre model is stricter than a real hand.
  No player has tried the voicings on an instrument.

## 2026-11-15: phase 2, unit F (chords page). Phase 2 feature-complete.

- Chords page added as a second tab (`role="tablist"`, no router); chosen page
  saved in settings.
- Shared oud settings owned by `useSharedSettings`; `saveSettings` takes a patch
  so pages do not overwrite each other's keys.
- Name picker (12 roots spelled from the oud neck, quality select), clickable
  guitar neck reusing the oud fret geometry, tuning presets, per-string custom
  tuning, capo, identify call, ranked matches as buttons.
- Oud result: voicing cards (first selected automatically), all-chord-tones
  view, arpeggio, short explanation.
- Shared with the maqam page rather than copied: `usePlayback` (now generic),
  `labelledMarkers` (collision-aware labels), `rulerLabelFor`, `useRequest`.
- `playStrum` added to audio (35 ms between notes), because `playSteps`'s
  `when` is an absolute AudioContext time the page cannot read.
- Failed list loads and identify calls now show `role="alert"`.
- Deviations: capo drawn at the nut with frets counted from it; guitar fret
  cells are SVG `role="button"` with a justified Biome ignore; chord and shape
  selection are not saved between visits.
- Process slip: component tests were written after the components, so the
  "see it fail" step was skipped for them. Pure logic was test first.
- Verified in headless Edge: C major entered as x32010 names C major and shows
  the first voicing; all-chord-tones view; both pages at 390 px with no
  overflow. Lead checked the screenshot: guitar shape, sounding notes, and oud
  markers all correct.
- Known weaknesses: 72 tab stops on the guitar neck; identify has no debounce;
  large empty band around the oud at 390 px; voicing list still shows
  near-duplicates. Custom tuning, capo, and arpeggio highlight were exercised
  by tests only, not in the browser. Sound unheard.

## 2026-11-15: phase 3, unit G (tab parser and renderer)

- New pure package `src/fretless/tab/`: model, line classifier, column
  extraction, parser, widening, renderer. No API and no conversion yet.
- Parsing never raises. Runs of 4 to 7 tab lines become systems; everything
  else stays verbatim as text; CRLF handled.
- Fret rule lives in one function, `split_frets`, marked `ponytail:`: two
  adjacent digits are one fret only if the first is 1 or 2 and the value is at
  most 24.
- Widening is a pure function inserting dashes in every line at once, so cells
  never overlap and columns stay aligned. Hypothesis round trip (render, parse,
  same notes, labels, bar count) holds.
- Deviations: a line needs at least 2 dashes to count as tab; `render_document`
  accepts text, tab, and render blocks; `render_model.py` and `widen.py` split
  out to keep files small.
- Mutator covered all six files; only survivors are 3 equivalent mutants in
  `widen.py`.
- Not handled: two systems pasted with no blank line between them stay as text
  (queued for the next unit); repeat marks; comments glued to the last bar;
  technique symbols are dropped rather than preserved. Only the two example
  systems were tried, no tab pasted from a real site.

## 2026-11-16: phase 3, unit H (tab conversion and API)

The agent hit the usage limit mid-unit and was resumed from its saved state.

- Parser: a run of 12 to 60 tab lines that is a multiple of 6 now splits into
  6-line systems.
- New pure modules in `src/fretless/tab/`: `events`, `transpose`, `placement`,
  `reduce`, `options`, `costs`, `path`, `convert_model`, `alterations`,
  `convert`, `oud_render`, `playback`.
- Conversion: one whole-piece octave shift, then single notes folded into
  range. Per event a ladder: all notes, inner-note octave moves, duplicate
  pitch classes dropped, inner notes dropped, top note alone. A Viterbi search
  picks fingerings by hand movement. Weights are named constants in `costs.py`
  marked `ponytail:`.
- `POST /api/tab/convert` with schemas, mappers, routes in `tab_*.py`. String
  and capo validation shared with identify. 2,000 events convert in under 1 s.
- Deviations: octave moves tried on any unplaceable set, not only same-course
  conflicts; systems carry an `index` field; "keep highest and lowest
  instances" read as top note, bottom note, and lowest instance of each other
  pitch class.
- Only `frets` mode output re-parses; `names` and `both` do not, because the
  parser rejects most letters inside tab content.
- Lead checked the sample output by hand: every single note lands on the right
  course and fret. Chord result is doubtful: x32010 kept all 5 notes as two
  barres at frets 5 and 7, where a 3 or 4 note open shape is far easier. A cap
  of 4 notes per chord is queued as a follow-up.
- Mutator: partial. `events`, `oud_render`, `playback` 100%; `costs` 94%;
  `reduce` 91%; `convert` 83%; `transpose` 81%; `placement` 80%;
  `alterations` 73%; `path` 67% (tie-break survivors not killed). API modules
  not mutated.
- Process slips reported by the agent: parser fix first committed half applied,
  then amended; some test edits broken by shell escaping and repaired by hand.
- Not verified: no tab pasted from a real site; fingering not tried by a player.
