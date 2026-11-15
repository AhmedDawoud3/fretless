/** Guitar-style fret number: position / 2, so a quarter tone reads 1.5. */
export function formatVirtualFret(position: number): string {
  return String(Math.round(position * 50) / 100);
}
