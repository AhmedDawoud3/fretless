import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../App";
import { playSequence } from "../audio";
import { stubApi } from "../testApi";

vi.mock("../audio", () => ({ playSteps: vi.fn(), playSequence: vi.fn() }));

const stop = vi.fn();
const sequence = vi.mocked(playSequence);
let finish: () => void = () => {};

beforeEach(() => {
  stop.mockClear();
  sequence.mockReset();
  sequence.mockImplementation(() => ({
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

async function openRast() {
  stubApi();
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: /Rast/ }));
  return screen.findByRole("button", { name: "Play scale" });
}

test("Play scale plays the octave up and back down at the chosen tempo", async () => {
  fireEvent.click(await openRast());
  expect(sequence).toHaveBeenCalledTimes(1);
  const [pitches, tempo] = sequence.mock.calls[0] ?? [];
  expect(pitches).toHaveLength(15);
  expect(pitches?.slice(0, 8)).toEqual(pitches?.slice(7).reverse());
  expect(tempo).toBe(120);
});

test("the tempo slider sets the speed", async () => {
  const play = await openRast();
  fireEvent.change(screen.getByLabelText(/Tempo/), { target: { value: "200" } });
  fireEvent.click(play);
  expect(sequence.mock.calls[0]?.[1]).toBe(200);
});

test("while playing the button says Stop, and the current note is marked", async () => {
  fireEvent.click(await openRast());
  const onNote = sequence.mock.calls[0]?.[2];
  act(() => onNote?.(1));
  const neckSvg = screen.getByRole("img", { name: /oud/i });
  expect(neckSvg.querySelectorAll(".marker-active")).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  expect(stop).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Play scale" })).toBeDefined();
  expect(neckSvg.querySelectorAll(".marker-active")).toHaveLength(0);
});

test("the button goes back to Play scale when the scale finishes", async () => {
  fireEvent.click(await openRast());
  await act(async () => finish());
  expect(await screen.findByRole("button", { name: "Play scale" })).toBeDefined();
});

test("changing the root stops playback", async () => {
  fireEvent.click(await openRast());
  fireEvent.change(screen.getByLabelText("Root"), { target: { value: "8" } });
  await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
});

test("leaving the page stops playback", async () => {
  fireEvent.click(await openRast());
  cleanup();
  expect(stop).toHaveBeenCalledTimes(1);
});
