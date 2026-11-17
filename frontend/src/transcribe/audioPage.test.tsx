import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../App";
import { CONVERTED } from "../tab/convertedFixture";
import { stubApi } from "../testApi";

vi.mock("../audio", () => ({
  playSteps: vi.fn(),
  playSequence: vi.fn(),
  playStrum: vi.fn(),
  playTimed: vi.fn(),
}));

const TRANSCRIBE_URL = "/api/audio/transcribe";

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:example-audio"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  window.localStorage.clear();
  cleanup();
  vi.unstubAllGlobals();
});

async function openAudio() {
  const fetchMock = stubApi();
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Audio to Oud" }));
  await screen.findByLabelText("Audio file");
  return fetchMock;
}

function answerTranscribe(fetchMock: ReturnType<typeof stubApi>, reply: unknown) {
  const original = fetchMock.getMockImplementation();
  fetchMock.mockImplementation((async (url: string, init?: RequestInit) =>
    url === TRANSCRIBE_URL ? reply : original?.(url, init)) as NonNullable<typeof original>);
}

const transcribeBodies = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls
    .filter(([url]) => url === TRANSCRIBE_URL)
    .map(([, init]) => JSON.parse(String(init?.body)));

test("loading the example recording enables Transcribe and shows Original recording audio bar", async () => {
  const fetchMock = await openAudio();
  const button = screen.getByRole("button", { name: "Transcribe to oud" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);

  fireEvent.click(screen.getByRole("button", { name: "Load example recording" }));
  expect(button.disabled).toBe(false);
  expect((screen.getByLabelText("Original recording") as HTMLAudioElement).src).toContain(
    "blob:example-audio",
  );

  fireEvent.click(button);
  const output = await screen.findByRole("region", { name: "Converted tab" });
  expect(output.textContent).toBe(CONVERTED.text);
  expect(transcribeBodies(fetchMock)).toHaveLength(1);
});

test("uploading a file transcribes it and re-transcribes when tuning or output mode changes", async () => {
  const fetchMock = await openAudio();
  const file = new File([Uint8Array.from([1, 2, 3, 4])], "riff.mp3", { type: "audio/mpeg" });
  fireEvent.change(screen.getByLabelText("Audio file"), { target: { files: [file] } });

  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "Transcribe to oud" }) as HTMLButtonElement).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Transcribe to oud" }));
  await screen.findByRole("region", { name: "Converted tab" });

  fireEvent.change(screen.getByLabelText("Tuning"), { target: { value: "ff" } });
  await waitFor(() => expect(transcribeBodies(fetchMock)).toHaveLength(2));

  fireEvent.change(screen.getByLabelText("Output"), { target: { value: "both" } });
  await waitFor(() => expect(transcribeBodies(fetchMock)).toHaveLength(3));
  expect(transcribeBodies(fetchMock).at(-1)).toMatchObject({ oud_tuning: "ff", mode: "both" });
});

test("422 and 500 errors from transcription show accessible alerts", async () => {
  const fetchMock = await openAudio();
  fireEvent.click(screen.getByRole("button", { name: "Load example recording" }));

  answerTranscribe(fetchMock, { ok: false, status: 422 });
  fireEvent.click(screen.getByRole("button", { name: "Transcribe to oud" }));
  expect((await screen.findByRole("alert")).textContent).toMatch(/could not read that audio/i);

  answerTranscribe(fetchMock, { ok: false, status: 500 });
  fireEvent.change(screen.getByLabelText("Output"), { target: { value: "names" } });
  expect((await screen.findByRole("alert")).textContent).toMatch(/just api/i);
});

