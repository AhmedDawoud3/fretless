import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../App";
import { playStrum, playTimed } from "../audio";
import { stubApi } from "../testApi";
import { CONVERTED } from "./convertedFixture";

vi.mock("../audio", () => ({
  playSteps: vi.fn(),
  playSequence: vi.fn(),
  playStrum: vi.fn(),
  playTimed: vi.fn(),
}));

const stop = vi.fn();
const timed = vi.mocked(playTimed);
let finish: () => void = () => {};

beforeEach(() => {
  stop.mockClear();
  vi.mocked(playStrum).mockClear();
  timed.mockReset();
  timed.mockImplementation(() => ({
    stop,
    done: new Promise<void>((resolve) => {
      finish = resolve;
    }),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function converted() {
  stubApi();
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Tab converter" }));
  fireEvent.change(await screen.findByLabelText("Guitar tab"), { target: { value: "e|--0--|" } });
  fireEvent.click(screen.getByRole("button", { name: "Convert" }));
  return screen.findByRole("region", { name: "Converted tab" });
}

const activeMarkers = () =>
  screen.getByRole("img", { name: /oud/i }).querySelectorAll(".marker-active");
const highlighted = (output: HTMLElement) =>
  [...output.querySelectorAll("mark")].map((m) => m.textContent);
const cellOf = (output: HTMLElement, key: string) => {
  const cell = output.querySelector(`[data-event="${key}"]`);
  if (!cell) throw new Error(`no cell ${key}`);
  return cell;
};
/** The playback callback for event `index`, as the audio timer would call it. */
const reach = (index: number) => act(() => timed.mock.calls[0]?.[2]?.(index));

test("Play sends the events with times from their ticks, then becomes Stop", async () => {
  await converted();
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  const [events, end] = timed.mock.calls[0] ?? [];
  expect(events?.map((e) => e.steps)).toEqual([[102], [86, 106]]);
  // 120 notes a minute, three characters a note: a tick is 1/6 s; the chord is 2 ticks on.
  expect(events?.[1]?.at).toBeCloseTo(1 / 3);
  expect(end).toBeCloseTo(1 / 3 + 1);
  expect(screen.getByRole("button", { name: "Stop" })).toBeDefined();
});

test("the speed slider scales the times, and is called Speed", async () => {
  await converted();
  fireEvent.change(screen.getByLabelText(/Speed/), { target: { value: "240" } });
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  expect(timed.mock.calls[0]?.[0][1]?.at).toBeCloseTo(1 / 6);
  expect(screen.getByText(/no real rhythm/)).toBeDefined();
});

test("while playing, the current event shows on the oud and in the tab", async () => {
  const output = await converted();
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  expect(activeMarkers()).toHaveLength(0);

  reach(0);
  expect(activeMarkers()).toHaveLength(1);
  expect(highlighted(output)).toEqual(["3"]);

  reach(1);
  expect(activeMarkers()).toHaveLength(2);
  expect(highlighted(output)).toEqual(["5", "0"]);
});

test("Stop stops the sound and puts Play back; so does the end of the piece", async () => {
  await converted();
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  expect(stop).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Play" })).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  await act(async () => finish());
  expect(screen.getByRole("button", { name: "Play" })).toBeDefined();
});

test("changing the text, a setting, or the page stops playback", async () => {
  await converted();
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  fireEvent.change(screen.getByLabelText("Guitar tab"), { target: { value: "e|--1--|" } });
  expect(stop).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  fireEvent.change(screen.getByLabelText("Capo"), { target: { value: "2" } });
  await screen.findByRole("region", { name: "Converted tab" });
  expect(stop).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  fireEvent.click(screen.getByRole("tab", { name: "Chords" }));
  expect(stop).toHaveBeenCalledTimes(3);
});

test("clicking a column in the tab shows that event on the oud and plays it once", async () => {
  const output = await converted();
  fireEvent.click(cellOf(output, "0:4"));
  expect(playStrum).toHaveBeenCalledWith([86, 106]);
  expect(activeMarkers()).toHaveLength(2);
  expect(highlighted(output)).toEqual(["5", "0"]);
  expect(timed).not.toHaveBeenCalled();
});

test("clicking an alteration with a place does the same", async () => {
  const output = await converted();
  const list = screen.getByRole("region", { name: "What changed" });
  fireEvent.click(within(list).getByRole("button", { name: /system 1, column 2/ }));
  expect(playStrum).toHaveBeenCalledWith([86, 106]);
  expect(highlighted(output)).toEqual(["5", "0"]);
  expect(within(list).queryByRole("button", { name: /whole piece/ })).toBeNull();
});

test("Guitar track switches to Guitar neck & visual guitar staff and plays guitar timbre", async () => {
  await converted();
  fireEvent.click(screen.getByRole("button", { name: "Guitar track" }));
  expect(screen.getByTitle(/Guitar neck/i)).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  expect(timed.mock.calls[0]?.[0].map((e) => e.steps)).toEqual([[106], [90, 114]]);
  expect(timed.mock.calls[0]?.[3]).toBe("guitar");
});

test("Previous/Next event buttons step through visual staff columns", async () => {
  await converted();
  fireEvent.click(screen.getByRole("button", { name: "Next event" }));
  expect(playStrum).toHaveBeenCalledWith([102]);
  expect(screen.getByText(/Event 1\/2/)).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Next event" }));
  expect(playStrum).toHaveBeenCalledWith([86, 106]);
  expect(screen.getByText(/Event 2\/2/)).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Previous event" }));
  expect(screen.getByText(/Event 1\/2/)).toBeDefined();
});

test("Edit on neck writes guitar frets directly back into the source tab", async () => {
  await converted();
  fireEvent.click(screen.getByRole("button", { name: "Guitar track" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit on neck" }));
  fireEvent.click(screen.getByRole("button", { name: "String 1, fret 3" }));
  const box = screen.getByLabelText("Guitar tab") as HTMLTextAreaElement;
  expect(box.value).toContain("3");
});

test("VisualTabStaff displays technique suffixes on both Oud and Guitar tracks", async () => {
  const fetchMock = stubApi();
  const base = fetchMock.getMockImplementation();
  fetchMock.mockImplementation((async (url: string, init?: RequestInit) => {
    if (url === "/api/tab/convert") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ...CONVERTED,
          systems: [{ ...CONVERTED.systems[0], techniques: { "1:2": "h", "1:4": "/" } }],
          guitar_systems: [
            { ...CONVERTED.guitar_systems[0], techniques: { "1:2": "h", "1:4": "/" } },
          ],
        }),
      };
    }
    return base?.(url, init);
  }) as NonNullable<typeof base>);

  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Tab converter" }));
  fireEvent.change(await screen.findByLabelText("Guitar tab"), { target: { value: "e|--1h--|" } });
  fireEvent.click(screen.getByRole("button", { name: "Convert" }));

  const staff = await screen.findByRole("region", { name: "Interactive visual tab" });
  expect(within(staff).getByText("3h")).toBeDefined();
  expect(within(staff).getByText("5/")).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Guitar track" }));
  expect(within(staff).getByText("1h")).toBeDefined();
  expect(within(staff).getByText("5/")).toBeDefined();
});

test("clicking a note then Play starts playback from that note instead of the beginning", async () => {
  const output = await converted();
  fireEvent.click(cellOf(output, "0:4"));
  fireEvent.click(screen.getByRole("button", { name: "Play" }));

  const [events] = timed.mock.calls[0] ?? [];
  expect(events).toEqual([{ at: 0, steps: [86, 106] }]);

  reach(0);
  expect(highlighted(output)).toEqual(["5", "0"]);
  expect(activeMarkers()).toHaveLength(2);
  expect(screen.getByText(/Event 2\/2/)).toBeDefined();
});

test("clicking Stop while Loop is on does not immediately restart playback", async () => {
  await converted();
  fireEvent.click(screen.getByRole("button", { name: "Loop" }));
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  expect(timed).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  await act(async () => finish());
  expect(timed).toHaveBeenCalledTimes(1);
});

test("playback and note selection never call scrollIntoView on the page viewport", async () => {
  const scrollSpy = vi.fn();
  const original = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scrollSpy;
  try {
    const output = await converted();
    fireEvent.click(cellOf(output, "0:4"));
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    reach(0);
    expect(scrollSpy).not.toHaveBeenCalled();
  } finally {
    HTMLElement.prototype.scrollIntoView = original;
  }
});

test("VisualTabStaff renders measure structure, quarter-tone styling, and no floating rest dots", async () => {
  const fetchMock = stubApi();
  const base = fetchMock.getMockImplementation();
  fetchMock.mockImplementation((async (url: string, init?: RequestInit) => {
    if (url === "/api/tab/convert") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ...CONVERTED,
          text: [
            "C|--1.5-|---5-|",
            "F|------|-----|",
            "A|------|---0-|",
            "D|------|-----|",
            "G|------|-----|",
            "C|------|-----|",
          ].join("\n"),
          systems: [
            {
              ...CONVERTED.systems[0],
              bars: [6],
              columns: [
                { index: 2, notes: [{ course: 1, position: 3, pitch: 99, name: "C+" }] },
                {
                  index: 10,
                  notes: [
                    { course: 1, position: 10, pitch: 106, name: "A" },
                    { course: 3, position: 0, pitch: 86, name: "A" },
                  ],
                },
              ],
            },
          ],
        }),
      };
    }
    return base?.(url, init);
  }) as NonNullable<typeof base>);

  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Tab converter" }));
  fireEvent.change(await screen.findByLabelText("Guitar tab"), { target: { value: "e|--1.5--|" } });
  fireEvent.click(screen.getByRole("button", { name: "Convert" }));

  const staff = await screen.findByRole("region", { name: "Interactive visual tab" });
  expect(staff.querySelectorAll(".vtab-rest")).toHaveLength(0);
  expect(staff.querySelectorAll(".vtab-measure")).toHaveLength(2);
  expect(staff.querySelectorAll(".vtab-note-quarter")).toHaveLength(1);
  expect(staff.querySelectorAll(".vtab-note-open")).toHaveLength(1);

  const ascii = screen.getByRole("region", { name: "Converted tab" });
  expect(ascii.querySelectorAll(".ascii-label").length).toBeGreaterThanOrEqual(6);
  expect(ascii.querySelectorAll(".ascii-rail").length).toBeGreaterThanOrEqual(6);
  expect(ascii.querySelectorAll(".ascii-bar").length).toBeGreaterThanOrEqual(12);
  expect(ascii.querySelectorAll(".ascii-note-quarter")).toHaveLength(1);
});

