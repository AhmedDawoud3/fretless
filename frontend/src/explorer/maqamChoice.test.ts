import { expect, test } from "vitest";
import { bayati, rast } from "../testApi";
import { resolveChoice } from "./maqamChoice";

test("no maqam, or an unknown one, is free play", () => {
  expect(resolveChoice([rast], null, 3)).toBeNull();
  expect(resolveChoice([rast], "gone", null)).toBeNull();
});

test("the root is the chosen one, else the maqam's traditional root", () => {
  expect(resolveChoice([rast, bayati], "bayati", null)).toEqual({ maqam: bayati, root: 4 });
  expect(resolveChoice([rast, bayati], "bayati", 9)).toEqual({ maqam: bayati, root: 9 });
});
