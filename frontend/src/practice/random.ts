/** The item a random number in [0, 1) points at. `random` is injected so tests are repeatable. */
export function pick<T>(items: readonly T[], random: () => number): T {
  const item = items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  if (item === undefined) throw new RangeError("nothing to pick from");
  return item;
}
