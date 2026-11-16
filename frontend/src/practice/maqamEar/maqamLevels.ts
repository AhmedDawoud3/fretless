const LEVEL_1 = ["ajam", "nahawand", "hijaz"];
const LEVEL_2 = [...LEVEL_1, "kurd", "rast", "bayati"];

/**
 * The maqam ids heard at each difficulty. 1: three that sound unlike one another. 2: adds Kurd,
 * Rast and Bayati (Rast and Bayati bring quarter tones). 3: all eight.
 */
export const MAQAM_LEVELS: Readonly<Record<number, readonly string[]>> = {
  1: LEVEL_1,
  2: LEVEL_2,
  3: [...LEVEL_2, "saba", "sikah"],
};
