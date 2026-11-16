# Design

Decisions taken before the first line of code, and why. Change this file when a
decision changes.

## Who it is for

One guitarist who knows chord shapes and songs, has no formal theory, plays oud
by ear, and wants to carry guitar knowledge over to the oud. Single user, runs
locally. English interface, with Arabic maqam and note names shown alongside.
Note names switch between C D E and Do Re Mi.

## Phases

Each phase is usable alone and is reused by the next.

1. **Neck and maqam.** Interactive oud neck, quarter tones, 8 maqamat (Rast,
   Bayati, Hijaz, Nahawand, Kurd, Saba, Ajam, Sikah) in any root, with playback.
   Short "why" notes beside each tool.
2. **Chords.** Enter a guitar chord by name or by clicking its shape on a guitar
   neck (tuning presets, per-string custom tuning, capo). Output: all chord
   tones on the oud neck, plus suggested playable 2 to 4 note voicings.
3. **Tab converter.** ASCII guitar tab in, oud tab out. Out-of-range notes shift
   by octaves, chords reduce to playable voicings, every alteration is flagged.
   Fingering prefers low positions and minimal hand movement. Playback uses
   column spacing as rough timing, with a tempo slider. PDF and other inputs later.
4. **Drills.** Find the note on the neck; identify a note or interval by ear;
   identify a maqam by ear; microphone pitch check against a real oud.
5. **Course.** Seven progressive guitar-to-oud lessons computed in Python for the
   active tuning, with interactive neck step checks, reference playback, and
   progress kept in browser localStorage.
6. **Audio to Oud.** MP3/WAV/OGG/FLAC audio transcription powered by Spotify's
   Basic Pitch ONNX model (`nmp.onnx`) in Python, mapping contour pitch bends to
   24-TET quarter tones and arranging detected notes/chords onto the oud with the
   shared Viterbi pathfinder.

Later, not scheduled: full maqam system (ajnas, modulation, regional intonation).

## Oud model

- Tunings: C-C (C2 F2 A2 D3 G3 C4) and F-F (F2 A2 D3 G3 C4 F4).
- Range: about a fifth per course, an octave on the top course, matching where
  the neck meets the body.
- Fretless: clicks are continuous, with an optional snap to the quarter-tone grid.
- Intonation: 24 equal steps per octave. Simple and exact; real maqam intonation
  varies by region and is deferred with the full maqam system.
- Tab display: virtual fret numbers (1.5 for quarter tones), note names, or both.
- Drawing: hand-coded stylized-realistic SVG of the whole instrument, horizontal,
  pegbox left, lowest course at the bottom (same order as tab lines), doubled courses.

## Pitch representation

One integer: quarter-tone steps above C0. Exact arithmetic, no float comparison,
and a tab position is a plain subtraction. Cents and frequencies exist only in
the browser, where audio and the microphone need them.

If regional intonation arrives, it is added as a display/audio offset on top of
the integer grid, not by changing this type.

## Architecture

- **Python owns music logic**, served by FastAPI as JSON. The author reads
  Python, and later PDF parsing belongs there.
- **Domain core is pure**: frozen dataclasses and pure functions, no framework
  imports. Pydantic validates once at the API edge.
- **Browser owns interaction**: React + TypeScript draws SVG, synthesizes plucked
  strings with Web Audio (no sample files), and does microphone pitch detection.
- **API types are generated** from the FastAPI OpenAPI schema, so each data shape
  is defined once.
- **Progress is stored in browser localStorage.** No database, no accounts.

## Tooling

| Concern | Choice |
| --- | --- |
| Python env and deps | uv, Python 3.13 |
| Python lint and format | ruff |
| Python types | ty |
| Python tests | pytest, Hypothesis |
| Frontend | React, Vite, TypeScript strict, npm |
| Frontend lint and format | Biome |
| Frontend tests | Vitest, Testing Library |
| Task runner | just |
| CI | GitHub Actions; no pre-commit hooks |
| Quality tools | crapper, dryer, mutator, run locally |
| License | MIT |

Not used, on purpose: database, authentication, pre-commit hooks, Dependabot,
browser end-to-end tests. Add when a real need appears.
