import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "../App";
import { stubApi } from "../testApi";
import { CONVERTED } from "./convertedFixture";

vi.mock("../audio", () => ({
  playSteps: vi.fn(),
  playSequence: vi.fn(),
  playStrum: vi.fn(),
  playTimed: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openTab() {
  const fetchMock = stubApi();
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Tab converter" }));
  await screen.findByLabelText("Guitar tab");
  return fetchMock;
}

const CUSTOM_STRINGS = [90, 86, 76, 70, 62, 52];

test("importing an Ultimate Guitar chords URL updates text, tuning, capo, and converts", async () => {
  const fetchMock = await openTab();
  const base = fetchMock.getMockImplementation();
  fetchMock.mockImplementation((async (url: string, init?: RequestInit) => {
    if (url === "/api/tab/import-url") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          title: "Eagles — Hotel California",
          source: "ultimate-guitar",
          kind: "chords",
          text: "e|--0--|\nB|--1--|\nG|--2--|\nD|--2--|\nA|--0--|\nE|-----|",
          strings: CUSTOM_STRINGS,
          capo: 2,
        }),
      };
    }
    return base?.(url, init);
  }) as NonNullable<typeof base>);

  fireEvent.change(screen.getByLabelText("Tab / Chords URL"), {
    target: { value: "https://tabs.ultimate-guitar.com/tab/eagles/hotel-california-chords-46190" },
  });
  fireEvent.change(screen.getByLabelText("Import as"), { target: { value: "chords" } });
  fireEvent.click(screen.getByRole("button", { name: "Import URL" }));

  await screen.findByText(/Imported/i);
  expect(screen.getByText(/Eagles — Hotel California/)).toBeDefined();
  const converted = await screen.findByRole("region", { name: "Converted tab" });
  expect(converted.textContent).toBe(CONVERTED.text);

  const importCall = fetchMock.mock.calls.find(([u]) => u === "/api/tab/import-url");
  expect(JSON.parse(String(importCall?.[1]?.body))).toEqual({
    url: "https://tabs.ultimate-guitar.com/tab/eagles/hotel-california-chords-46190",
    kind: "chords",
  });

  const convertCall = fetchMock.mock.calls.find(([u]) => u === "/api/tab/convert");
  expect(JSON.parse(String(convertCall?.[1]?.body))).toMatchObject({
    guitar: { strings: CUSTOM_STRINGS, capo: 2 },
  });
});

test("importing a Songsterr URL sends kind and imports tab cleanly", async () => {
  const fetchMock = await openTab();
  fireEvent.change(screen.getByLabelText("Tab / Chords URL"), {
    target: { value: "https://www.songsterr.com/a/wsa/metallica-nothing-else-matters-tab-s439171" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Import URL" }));

  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([u]) => u === "/api/tab/import-url")).toBe(true),
  );
  await screen.findByRole("region", { name: "Converted tab" });
});

test("uploading a PDF imports its tab, applies tuning, and converts automatically", async () => {
  const fetchMock = await openTab();
  const file = new File([Uint8Array.from([37, 80, 68, 70])], "Smile - Tamino.pdf", {
    type: "application/pdf",
  });
  fireEvent.change(screen.getByLabelText("Import PDF"), { target: { files: [file] } });

  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([u]) => u === "/api/tab/import-pdf")).toBe(true),
  );
  expect(await screen.findByText(/Smile/)).toBeDefined();
  await screen.findByRole("region", { name: "Converted tab" });

  const pdfCall = fetchMock.mock.calls.find(([u]) => u === "/api/tab/import-pdf");
  expect(JSON.parse(String(pdfCall?.[1]?.body))).toMatchObject({ filename: "Smile - Tamino.pdf" });
});

test("422 import rejections surface an accessible alert with server detail", async () => {
  const fetchMock = await openTab();
  const base = fetchMock.getMockImplementation();
  fetchMock.mockImplementation((async (url: string, init?: RequestInit) => {
    if (url === "/api/tab/import-url") {
      return {
        ok: false,
        status: 422,
        json: async () => ({ detail: "Enter a valid Ultimate Guitar or Songsterr URL." }),
      };
    }
    return base?.(url, init);
  }) as NonNullable<typeof base>);

  fireEvent.change(screen.getByLabelText("Tab / Chords URL"), {
    target: { value: "https://example.com/nope" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Import URL" }));

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("Ultimate Guitar or Songsterr");
});
