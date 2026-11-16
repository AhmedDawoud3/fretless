import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../App";
import { playSequence, playStrum } from "../audio";
import { stubApi } from "../testApi";

vi.mock("../audio", () => ({ playSteps: vi.fn(), playSequence: vi.fn(), playStrum: vi.fn() }));

beforeEach(() => {
  vi.mocked(playSequence).mockReset();
  vi.mocked(playStrum).mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openChords() {
  const fetchMock = stubApi();
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Chords" }));
  await screen.findByRole("group", { name: "Chord root" });
  return fetchMock;
}

const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const oudMarkers = (selector = ".marker") =>
  screen.getByRole("img", { name: /oud/i }).querySelectorAll(selector);

/** x32010: string 6 muted, then strings 5 to 1 at 3, 2, open, 1, open. */
function enterC() {
  press("String 6 nut: open");
  press("String 5, fret 3");
  press("String 4, fret 2");
  press("String 2, fret 1");
}

const identifyBodies = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls
    .filter(([url]) => url === "/api/guitar/identify")
    .map(([, init]) => JSON.parse(String(init?.body)));

test("two tabs switch the page, and the page chosen is remembered", async () => {
  stubApi();
  const first = render(<App />);
  const tabs = await screen.findAllByRole("tab");
  expect(tabs.map((t) => t.textContent)).toEqual(["Maqam explorer", "Chords"]);
  expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");

  fireEvent.click(await screen.findByRole("tab", { name: "Chords" }));
  await screen.findByRole("group", { name: "Chord root" });
  first.unmount();

  render(<App />);
  expect(await screen.findByRole("group", { name: "Chord root" })).toBeDefined();
});

test("chords can be picked by name: twelve roots and a quality showing its symbol", async () => {
  await openChords();
  const roots = within(screen.getByRole("group", { name: "Chord root" })).getAllByRole("button");
  expect(roots).toHaveLength(12);
  const quality = screen.getByLabelText("Quality") as HTMLSelectElement;
  expect([...quality.options].map((o) => o.textContent)).toEqual(["major — C", "minor 7th — Cm7"]);
});

test("a loaded chord shows its first voicing on the oud and in the explanation", async () => {
  await openChords();
  const voicings = await screen.findByRole("list", { name: "Voicings" });
  const cards = within(voicings).getAllByRole("button");
  expect(cards).toHaveLength(2);
  expect(cards[0]?.getAttribute("aria-pressed")).toBe("true");
  expect(cards[0]?.textContent).toContain("root in bass");
  expect(oudMarkers()).toHaveLength(2);
  expect(oudMarkers(".marker-root")).toHaveLength(1);
  expect(screen.getByText(/Notes: C root, /)).toBeDefined();
  expect(playStrum).not.toHaveBeenCalled();
});

test("choosing a voicing shows its notes and strums them low to high", async () => {
  await openChords();
  const cards = within(await screen.findByRole("list", { name: "Voicings" })).getAllByRole(
    "button",
  );
  fireEvent.click(cards[1] as HTMLElement);
  expect(cards[1]?.getAttribute("aria-pressed")).toBe("true");
  expect(playStrum).toHaveBeenCalledTimes(1);
  const pitches = vi.mocked(playStrum).mock.calls[0]?.[0] ?? [];
  expect(pitches).toEqual([...pitches].sort((a, b) => a - b));
});

test("switching to all chord tones shows every tone, the root apart", async () => {
  await openChords();
  await screen.findByRole("list", { name: "Voicings" });
  press("All chord tones");
  expect(screen.queryByRole("list", { name: "Voicings" })).toBeNull();
  expect(oudMarkers()).toHaveLength(3);
  expect(oudMarkers(".marker-root")).toHaveLength(1);
});

test("play arpeggio plays the chord's arpeggio and marks the note sounding", async () => {
  await openChords();
  await screen.findByRole("list", { name: "Voicings" });
  vi.mocked(playSequence).mockReturnValue({ stop: vi.fn(), done: new Promise<void>(() => {}) });
  press("Play arpeggio");
  const [pitches] = vi.mocked(playSequence).mock.calls[0] ?? [];
  expect(pitches).toHaveLength(4);
  expect(screen.getByRole("button", { name: "Stop" })).toBeDefined();
});

test("clicking the shape x32010 asks the API and names it C major", async () => {
  const fetchMock = await openChords();
  enterC();
  expect(await screen.findByRole("button", { name: "C major" })).toBeDefined();
  expect(identifyBodies(fetchMock).at(-1)).toEqual({
    strings: [104, 94, 86, 76, 68, 56],
    capo: 0,
    frets: [0, 1, 0, 2, 3, null],
  });
});

test("a match with another bass or missing tones says so", async () => {
  await openChords();
  enterC();
  expect(await screen.findByRole("button", { name: "Am7/C (no fifth)" })).toBeDefined();
});

test("choosing a match selects that chord and loads its voicings", async () => {
  const fetchMock = await openChords();
  enterC();
  fireEvent.click(await screen.findByRole("button", { name: "Am7/C (no fifth)" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/chords/18/m7?tuning=cc"));
  expect((screen.getByLabelText("Quality") as HTMLSelectElement).value).toBe("m7");
  expect(await screen.findByRole("heading", { name: /minor 7th/ })).toBeDefined();
});

test("a shape that is no chord says so plainly", async () => {
  await openChords();
  press("String 3, fret 5");
  expect(await screen.findByText(/No chord I know/)).toBeDefined();
});

test("pressing the same spot again lifts the finger, and the nut control mutes", async () => {
  const fetchMock = await openChords();
  press("String 3, fret 5");
  press("String 3, fret 5");
  press("String 1 nut: open");
  await waitFor(() =>
    expect(identifyBodies(fetchMock).at(-1)?.frets).toEqual([null, 0, 0, 0, 0, 0]),
  );
});

test("a capo is sent with the shape, and frets are counted from it", async () => {
  const fetchMock = await openChords();
  fireEvent.change(screen.getByLabelText("Capo"), { target: { value: "3" } });
  press("String 2, fret 1");
  await waitFor(() => {
    const last = identifyBodies(fetchMock).at(-1);
    expect([last?.capo, last?.frets[1]]).toEqual([3, 1]);
  });
});

test("tuning one string by a semitone names the note and switches the preset to Custom", async () => {
  const fetchMock = await openChords();
  const preset = screen.getByLabelText("Guitar tuning") as HTMLSelectElement;
  expect(preset.value).toBe("standard");
  press("String 6 up a semitone");
  expect(preset.value).toBe("custom");
  await waitFor(() => expect(identifyBodies(fetchMock).at(-1)?.strings[5]).toBe(58));
  fireEvent.change(preset, { target: { value: "dropd" } });
  expect(preset.value).toBe("dropd");
});

test("Clear puts every finger back", async () => {
  const fetchMock = await openChords();
  enterC();
  press("Clear");
  await waitFor(() => expect(identifyBodies(fetchMock).at(-1)?.frets).toEqual([0, 0, 0, 0, 0, 0]));
});

test("the guitar Strum plays the sounding notes low to high", async () => {
  await openChords();
  enterC();
  await screen.findByRole("button", { name: "C major" });
  press("Strum");
  const pitches = vi.mocked(playStrum).mock.calls.at(-1)?.[0] ?? [];
  expect(pitches).toHaveLength(5);
  expect(pitches).toEqual([...pitches].sort((a, b) => a - b));
});

test("the oud tuning is shared: set on one page, kept on the other, and used for chords", async () => {
  const fetchMock = await openChords();
  fireEvent.change(screen.getByLabelText("Tuning"), { target: { value: "ff" } });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/chords/0/major?tuning=ff"));
  fireEvent.click(screen.getByRole("tab", { name: "Maqam explorer" }));
  expect((screen.getByLabelText("Tuning") as HTMLSelectElement).value).toBe("ff");
});

test("when the chord lists cannot load, the page says so", async () => {
  const working = stubApi();
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url === "/api/chords/qualities") throw new TypeError("offline");
    return working(url, init);
  });
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Chords" }));
  expect((await screen.findByRole("alert")).textContent).toContain("chord lists");
});

test("the guitar tuning and capo are remembered on the next visit", async () => {
  await openChords();
  fireEvent.change(screen.getByLabelText("Capo"), { target: { value: "3" } });
  press("String 6 up a semitone");
  cleanup();

  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Chords" }));
  expect(((await screen.findByLabelText("Capo")) as HTMLInputElement).value).toBe("3");
  expect((screen.getByLabelText("Guitar tuning") as HTMLSelectElement).value).toBe("custom");
});