test("multi-stem arrangements switch instantly, preview stem audio, toggle Maqam solo overlay, and cache in audio library", async () => {
  const fetchMock = await openAudio();
  const multiReply = {
    ...CONVERTED,
    tempo: 118,
    detected_maqam: [
      {
        maqam_id: "rast",
        maqam_name: "Rast",
        arabic_name: "راست",
        root: 0,
        root_name: "C",
        confidence: 92,
        scale_pitches: [96, 100, 103, 106, 110, 114, 117, 120],
      },
    ],
    active_arrangement_id: "vocals-oud",
    arrangements: [
      {
        id: "vocals-oud",
        label: "Vocals → Oud Solo",
        stem: "vocals",
        fit_score: 94,
        fit_reason: "Single-line melody · 96% direct Oud range fit",
        notes_count: 3,
        audio_base64: "UklGRg==",
        text: CONVERTED.text,
        systems: CONVERTED.systems,
        alterations: CONVERTED.alterations,
        playback: CONVERTED.playback,
        summary: CONVERTED.summary,
      },
      {
        id: "instruments-lead",
        label: "Instruments → Lead Melody",
        stem: "instruments",
        fit_score: 82,
        fit_reason: "Single-line melody · 85% direct Oud range fit",
        notes_count: 2,
        audio_base64: "//NExAAAAA==",
        detected_maqam: [
          {
            maqam_id: "kurd",
            maqam_name: "Kurd",
            arabic_name: "كرد",
            root: 8,
            root_name: "E",
            confidence: 97,
            scale_pitches: [80, 82, 86, 90, 94, 96, 100, 104],
          },
        ],
        text: "C|--5-|\nF|----|\nA|----|\nD|----|\nG|----|\nC|----|",
        systems: CONVERTED.systems,
        alterations: [],
        playback: CONVERTED.playback,
        summary: CONVERTED.summary,
      },
    ],
  };
  answerTranscribe(fetchMock, { ok: true, status: 200, json: async () => multiReply });

  const file = new File([Uint8Array.from([1, 2, 3, 4, 5])], "tamino.mp3", { type: "audio/mpeg" });
  fireEvent.change(screen.getByLabelText("Audio file"), { target: { files: [file] } });
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "Transcribe to oud" }) as HTMLButtonElement).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Transcribe to oud" }));

  const arrSection = await screen.findByRole("region", { name: "Oud arrangements" });
  expect(arrSection.textContent).toContain("94% fit");
  expect((screen.getByLabelText("Isolated stem audio") as HTMLAudioElement).src).toContain(
    "data:audio/wav;base64,UklGRg==",
  );
  expect((screen.getByLabelText(/Speed/i) as HTMLInputElement).value).toBe("118");

  // Switch between generated stem arrangements with zero extra network call.
  fireEvent.click(screen.getByRole("button", { name: /Instruments → Lead Melody/ }));
  const convertedRegion = await screen.findByRole("region", { name: "Converted tab" });
  expect(convertedRegion.textContent).toContain("C|--5-|");
  expect((screen.getByLabelText("Isolated stem audio") as HTMLAudioElement).src).toContain(
    "data:audio/mpeg;base64,//NExAAAAA==",
  );
  expect(screen.getByRole("region", { name: "Detected maqam" }).textContent).toContain("Kurd");
  expect(transcribeBodies(fetchMock)).toHaveLength(1);

  // Detected Maqam Solo / Improvise guide lights up scale markers, shows note pills, and plays scale.
  const maqamBar = screen.getByRole("region", { name: "Detected maqam" });
  expect(maqamBar.textContent).toContain("Kurd");
  const soloBtn = screen.getByRole("button", { name: "Solo / Improvise guide" });
  fireEvent.click(soloBtn);
  expect(soloBtn.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("region", { name: "Solo scale guide" })).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Hear scale" }));
  const audioMod = await import("../audio");
  expect(audioMod.playSequence).toHaveBeenCalled();
  expect(
    screen.getByRole("img", { name: /oud/i }).querySelectorAll(".marker").length,
  ).toBeGreaterThan(0);

  // Re-transcribing or clicking Saved audio library uses cached entry with zero extra fetch.
  fireEvent.click(screen.getByRole("button", { name: "Transcribe to oud" }));
  await screen.findByText(/Loaded from library: tamino.mp3/i);
  expect(transcribeBodies(fetchMock)).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: "Load tamino.mp3" }));
  await screen.findByText(/Loaded from library: tamino.mp3/i);
  expect(transcribeBodies(fetchMock)).toHaveLength(1);

  // Switching arrangement after library load updates Detected Maqam & carries into Maqam Explorer.
  fireEvent.click(screen.getByRole("button", { name: /Instruments → Lead Melody/ }));
  fireEvent.click(screen.getByRole("button", { name: "Open in Maqam Explorer" }));
  expect(JSON.parse(window.localStorage.getItem("fretless.settings") ?? "{}")).toMatchObject({
    maqamId: "kurd",
    root: 8,
  });
});

test("transposing a transcribed track calls /api/tab/transpose without re-transcribing and resets cleanly", async () => {
  const fetchMock = await openAudio();
  const transposedText = "C|--0-|\nF|----|\nA|----|\nD|----|\nG|----|\nC|----|";
  const original = fetchMock.getMockImplementation();
  fetchMock.mockImplementation((async (url: string, init?: RequestInit) => {
    if (url === "/api/tab/transpose") {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ...CONVERTED, text: transposedText }),
      };
    }
    return original?.(url, init);
  }) as NonNullable<typeof original>);

  fireEvent.click(screen.getByRole("button", { name: "Load example recording" }));
  fireEvent.click(screen.getByRole("button", { name: "Transcribe to oud" }));
  const region = await screen.findByRole("region", { name: "Converted tab" });
  expect(region.textContent).toBe(CONVERTED.text);

  fireEvent.click(screen.getByRole("button", { name: "Transpose down one octave" }));
  await waitFor(() =>
    expect(screen.getByRole("region", { name: "Converted tab" }).textContent).toBe(transposedText),
  );
  const transposeCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/tab/transpose");
  expect(transposeCalls).toHaveLength(1);
  expect(JSON.parse(String(transposeCalls[0]?.[1]?.body))).toMatchObject({
    transpose_semitones: -12,
    oud_tuning: "cc",
  });
  expect(transcribeBodies(fetchMock)).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: "Reset transpose" }));
  await waitFor(() =>
    expect(screen.getByRole("region", { name: "Converted tab" }).textContent).toBe(CONVERTED.text),
  );
});