test("visual and ASCII tabs provide zoom, spacing, follow, and expand controls", async () => {
  await converted();

  const staff = screen.getByRole("region", { name: "Interactive visual tab" });
  const vTools = within(screen.getByRole("toolbar", { name: "Visual tab controls" }));
  fireEvent.click(vTools.getByRole("button", { name: "Zoom in visual tab" }));
  expect(staff.style.getPropertyValue("--vtab-zoom")).toBe("1.1");
  fireEvent.click(vTools.getByRole("button", { name: "Reset visual tab zoom" }));
  expect(staff.style.getPropertyValue("--vtab-zoom")).toBe("1");
  fireEvent.click(vTools.getByRole("button", { name: "Zoom out visual tab" }));
  expect(staff.style.getPropertyValue("--vtab-zoom")).toBe("0.9");

  const vExpand = vTools.getByRole("button", { name: "Expand" });
  expect(vExpand.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(vExpand);
  expect(vExpand.getAttribute("aria-pressed")).toBe("true");
  expect(staff.className).toContain("vtab-staff-expanded");

  const vFollow = vTools.getByRole("button", { name: "Follow" });
  expect(vFollow.getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(vFollow);
  expect(vFollow.getAttribute("aria-pressed")).toBe("false");

  fireEvent.click(vTools.getByRole("button", { name: "Wide" }));
  expect(vTools.getByRole("button", { name: "Wide" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(vTools.getByRole("button", { name: "Compact" }));
  expect(vTools.getByRole("button", { name: "Compact" }).getAttribute("aria-pressed")).toBe("true");

  const ascii = screen.getByRole("region", { name: "Converted tab" });
  const aTools = within(screen.getByRole("toolbar", { name: "ASCII tab controls" }));
  fireEvent.click(aTools.getByRole("button", { name: "Zoom in ASCII tab" }));
  expect(ascii.style.getPropertyValue("--ascii-zoom")).toBe("1.1");
  fireEvent.click(aTools.getByRole("button", { name: "Expand" }));
  expect(ascii.className).toContain("tab-output-expanded");
  const aFollow = aTools.getByRole("button", { name: "Follow" });
  fireEvent.click(aFollow);
  expect(aFollow.getAttribute("aria-pressed")).toBe("false");

  fireEvent.click(vTools.getByRole("button", { name: "Paper" }));
  expect(staff.className).toContain("vtab-sheet-paper");
  fireEvent.click(aTools.getByRole("button", { name: "Paper" }));
  expect(ascii.className).toContain("tab-output-paper");
});

test("Songsterr-style measure looping, rhythm stems, speed presets, and Spacebar play/pause work", async () => {
  const fetchMock = stubApi();
  const base = fetchMock.getMockImplementation();
  fetchMock.mockImplementation((async (url: string, init?: RequestInit) => {
    if (url === "/api/tab/convert") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ...CONVERTED,
          systems: [
            {
              ...CONVERTED.systems[0],
              bars: [3],
              columns: [
                { index: 2, notes: [{ course: 1, position: 6, pitch: 102, name: "F" }] },
                {
                  index: 4,
                  notes: [
                    { course: 1, position: 10, pitch: 106, name: "A" },
                    { course: 3, position: 0, pitch: 86, name: "A" },
                  ],
                },
              ],
            },
          ],
        }),
      };
    }
    return base?.(url, init);
  }) as NonNullable<typeof base>);

  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Tab converter" }));
  fireEvent.change(await screen.findByLabelText("Guitar tab"), { target: { value: "e|--0--|" } });
  fireEvent.click(screen.getByRole("button", { name: "Convert" }));

  const staff = await screen.findByRole("region", { name: "Interactive visual tab" });
  expect(staff.querySelectorAll(".vtab-rhythm")).toHaveLength(2);
  expect(staff.querySelectorAll(".vtab-stem")).toHaveLength(2);

  // Measure loop restricts Play to measure 2, then Clear loop restores all events.
  fireEvent.click(within(staff).getByRole("button", { name: "Loop measure 2" }));
  expect(screen.getByText("Loop m.2")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  expect(timed.mock.calls.at(-1)?.[0].map((e) => e.steps)).toEqual([[86, 106]]);
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));

  fireEvent.click(screen.getByRole("button", { name: "Clear loop" }));
  expect(screen.queryByText("Loop m.2")).toBeNull();

  // Speed preset chips scale from base speed.
  const presets = within(screen.getByRole("group", { name: "Tempo multipliers" }));
  fireEvent.click(presets.getByRole("button", { name: "50%" }));
  expect((screen.getByLabelText(/Speed/) as HTMLInputElement).value).toBe("60");
  fireEvent.click(presets.getByRole("button", { name: "125%" }));
  expect((screen.getByLabelText(/Speed/) as HTMLInputElement).value).toBe("150");
  fireEvent.click(presets.getByRole("button", { name: "100%" }));
  expect((screen.getByLabelText(/Speed/) as HTMLInputElement).value).toBe("120");

  // Spacebar toggles Play/Stop from the Oud view container.
  const stage = screen.getByRole("region", { name: "Oud view" });
  fireEvent.keyDown(stage, { key: " " });
  expect(screen.getByRole("button", { name: "Stop" })).toBeDefined();
  fireEvent.keyDown(stage, { key: " " });
  expect(stop).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Play" })).toBeDefined();
});
