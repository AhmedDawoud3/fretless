# Fretless

[![CI](https://github.com/AhmedDawoud3/fretless/actions/workflows/ci.yml/badge.svg)](https://github.com/AhmedDawoud3/fretless/actions/workflows/ci.yml)

Interactive oud learning tools for guitarists.

You know guitar chords and a few songs. The oud has no frets, is tuned mostly in
fourths, and plays quarter tones. Fretless shows you where everything you already
know lives on the oud neck.

## Status

Early scaffold. Nothing to play with yet. Planned, in order:

1. Interactive oud neck with quarter tones and 8 core maqamat
2. Guitar chord to oud voicing translator
3. Guitar tab to oud tab converter
4. Practice drills (find the note, ear training, microphone pitch check)
5. Guided course

See [docs/DESIGN.md](docs/DESIGN.md) for the decisions behind this.

## Run it

Needs [uv](https://docs.astral.sh/uv/), Node 24+, and
[just](https://just.systems/) (`uv tool install rust-just`).

```sh
just install
just api    # backend on http://127.0.0.1:8000
just web    # frontend on http://localhost:5173, in a second terminal
```

`just check` runs everything CI runs: lint, type check, tests.

## License

MIT
