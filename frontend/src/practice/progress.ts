/** Right and wrong counts: for a whole drill, or for one item of it (a pitch class, an interval). */
export type Tally = { attempts: number; correct: number };
export type DrillProgress = Tally & { bestStreak: number; items: Record<string, Tally> };
/** What the user has done in each drill, by drill id. Kept between visits. */
export type Progress = Readonly<Record<string, DrillProgress>>;

export const EMPTY_PROGRESS: Progress = {};

const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function parseTally(raw: unknown): Tally | null {
  if (!isRecord(raw)) return null;
  const { attempts, correct } = raw;
  return isCount(attempts) && isCount(correct) && correct <= attempts
    ? { attempts, correct }
    : null;
}

function parseItems(raw: unknown): Record<string, Tally> {
  if (!isRecord(raw)) return {};
  const tallies = Object.entries(raw).map(([key, value]) => [key, parseTally(value)] as const);
  return Object.fromEntries(tallies.filter((entry): entry is [string, Tally] => entry[1] !== null));
}

function parseDrill(raw: unknown): DrillProgress | null {
  const tally = parseTally(raw);
  if (!tally || !isRecord(raw) || !isCount(raw.bestStreak)) return null;
  return { ...tally, bestStreak: raw.bestStreak, items: parseItems(raw.items) };
}

/** Stored progress is outside data: a garbled drill or item is dropped, the rest is kept. */
export function parseProgress(raw: unknown): Progress {
  if (!isRecord(raw)) return EMPTY_PROGRESS;
  const drills = Object.entries(raw).map(([id, value]) => [id, parseDrill(value)] as const);
  return Object.fromEntries(
    drills.filter((entry): entry is [string, DrillProgress] => entry[1] !== null),
  );
}

const bump = (tally: Tally | undefined, correct: boolean): Tally => ({
  attempts: (tally?.attempts ?? 0) + 1,
  correct: (tally?.correct ?? 0) + (correct ? 1 : 0),
});

/** The progress after one answer. `streak` is the run of right answers including this one. */
export function recordAnswer(
  progress: Progress,
  drillId: string,
  itemKey: string,
  correct: boolean,
  streak: number,
): Progress {
  const old = progress[drillId];
  return {
    ...progress,
    [drillId]: {
      ...bump(old, correct),
      bestStreak: Math.max(old?.bestStreak ?? 0, streak),
      items: { ...old?.items, [itemKey]: bump(old?.items[itemKey], correct) },
    },
  };
}

export type Summary = { attempts: number; percent: number; bestStreak: number };

/** What the picker shows for a drill; null until the drill has been tried. */
export function summarise(drill: DrillProgress | undefined): Summary | null {
  if (!drill || drill.attempts === 0) return null;
  return {
    attempts: drill.attempts,
    percent: Math.round((100 * drill.correct) / drill.attempts),
    bestStreak: drill.bestStreak,
  };
}
