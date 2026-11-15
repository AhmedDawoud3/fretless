type RosetteProps = { cx: number; cy: number; r: number };

/** Latticed sound hole: a dark hole under a carved lattice ring and gold rings. */
export function Rosette({ cx, cy, r }: RosetteProps) {
  return (
    <g className="rosette">
      <circle cx={cx} cy={cy} r={r + 8} className="rosette-ring" />
      <circle cx={cx} cy={cy} r={r} fill="url(#oud-hole)" />
      <circle cx={cx} cy={cy} r={r * 0.78} fill="url(#oud-lattice)" className="rosette-lattice" />
      <circle cx={cx} cy={cy} r={r * 0.3} fill="url(#oud-hole)" />
    </g>
  );
}
