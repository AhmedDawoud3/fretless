import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "../App";
import { stubApi } from "../testApi";

vi.mock("../audio", () => ({ playSteps: vi.fn(), playSequence: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

const KEY = "fretless.settings";

test("settings saved on an earlier visit are applied on load", async () => {
  const fetchMock = stubApi();
  localStorage.setItem(
    KEY,
    JSON.stringify({ tuningId: "ff", labelMode: "names", maqamId: "bayati", root: 8, tempo: 90 }),
  );
  render(<App />);

  expect(await screen.findByLabelText(/Tempo \(90 /)).toBeDefined();
  expect((screen.getByLabelText("Tuning") as HTMLSelectElement).value).toBe("ff");
  expect((screen.getByLabelText("Labels") as HTMLSelectElement).value).toBe("names");
  expect(fetchMock).toHaveBeenCalledWith("/api/maqamat/bayati/scale?root=8&tuning=ff");
});

test("garbled saved settings are ignored", async () => {
  stubApi();
  localStorage.setItem(KEY, '{"labelMode":"huge","tuningId":"nope","maqamId":"gone"}');
  render(<App />);

  await screen.findByRole("button", { name: /Free play/ });
  expect((screen.getByLabelText("Tuning") as HTMLSelectElement).value).toBe("cc");
  expect((screen.getByLabelText("Labels") as HTMLSelectElement).value).toBe("both");
  expect(screen.getByRole("button", { name: /Free play/ }).getAttribute("aria-pressed")).toBe(
    "true",
  );
});

test("changes are saved for the next visit", async () => {
  stubApi();
  render(<App />);
  fireEvent.click(await screen.findByLabelText("Snap to quarter tones"));
  fireEvent.click(await screen.findByRole("button", { name: /Rast/ }));

  const stored = JSON.parse(localStorage.getItem(KEY) ?? "{}");
  expect(stored).toMatchObject({ tuningId: "cc", snap: false, maqamId: "rast", root: null });
});

test("a browser that refuses storage still gets a working page", async () => {
  stubApi();
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(<App />);

  fireEvent.click(await screen.findByRole("button", { name: /Rast/ }));
  expect(await screen.findByRole("button", { name: "Play scale" })).toBeDefined();
});
