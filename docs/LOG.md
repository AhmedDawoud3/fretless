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

## 2026-11-16: phase 3, units I (chord reduction fixes) and J (converter page). Phase 3 feature-complete.

Unit I, backend, three rounds:
- A converted chord has at most 4 notes. Within a size, sets with the most
  distinct pitch classes are tried, then cheapest placement. `_smaller_easy`
  (marked `ponytail:`) takes a one-note-smaller set when the larger one needs a
  position above 10 steps.
- Whole-piece shift was too eager: one out-of-range bass note moved everything.
  The lead's original rule was at fault. Now `best_shift` moves the piece only
  if that rescues more than 25% of all notes (`SHIFT_GAIN`, `ponytail:`);
  otherwise stray notes fold one by one.
- Bug found by the lead reading the agent's pasted output against its claim:
  022100 lost its third when it followed a G chord, because the path search
  chose between different note sets. Now `options()` returns only fingerings of
  one note set decided per event; the path search picks fingering only. Failing
  test and Hypothesis property written first.
- A general "third is kept" property was tried and is false (equal-class sets
  tie on cost); concrete C, G, E, F tests in both tunings stand instead.
- Known: 320003 lands at fret 7 because its top note exists only there.

Unit J, frontend:
- Third page "Tab converter": paste box, example loader, convert on button,
  re-convert when tunings, capo, or output mode change. Summary in plain words,
  list of changes, copy button, explanation panel.
- Guitar tuning and capo are one shared persisted setting (`useGuitarTuning`)
  for the Chords and converter pages. Pasted text persisted up to 200,000
  characters. Output mode is its own setting.
- Playback: `playTimed` in audio (chords strummed), `useRunner` shared by
  `usePlayback` and `useTabPlayer`, gap cap of 16 ticks. Current column marked
  exactly via `cells.ts`; a system whose text does not match gets no highlight.
- Component tests were written first this time and seen failing.
- Process slips reported by the agent: two commits amended after a failing
  test and a type error; its process cleanup matched 14 PIDs by command line
  and may have killed unrelated Edge processes.
- Verified in headless Edge: convert, playback with marked column and oud
  marker, 390 px. Lead checked the playback screenshot: marked cell and oud
  marker agree (A3, course 2 fret 2).
- Tests only, not browser: column click, 422 alert, copy, over-limit message.
  Not done: tab pasted from a real site; sound unheard.

## 2026-11-16: phase 4 groundwork, units K (intervals) and L (pitch detection core)

Unit K, backend:
- `interval.py`: unison to octave plus 5 quarter-tone intervals (3, 7, 11, 17,
  21 steps), difficulty levels 1 to 4, `interval_between`. `GET /api/intervals`.
- The quarter-tone set is derived from `MAQAMAT` roots by a test, not guessed.
  The 11-step interval (in Sikah) was not in the plan; the agent named it
  "Wide fourth" itself. Name needs a musician's judgement.
- Fret wording now exists in Python; the frontend `stepsToFrets` is a duplicate
  queued for removal.
- Mutator: 6 of 6 killed.

Unit L, frontend `listen/`:
- YIN `detectPitch`, `createTracker` smoother, `compareToTarget`,
  `nearestStep`, `frequencyToSteps`, `useMicrophone`. No page yet.
- Worst error on synthetic signals (sines, weak fundamental, paired strings,
  noise at -20 dB, decay) and on the project's own Karplus-Strong pluck: 1.41
  cents. About 4 ms per 4096-sample frame.
- Tracker shows a pitch only after 3 agreeing frames, so a lone octave glitch
  never shows; a real slide lags 3 frames.
- Deviation: `frequencyToSteps` lives in `listen/steps.ts`, though it arguably
  belongs beside `stepsToFrequency` in `audio/`.
- Speed test takes the best of five batches; a single average was flaky under
  parallel test workers.
- Not verified: no real microphone and no real oud. The capture loop
  (`openMicrophone.ts`, `startListening.ts`) has never run in a browser.
  Tracker thresholds are guesses to tune against real input.

## 2026-11-16: phase 4, unit M (practice page, part 1)

- Fourth page "Practice": drill picker with per-drill stats, shared shell
  (prompt, answer, feedback, Next, streak, score), difficulty per drill,
  reset with confirm.
- Framework: a drill is a pure `makeQuestion` and `check` plus a `View`;
  `defineDrill` and one line in `registry.ts` plug it in. Progress and levels
  live in the validated settings key. `pickWeighted` gives unseen items weight
  4 and always-right items 1, never zero.
- Drills: Find the note, Interval by ear, Echo (hear it, find it). Echo was the
  lead's addition, not an owner request.
