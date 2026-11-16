import { expect, test } from "vitest";
import { GREEN_ZONE, needlePercent } from "./needle";

test("the needle is at the middle for 0 cents and at the ends for -50 and +50", () => {
  expect([-50, 0, 50].map(needlePercent)).toEqual([0, 50, 100]);
});

test("the needle sits proportionally between", () => {
  expect(needlePercent(25)).toBe(75);
  expect(needlePercent(-10)).toBe(40);
});

test("beyond 50 cents either way the needle stops at the end", () => {
  expect([-300, -50.1, 50.1, 1e9].map(needlePercent)).toEqual([0, 0, 100, 100]);
});

test("the green zone is the middle 30 percent, for 15 cents each side", () => {
  expect(GREEN_ZONE).toEqual({ left: 35, width: 30 });
});
