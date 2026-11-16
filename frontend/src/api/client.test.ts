import { afterEach, expect, test, vi } from "vitest";
import {
  type ConvertBody,
  convertTab,
  fetchChord,
  fetchCourses,
  fetchGuitarTunings,
  fetchIntervals,
  fetchMaqamat,
  fetchNeck,
  fetchQualities,
  fetchScale,
  fetchTunings,
  identifyShape,
  type TranscribeBody,
  transcribeAudio,
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

const convertBody: ConvertBody = {
  text: "e|--0--|",
  guitar: { strings: [104, 99, 94, 88, 83, 76], capo: 0 },
  oud_tuning: "cc",
  mode: "frets",
};

test("convertTab posts the tab as JSON and returns the conversion", async () => {
  const answer = { text: "x", systems: [] };
  const fetchMock = stubFetch({ ok: true, status: 200, json: async () => answer });
  expect(await convertTab(convertBody)).toEqual({ rejected: false, converted: answer });
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe("/api/tab/convert");
  expect(init).toMatchObject({ method: "POST", body: JSON.stringify(convertBody) });
  expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
});

test("convertTab reports a 422 as rejected, not as a failure", async () => {
  stubFetch({ ok: false, status: 422 });
  expect(await convertTab(convertBody)).toEqual({ rejected: true });
});

test("convertTab throws on any other failure", async () => {
  stubFetch({ ok: false, status: 500 });
  await expect(convertTab(convertBody)).rejects.toThrow("500");
});

test("fetchIntervals asks for the interval list", async () => {
  const fetchMock = stubFetch({ ok: true, json: async () => [{ id: "octave" }] });
  expect(await fetchIntervals()).toEqual([{ id: "octave" }]);
  expect(fetchMock).toHaveBeenCalledWith("/api/intervals");
});

test("fetchCourses asks for lessons in the given tuning", async () => {
  const fetchMock = stubFetch({ ok: true, json: async () => [{ id: "open-courses" }] });
  expect(await fetchCourses("ff")).toEqual([{ id: "open-courses" }]);
  expect(fetchMock).toHaveBeenCalledWith("/api/courses?tuning=ff");
});

const transcribeBody: TranscribeBody = {
  audio_base64: "AAAA",
  oud_tuning: "cc",
  mode: "frets",
  onset_threshold: 0.5,
  frame_threshold: 0.3,
};

test("transcribeAudio posts audio as JSON and handles 200 and 422", async () => {
  const answer = { text: "x", systems: [] };
  const fetchMock = stubFetch({ ok: true, status: 200, json: async () => answer });
  expect(await transcribeAudio(transcribeBody)).toEqual({ rejected: false, converted: answer });
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe("/api/audio/transcribe");
  expect(init).toMatchObject({ method: "POST", body: JSON.stringify(transcribeBody) });

  stubFetch({ ok: false, status: 422 });
  expect(await transcribeAudio(transcribeBody)).toEqual({ rejected: true });
});