- Removed the duplicate `stepsToFrets`; the maqam panel now reads fret wording
  from `/api/intervals`, loaded once in `useSharedSettings`.
- Lead's error: the plan's example said a perfect fifth is "3½ frets". It is 7
  frets (14 steps / 2). The agent followed the API, not the example.
- Sequential seeds in the first seeded-random helper gave near-identical
  values and made property tests useless; replaced with mulberry32.
- Tests first for pure logic, shell, Find, Interval, and page. The Echo view
  test was written before the view but not run before it existed.
- Process slip: one commit went in with two red tests (chained after a failing
  check); fixed in a following commit, not amended.
- Verified in headless Edge at 1400 px: picker, Find after a wrong press,
  Interval after answering, Echo hint, number-key answer. At 390 px only the
  picker and Find. The screenshots read predate the last fix commit.
- Known: Snap checkbox still shown on Practice though Find and Echo force snap;
  level 4 interval drill has 18 options but number keys cover 9; flats in
  level 2 untested because the test neck has only sharps; note gaps (0.9 s,
  1 s) are guesses; sound unheard. `just check` timed out once under load and
  passed on rerun.
- Environment: an older backend process was holding port 8000 without the
  intervals endpoint; the agent left it alone and used other ports.

## 2026-11-16: phase 4, unit N (practice page, part 2) and unit O (flaky suite). Phase 4 feature-complete.

Unit N, two drills on the existing framework:
- Maqam by ear: level-to-maqam sets in one constant, three levels, random
  twelve-tone roots at the top level, number keys, scale shown after answering.
- Play it on your oud: target note, tuner meter (-50 to +50 cents), wording
  from one pure function, hold of 500 ms to pass, octave-tolerant, "Hear it"
  reference with the microphone gated while it plays, skip not counted, free
  Tuner mode with open-course chips. Peg wording added for open courses, since
  "slide towards the bridge" is wrong with no finger down.
- Contract changes: `DrillContext.maqamat`, `DrillViewProps.onSkip`; the
  microphone drill wraps the shell in `MicScope` so the microphone stays open
  across questions. Existing drills unchanged.
- Snap checkbox hidden on Practice (every drill forces it).
- First real run of the capture loop: headless Edge with a fake capture device
  fed generated WAV files. In-tune D3 read -0.02 cents and passed after the
  hold; a file 30 cents flat read -30.02 and never passed; a non-matching
  target named the heard note.
- Bug found only in the browser: "Maximum update depth exceeded" at 390 px,
  because the hold state machine lived in React state. Moved out of state.
- Component tests were written first but run only against missing modules, so
  they failed for that reason, not on behaviour.
- Not verified: real microphone, real oud, real room noise; sound output; the
  "Hear it" gate and hold in a browser (mocked time only). Tracker thresholds
  remain guesses.

Unit O, test suite stability:
- Lead measured the suite flaking: 6, 1, then 0 failures in three runs. Causes:
  a wall-clock speed assertion, and Testing Library's 1000 ms async default
  timing out while every test file paid for a jsdom environment (70 to 78% of
  run time). Reproduction found no real bug behind the timeouts.
- Vitest split into `node` (`*.test.ts`) and `dom` (`*.test.tsx`) projects;
  `asyncUtilTimeout` 5000 ms in `src/testSetup.ts`; `testTimeout` 15000 ms.
  Three DOM-using `.test.ts` files renamed `.test.tsx`.
- Wall-clock `detectPitch` speed test deleted; no honest proxy exists.
- Suite went from about 60 s to about 36 s. 8 of 8 clean runs and 3 of 3 runs
  under CPU load passed; lead's own two further runs passed.
- Convention recorded in AGENTS.md.

## 2026-11-16: phase 5 (guided course) and phase 6 (audio to oud via Basic Pitch)

Phase 5, Guided Course:
- New pure domain module `src/fretless/course.py` returning 7 progressive
  guitar-to-oud lessons (`open-courses`, `first-position`, `quarter-tone`,
  `maqam-rast`, `maqam-bayati`, `maqam-hijaz`, `oud-cadence`) mapped to the
  requested oud tuning.
- Added `GET /api/courses` (`course_schemas.py`, `course_mappers.py`,
  `course_routes.py`).
- Frontend Course page (`frontend/src/course/`): lesson picker with completion
  badges, guitarist tips, step-by-step neck verification (`snap` forced on),
  reference playback via `usePlayback` (structural `Entry` type shared with
  maqam/chords), and `completedLessons` persisted in `localStorage` with two-step
  reset reusing `ResetProgress`.

