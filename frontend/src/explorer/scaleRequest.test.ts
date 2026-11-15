import { expect, test } from "vitest";
import { rast, scaleFor } from "../testApi";
import { answerFor, scaleRequest } from "./scaleRequest";

const choice = (root: number) => ({ maqam: rast, root });

test("a request needs a maqam (with its root) and a tuning", () => {
  expect(scaleRequest(choice(0), "cc")).toMatchObject({ id: "rast", root: 0, tuningId: "cc" });
  expect(scaleRequest(null, "cc")).toBeNull();
  expect(scaleRequest(choice(0), null)).toBeNull();
});

test("an answer counts only for the request it was made for", () => {
  const request = scaleRequest(choice(0), "cc");
  const loaded = { key: "rast|0|cc", scale: scaleFor(rast, 0) };
  expect(answerFor(loaded, request)).toBe(loaded);
  expect(answerFor(loaded, scaleRequest(choice(8), "cc"))).toBeNull();
  expect(answerFor(loaded, null)).toBeNull();
  expect(answerFor(null, request)).toBeNull();
});
