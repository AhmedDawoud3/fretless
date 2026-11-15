import type { Maqam } from "../api/client";

export type Selection = { maqam: Maqam; root: number };

/** The chosen maqam (unknown ids mean free play) and its root: the chosen one, else the traditional. */
export function resolveChoice(
  maqamat: readonly Maqam[],
  maqamId: string | null,
  rootChoice: number | null,
): Selection | null {
  const maqam = maqamat.find((m) => m.id === maqamId);
  return maqam ? { maqam, root: rootChoice ?? maqam.default_root } : null;
}