Phase 6, Audio to Oud (Spotify Basic Pitch):
- Added `numpy`, `onnxruntime`, and `soundfile` to `pyproject.toml`, and vendored
  Spotify's `nmp.onnx` (`basic-pitch` 0.4.0, 230 KB) into `src/fretless/audio/`
  because `basic-pitch`/`tensorflow` lacks Python 3.13 wheels.
- `src/fretless/audio/`: `decode.py` (MP3/WAV/OGG/FLAC -> mono 22.05 kHz,
  max 180 s), `inference.py` (2-second sliding window with 30-frame overlap),
  `notes.py` (onset peak tracing and 24-TET quarter-tone mapping from contour
  bins centered at `3 * freq_idx + 1`, tolerance `±2` bins; empirically verified
  24/24 quarter-tone accuracy across C4..B+4 against `nmp.onnx`), `arrange.py`
  (chord clustering within 60 ms, column spacing, and shared `place_events`
  Viterbi oud placement from `fretless.tab.convert`).
- Added `POST /api/audio/transcribe` (`audio_schemas.py`, `audio_routes.py`,
  reusing `convert_placed_out` in `tab_mappers.py`). Regenerated
  `frontend/src/api/schema.d.ts` via `just gen-api`.
- Frontend Audio to Oud page (`frontend/src/transcribe/`): file upload (`.mp3`,
  `.wav`, `.ogg`, `.flac`, `.m4a`, 12 MB client limit), deterministic synthesized
  Maqam Rast WAV example (`exampleWav.ts`), `<audio>` player bar for the
  original recording, sensitivity slider, shared `useConvertReply` request hook
  (`convertState.ts`), and `TabResult` for Oud tab, alterations, Karplus-Strong
  synth playback, and synchronized neck markers.

Quality & checks:
- `dryer --threshold 0.8`: no duplicate candidates found.
- Refactored `AudioPage`, `LessonView`, `CoursePage`, `courseProgress`,
  `AudioControls`, `useTranscription`, and `arrange.py` after `crapper` flagged
  higher branching counts; `crapper` still sees 0% coverage on Windows, while
  `pytest --cov` measured 91–100% across the new Python modules.
- Not verified: live browser run against real MP3 songs or listening to audio
  output by ear.

## 2026-11-16: dark studio UI/UX makeover & dual-track tab studio

Backend:
- Extended `ConvertOut` in `src/fretless/api/tab_schemas.py` and
  `src/fretless/api/tab_mappers.py` with `guitar_systems` and `guitar_playback`
  so the source guitar tab can be played, stepped, and visualized on the guitar
  neck alongside the converted oud arrangement. Regenerated `schema.d.ts`.

Audio engine:
- Added `renderGuitarPluck` in `frontend/src/audio/pluck.ts` (single steel-string
  model sharing `renderString`) and `Instrument` timbre selection + voice
  choking (`activeVoices`) in `frontend/src/audio/player.ts`.

Neck viewport & Studio shell:
- Replaced the fixed 1620 px scroll trap with responsive `100%` SVG sizing and
  a `neckZoom` setting (`Fingerboard` zoom `170 125 710 215` default vs.
  `Full oud` `0 0 1620 480`), updating `toDrawingPoint` in `pointer.ts` to map
  through the active `viewBox` while preserving 1:1 full-canvas test mocks.
- Added open-course tuning badges at the nut and a live hover ghost fret pill on
  `OudNeck`.
- Rebuilt all 7 CSS sheets (`app.css`, `neck.css`, `tab.css`, `guitar.css`,
  `audio.css`, `practice.css`, `course.css`) in a dark obsidian-slate studio
  palette (`#0b0d12` / `#121620` / `#38d9c0` / `#f5b942` / `#f06449`), unified
  top header, 2-column Chords studio with collapsible string fine-tuning,
  clickable `ScaleRibbon` degree pills on Maqam Explorer, and drag-and-drop
  upload zone on Audio to Oud.

Dual-track Tab Studio & Neck-to-Tab Editor:
- Added `VisualTabStaff.tsx` (Songsterr-style clickable 6-line column staff),
  `tabEdit.ts` (`toggleGuitarNote`, `placeOudNote`, `renderOudSystemText`,
  `systemsToPlayback`), `Oud track` / `Guitar track` switcher, `Edit on neck` +
  `+ New column`, `Previous` / `Next` event buttons, `Loop`, event scrubber,
  and `ArrowLeft`/`ArrowRight` stepping in `useTabPlayer.ts` / `TabPlayer.tsx` /
  `TabResult.tsx`.

Quality & checks:
- `just check`: ruff format/check, Biome lint (294 files), `ty check`, `tsc -b`,
  `pytest` (304 passed), and `vitest run` (79 files, 492 passed) all passed.
