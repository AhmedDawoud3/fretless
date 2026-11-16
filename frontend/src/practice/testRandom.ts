/** A small repeatable random number generator in [0, 1) for tests (Park-Miller). */
export function seeded(seed: number): () => number {
  let state = Math.abs(Math.trunc(seed)) % 2147483646 || 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}
