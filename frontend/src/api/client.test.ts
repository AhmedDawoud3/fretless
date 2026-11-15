import { afterEach, expect, test, vi } from "vitest";
import { fetchMaqamat, fetchNeck, fetchScale, fetchTunings } from "./client";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response: Partial<Response>) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

test("fetchTunings returns the parsed list", async () => {
  stubFetch({ ok: true, json: async () => [{ id: "cc", label: "C-C" }] });
  expect(await fetchTunings()).toEqual([{ id: "cc", label: "C-C" }]);
});

test("fetchNeck asks for the given tuning", async () => {
  const fetchMock = stubFetch({ ok: true, json: async () => ({}) });
  await fetchNeck("ff");
  expect(fetchMock).toHaveBeenCalledWith("/api/neck/ff");
});

test("a non-OK response throws", async () => {
  stubFetch({ ok: false, status: 500 });
  await expect(fetchTunings()).rejects.toThrow("500");
});

test("fetchMaqamat returns the parsed list", async () => {
  const fetchMock = stubFetch({ ok: true, json: async () => [{ id: "rast" }] });
  expect(await fetchMaqamat()).toEqual([{ id: "rast" }]);
  expect(fetchMock).toHaveBeenCalledWith("/api/maqamat");
});

test("fetchScale asks for the maqam, root and tuning", async () => {
  const fetchMock = stubFetch({ ok: true, json: async () => ({}) });
  await fetchScale("rast", 7, "ff");
  expect(fetchMock).toHaveBeenCalledWith("/api/maqamat/rast/scale?root=7&tuning=ff");
});
