import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../App";
import { playStrum, playTimed } from "../audio";
import { stubApi } from "../testApi";

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
