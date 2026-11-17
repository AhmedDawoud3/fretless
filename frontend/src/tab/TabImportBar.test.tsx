import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../App";
import { stubApi } from "../testApi";
import { CONVERTED } from "./convertedFixture";

vi.mock("../audio", () => ({
  playSteps: vi.fn(),
  playSequence: vi.fn(),
  playStrum: vi.fn(),
  playTimed: vi.fn(),
}));

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
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
  expect(screen.getAllByText(/Eagles — Hotel California/).length).toBeGreaterThanOrEqual(1);
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
  fireEvent.change(screen.getByLabelText("Import as"), { target: { value: "sheet" } });
  const file = new File([Uint8Array.from([37, 80, 68, 70])], "Smile - Tamino.pdf", {
    type: "application/pdf",
  });
  fireEvent.change(screen.getByLabelText("Import PDF"), { target: { files: [file] } });

  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([u]) => u === "/api/tab/import-pdf")).toBe(true),
  );
  expect((await screen.findAllByText(/Smile/)).length).toBeGreaterThanOrEqual(1);
  await screen.findByRole("region", { name: "Converted tab" });

  const pdfCall = fetchMock.mock.calls.find(([u]) => u === "/api/tab/import-pdf");
  expect(JSON.parse(String(pdfCall?.[1]?.body))).toMatchObject({
    filename: "Smile - Tamino.pdf",
    kind: "sheet",
  });
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

test("re-importing the same URL loads from library without a second fetch, and shelf loads/removes", async () => {
  const fetchMock = await openTab();
  const base = fetchMock.getMockImplementation();
  fetchMock.mockImplementation((async (url: string, init?: RequestInit) => {
    if (url === "/api/tab/import-url") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          title: "Samai Bayati",
          source: "songsterr",
          kind: "tab",
          text: "e|--0--|\nB|--1--|\nG|--2--|\nD|--2--|\nA|--0--|\nE|-----|",
          strings: null,
          capo: 0,
          tempo: 112,
        }),
      };
    }
    return base?.(url, init);
  }) as NonNullable<typeof base>);

  const songUrl = "https://www.songsterr.com/a/wsa/samai-bayati-tab-s12345";
  fireEvent.change(screen.getByLabelText("Tab / Chords URL"), { target: { value: songUrl } });
  fireEvent.click(screen.getByRole("button", { name: "Import URL" }));

  await screen.findByText(/Imported Samai Bayati/i);
  await screen.findByRole("region", { name: "Converted tab" });
  expect((screen.getByLabelText(/Speed/i) as HTMLInputElement).value).toBe("112");

  // Re-importing the exact same URL serves from the saved library without another backend call.
  fireEvent.click(screen.getByRole("button", { name: "Import URL" }));
  await screen.findByText(/Loaded from library: Samai Bayati/i);
  const importCalls = fetchMock.mock.calls.filter(([u]) => u === "/api/tab/import-url");
  expect(importCalls).toHaveLength(1);

  // Saved library shelf allows reloading and removing entries.
  const loadBtn = screen.getByRole("button", { name: "Load Samai Bayati" });
  fireEvent.click(loadBtn);
  await screen.findByText(/Loaded from library: Samai Bayati/i);

  const removeBtn = screen.getByRole("button", { name: "Remove Samai Bayati" });
  fireEvent.click(removeBtn);
  expect(screen.queryByRole("button", { name: "Load Samai Bayati" })).toBeNull();
});

