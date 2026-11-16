/** How long the synth reference rings. Matches the note length of the synth in `audio`. */
export const REFERENCE_SECONDS = 2.5;
/** The room keeps ringing a little after the speaker stops. */
const SETTLE_MS = 300;

/** The time (ms) until which readings are ignored after a reference starts at `now`. */
export function gateAfterReference(now: number): number {
  return now + REFERENCE_SECONDS * 1000 + SETTLE_MS;
}

/** False while the app's own speaker may be what the microphone hears. */
export function acceptsReadings(now: number, gateUntil: number): boolean {
  return now >= gateUntil;
}
