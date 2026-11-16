/** What conversion does to fit a guitar tab on the oud, and what it cannot keep. */
export function TabExplanation() {
  return (
    <section className="why" aria-label="How the converter works">
      <h2>How the converter works</h2>
      <p>
        The oud has a smaller range than a guitar. If the piece does not fit, the whole piece moves
        up or down by octaves. A single note that still does not fit moves an octave on its own. A
        big chord that cannot be played is simplified: it keeps the top note (the melody) and the
        bass, and leaves out inner notes. Then the easiest hand position is picked, so the hand
        moves as little as possible.
      </p>
      <p>
        Slides, bends and hammer-ons are dropped, and rhythm is approximate: a text tab only shows
        how far apart notes are written.
      </p>
    </section>
  );
}
