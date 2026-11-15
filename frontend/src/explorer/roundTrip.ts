/** Up through the items and back down, without playing the top one twice. */
export function roundTrip<T>(items: readonly T[]): T[] {
  return [...items, ...items.slice(0, -1).reverse()];
}
