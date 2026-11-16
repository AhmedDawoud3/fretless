import { expect, test } from "vitest";
import { MAQAMAT } from "../../testApi";
import { MAQAM_LEVELS } from "./maqamLevels";

const listed = MAQAMAT.map((m) => m.id);

test.each([1, 2, 3])("level %i names only maqamat the API lists", (level) => {
  for (const id of MAQAM_LEVELS[level] ?? []) expect(listed).toContain(id);
});

test("each level adds to the one before; level 3 is all eight", () => {
  const [one, two, three] = [1, 2, 3].map((l) => MAQAM_LEVELS[l] ?? []);
  expect(one).toEqual(["ajam", "nahawand", "hijaz"]);
  expect(two).toEqual(expect.arrayContaining([...(one ?? [])]));
  expect(two).toEqual(expect.arrayContaining(["kurd", "rast", "bayati"]));
  expect([...(three ?? [])].sort()).toEqual([...listed].sort());
});
