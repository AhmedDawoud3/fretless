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
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:example-audio"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
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
