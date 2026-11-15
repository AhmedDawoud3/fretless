function Stop({ at, color }: { at: string; color: string }) {
  return <stop offset={at} style={{ stopColor: `var(${color})` }} />;
}

/** Gradients shared by the drawing parts; colours come from CSS custom properties. */
export function Defs() {
  return (
    <defs>
      <linearGradient id="oud-neck-wood" x1="0" y1="0" x2="0" y2="1">
        <Stop at="0" color="--wood-light" />
        <Stop at="0.5" color="--wood-mid" />
        <Stop at="1" color="--wood-dark" />
      </linearGradient>
      <linearGradient id="oud-ebony" x1="0" y1="0" x2="0" y2="1">
        <Stop at="0" color="--ebony-light" />
        <Stop at="1" color="--ebony" />
      </linearGradient>
      <radialGradient id="oud-soundboard" cx="0.55" cy="0.45" r="0.7">
        <Stop at="0" color="--spruce-light" />
        <Stop at="1" color="--spruce-dark" />
      </radialGradient>
      <radialGradient id="oud-hole" cx="0.5" cy="0.5" r="0.5">
        <Stop at="0" color="--ebony" />
        <Stop at="1" color="--hole-edge" />
      </radialGradient>
      <pattern
        id="oud-lattice"
        width="10"
        height="10"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="10" height="10" fill="var(--hole-edge)" />
        <path d="M0 5H10M5 0V10" className="lattice-line" />
      </pattern>
    </defs>
  );
}
