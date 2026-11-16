import { expect, test } from "vitest";
import { placeForKey } from "./useOptionKeys";

const key = (k: string, extra: Partial<KeyboardEventInit> = {}) =>
  new KeyboardEvent("keydown", { key: k, ...extra });

test("keys 1 to 9 give the place 0 to 8", () => {
  expect([1, 5, 9].map((n) => placeForKey(key(String(n)), 9))).toEqual([0, 4, 8]);
});

test("a key past the last option, a non-number key or 0 gives nothing", () => {
  expect([placeForKey(key("6"), 5), placeForKey(key("a"), 9), placeForKey(key("0"), 9)]).toEqual([
    null,
    null,
    null,
  ]);
});

test("a number typed with Ctrl, Alt or Meta is not an answer", () => {
  expect(placeForKey(key("1", { ctrlKey: true }), 9)).toBeNull();
  expect(placeForKey(key("1", { altKey: true }), 9)).toBeNull();
  expect(placeForKey(key("1", { metaKey: true }), 9)).toBeNull();
});