test("multi-track Songsterr import reveals a Track selector and switches tracks cleanly", async () => {
  const fetchMock = await openTab();
  const base = fetchMock.getMockImplementation();
  const tracks = [
    { index: 0, name: "Rhythm Guitar", instrument: "Electric Guitar (clean)", is_vocal: false },
    {
      index: 1,
      name: "Electric Bass (finger)",
      instrument: "Electric Bass (finger)",
      is_vocal: false,
    },
    { index: 3, name: "Vocals", instrument: "Tenor Sax", is_vocal: true },
  ];
  fetchMock.mockImplementation((async (url: string, init?: RequestInit) => {
    if (url === "/api/tab/import-url") {
      const req = JSON.parse(String(init?.body ?? "{}")) as { track?: number };
      const chosen = req.track ?? 3;
      const trackName = tracks.find((t) => t.index === chosen)?.name ?? "Vocals";
      return {
        ok: true,
        status: 200,
        json: async () => ({
          title: `Tamino — So It Goes — ${trackName}`,
          source: "songsterr",
          kind: "tab",
          text: "e|--0--|\nB|--1--|\nG|--2--|\nD|--2--|\nA|--0--|\nE|-----|",
          strings: null,
          capo: 0,
          tempo: 116,
          track_index: chosen,
          tracks,
        }),
      };
    }
    return base?.(url, init);
  }) as NonNullable<typeof base>);

  const taminoUrl =
    "https://www.songsterr.com/a/wsa/tamino-so-it-goes-full-version-vocal-tab-s5828677";
  fireEvent.change(screen.getByLabelText("Tab / Chords URL"), { target: { value: taminoUrl } });
  fireEvent.click(screen.getByRole("button", { name: "Import URL" }));

  await screen.findByText(/Imported Tamino — So It Goes — Vocals/i);
  const trackSelect = screen.getByLabelText("Track") as HTMLSelectElement;
  expect(trackSelect.value).toBe("3");

  fireEvent.change(trackSelect, { target: { value: "0" } });
  await screen.findByText(/Imported Tamino — So It Goes — Rhythm Guitar/i);

  const importCalls = fetchMock.mock.calls
    .filter(([u]) => u === "/api/tab/import-url")
    .map(([, init]) => JSON.parse(String(init?.body)));
  expect(importCalls).toEqual([
    { url: taminoUrl, kind: "auto" },
    { url: taminoUrl, kind: "auto", track: 0 },
  ]);
});

test("multi-track PDF import reveals Track selector, switches tracks, and caches each track", async () => {
  const fetchMock = await openTab();
  const base = fetchMock.getMockImplementation();
  const tracks = [
    { index: 0, name: "Piano · Right hand", instrument: "Treble", is_vocal: false },
    { index: 1, name: "Piano · Left hand", instrument: "Bass", is_vocal: false },
    { index: 2, name: "Combined (Full score)", instrument: "All tracks", is_vocal: false },
  ];
  fetchMock.mockImplementation((async (url: string, init?: RequestInit) => {
    if (url === "/api/tab/import-pdf") {
      const req = JSON.parse(String(init?.body ?? "{}")) as { track?: number };
      const chosen = req.track ?? 0;
      const label = tracks[chosen]?.name ?? "Piano · Right hand";
      return {
        ok: true,
        status: 200,
        json: async () => ({
          title: `Essa Jai — ${label}`,
          source: "pdf",
          kind: "sheet",
          text:
            chosen === 1
              ? "e|---|\nB|---|\nG|---|\nD|---|\nA|-3-|\nE|---|"
              : "e|-0-|\nB|---|\nG|---|\nD|---|\nA|---|\nE|---|",
          strings: null,
          capo: 0,
          tempo: null,
          track_index: chosen,
          tracks,
        }),
      };
    }
    return base?.(url, init);
  }) as NonNullable<typeof base>);

  const file = new File([Uint8Array.from([37, 80, 68, 70])], "EssaJai-Full Score.pdf", {
    type: "application/pdf",
  });
  fireEvent.change(screen.getByLabelText("Import PDF"), { target: { files: [file] } });

  await screen.findByText(/Imported Essa Jai — Piano · Right hand/i);
  const trackSelect = screen.getByLabelText("Track") as HTMLSelectElement;
  expect(trackSelect.value).toBe("0");

  fireEvent.change(trackSelect, { target: { value: "1" } });
  await screen.findByText(/Imported Essa Jai — Piano · Left hand/i);

  // Switching back to track 0 hits cached library entry with no extra backend request.
  fireEvent.change(screen.getByLabelText("Track"), { target: { value: "0" } });
  await screen.findByText(/Loaded from library: Essa Jai — Piano · Right hand/i);

  const pdfCalls = fetchMock.mock.calls
    .filter(([u]) => u === "/api/tab/import-pdf")
    .map(([, init]) => JSON.parse(String(init?.body)));
  expect(pdfCalls).toHaveLength(2);
  expect(pdfCalls[0]).toMatchObject({ filename: "EssaJai-Full Score.pdf", kind: "auto" });
  expect(pdfCalls[1]).toMatchObject({ filename: "EssaJai-Full Score.pdf", kind: "auto", track: 1 });
});
