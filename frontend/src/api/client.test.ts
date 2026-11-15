import { afterEach, expect, test, vi } from "vitest";
import {
  fetchChord,
  fetchGuitarTunings,
  fetchMaqamat,
  fetchNeck,
  fetchQualities,
  fetchScale,
  fetchTunings,
  identifyShape,
} from "./client";

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

test("fetchQualities and fetchGuitarTunings read their lists", async () => {
  const fetchMock = stubFetch({ ok: true, json: async () => [] });
  await fetchQualities();
  await fetchGuitarTunings();
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "/api/chords/qualities",
    "/api/guitar/tunings",
  ]);
});

test("fetchChord asks for the root, quality and oud tuning", async () => {
  const fetchMock = stubFetch({ ok: true, json: async () => ({}) });
  await fetchChord(4, "m7", "ff");
  expect(fetchMock).toHaveBeenCalledWith("/api/chords/4/m7?tuning=ff");
});

test("identifyShape posts the shape as JSON and returns the answer", async () => {
  const answer = { notes: [], matches: [] };
  const fetchMock = stubFetch({ ok: true, json: async () => answer });
  const body = { strings: [64], capo: 2, frets: [null] };
  expect(await identifyShape(body)).toEqual(answer);
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe("/api/guitar/identify");
  expect(init).toMatchObject({ method: "POST", body: JSON.stringify(body) });
  expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
});

test("identifyShape throws on a rejected shape", async () => {
  stubFetch({ ok: false, status: 422 });
  await expect(identifyShape({ strings: [], capo: 0, frets: [] })).rejects.toThrow("422");
});
