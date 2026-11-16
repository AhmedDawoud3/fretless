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
        audio_base64: "UklGRg==",
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
  expect(transcribeBodies(fetchMock)).toHaveLength(1);

  // Detected Maqam Solo / Improvise guide lights up scale markers on the oud neck.
  const maqamBar = screen.getByRole("region", { name: "Detected maqam" });
  expect(maqamBar.textContent).toContain("Rast");
  const soloBtn = screen.getByRole("button", { name: "Solo / Improvise guide" });
  fireEvent.click(soloBtn);
  expect(soloBtn.getAttribute("aria-pressed")).toBe("true");
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
});