- `dryer --threshold 0.8`: no duplicate candidates found.
- Not verified: visual layout or audio playback by ear in a live browser.

## 2026-11-16: Ultimate Guitar, Songsterr, PDF, and chord-sheet tab import

Backend:
- Added `pymupdf>=1.25.0` to `pyproject.toml`.
- Added `src/fretless/tab/tuning_parse.py` (`parse_tuning_spec`,
  `extract_tuning_from_text`, shared `parse_note_token`) so written tunings
  like `DGBDGA`, `CFCGCD`, `E A D G B E`, and `{tuning: Standard (EADGBE)}`
  resolve to 6 string-1-first quarter-tone pitches.
- Added `src/fretless/tab/chords.py` (`parse_chord_symbol`,
  `guitar_chord_frets`, `clean_ug_markup`, `expand_chord_sheet`) to strip
  Ultimate Guitar `[tab]`/`[ch]` tags and convert pasted chord sheets or
  ChordPro lines into playable 6-line guitar tab systems.
- Added `src/fretless/tab/import_model.py` (`ImportedTab`) and
  `src/fretless/tab/pdf_import.py` (`import_pdf_bytes`) supporting vector
  6-line guitar TAB PDFs, plain ASCII tab PDFs, and chord-annotated score PDFs
  (verified against synthetic PDFs and sample PDFs in `D:\Misc\Tabs`).
- Added `src/fretless/tab/url_import.py` (`import_tab_url`, `parse_ug_html`,
  `render_songsterr_track`) to import tabs and chord sheets from Ultimate
  Guitar (`js-store` metadata) and Songsterr (`/api/meta/{songId}`, CloudFront
  track JSON, `/api/chords/{songId}`, and `.chordpro`).
- Added `POST /api/tab/import-url` and `POST /api/tab/import-pdf` endpoints in
  `src/fretless/api/tab_schemas.py` and `src/fretless/api/tab_routes.py`, plus
  chord-sheet fallback expansion in `POST /api/tab/convert`. Regenerated
  `frontend/src/api/schema.d.ts`.

Frontend:
- Updated `frontend/src/api/client.ts` (unifying 422 error handling in
  `postJson` and adding `importTabUrl` / `importTabPdf`),
  `frontend/src/chords/useGuitarTuning.ts` (`setStrings`), and added
  `frontend/src/tab/TabImportBar.tsx` inside `TabInput.tsx` / `TabView.tsx` to
  import URLs (`Auto`, `Tab`, or `Chords`) or `.pdf` files, apply detected
  guitar tuning/capo, and convert immediately.

Quality & checks:
- `just check`: ruff format/check (109 files), Biome lint (296 files), `ty check`,
  `tsc -b`, `pytest` (322 passed), and `vitest run` (80 files, 496 passed) all
  passed.
- `dryer --threshold 0.8`: no duplicate candidates found.
- `crapper`: verified cyclomatic complexity `< 10` on all newly added functions
  after decomposing `url_import.py`, `pdf_import.py`, `chords.py`, and
  `TabImportBar.tsx`.
- Not verified: importing in a live browser UI (backend live URLs and PDFs were
  smoke-checked from Python; frontend tested against `stubApi` mocks).

## 2026-11-16: 5-line sheet music PDF import support

- Added `src/fretless/tab/pdf_geometry.py` (shared staff/segment extraction and
  quantized rendering extracted from `pdf_import.py`) and
  `src/fretless/tab/sheet_import.py` (`extract_sheet_systems`) to read 5-line
  standard notation staves from PDFs (SMuFL, Finale Maestro, and filled/stroked
  vector ovals), apply treble/treble-8vb/bass clefs, key signatures, and
  barline-scoped accidentals (including quarter-tone glyphs), and map notes and
  chord stacks onto 6-string guitar tabs.
- Updated `import_pdf_bytes` in `src/fretless/tab/pdf_import.py` and
  `ImportPdfIn` / `ImportKind` (`"auto" | "tab" | "chords" | "sheet"`) in
  `src/fretless/api/tab_schemas.py` & `tab_routes.py`, regenerated `schema.d.ts`,
  and added the `Sheet music` option to `frontend/src/tab/TabImportBar.tsx`.
- Verified with synthetic vector-oval/SMuFL tests and real PDFs in `D:\Misc\Tabs`
  (`Longa Riyad - Piano Chords.pdf` and `أغدًا ألقاك` 5-line notation staff):
  all checks pass (`ruff`, `biome`, `ty check`, `tsc -b`, `pytest`, `vitest`,
  `dryer`).
