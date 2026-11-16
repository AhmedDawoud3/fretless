import { expect, test } from "vitest";
import { acceptsReadings, gateAfterReference, REFERENCE_SECONDS } from "./gate";

test("while the reference plays, and 300 ms after it, readings are ignored", () => {
  const until = gateAfterReference(10_000);
  expect(until).toBe(10_000 + REFERENCE_SECONDS * 1000 + 300);
  expect(acceptsReadings(10_000, until)).toBe(false);
  expect(acceptsReadings(until - 1, until)).toBe(false);
  expect(acceptsReadings(until, until)).toBe(true);
});

test("with no reference played, readings are accepted", () => {
  expect(acceptsReadings(5, 0)).toBe(true);
});
