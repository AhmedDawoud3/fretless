import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

const TAB = "e|--0--|";
const STANDARD = [104, 94, 86, 76, 68, 56];
const CONVERT_URL = "/api/tab/convert";

async function openTab() {
  const fetchMock = stubApi();
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Tab converter" }));
  await screen.findByLabelText("Guitar tab");
  return fetchMock;
}

/** Answers the converter in its own way and everything else as stubApi does. */
function answerConvert(fetchMock: ReturnType<typeof stubApi>, reply: unknown) {
  const original = fetchMock.getMockImplementation();
  const answer = async (url: string, init?: RequestInit) =>
    url === CONVERT_URL ? reply : original?.(url, init);
  fetchMock.mockImplementation(answer as NonNullable<typeof original>);
}

const paste = (text: string) =>
  fireEvent.change(screen.getByLabelText("Guitar tab"), { target: { value: text } });
const convert = () => fireEvent.click(screen.getByRole("button", { name: "Convert" }));
const converted = () => screen.findByRole("region", { name: "Converted tab" });
const convertBodies = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls
    .filter(([url]) => url === CONVERT_URL)
    .map(([, init]) => JSON.parse(String(init?.body)));

test("the converter is a third page in the tab bar", async () => {
  await openTab();
  const tabs = screen.getAllByRole("tab").map((t) => t.textContent);
  expect(tabs).toEqual(["Maqam explorer", "Chords", "Tab converter"]);
});

test("Convert sends the text with the guitar and oud settings and shows the result", async () => {
  const fetchMock = await openTab();
  paste(TAB);
  expect(convertBodies(fetchMock)).toEqual([]);
  convert();
  const output = await converted();
  expect(output.textContent).toBe(CONVERTED.text);
  expect(convertBodies(fetchMock)).toEqual([
    { text: TAB, guitar: { strings: STANDARD, capo: 0 }, oud_tuning: "cc", mode: "frets" },
  ]);
});

test("the result says in words what changed, grouped, with where", async () => {
  await openTab();
  paste(TAB);
  convert();
  await converted();
  expect(screen.getByText(/4 notes in, 3 out · whole piece moved down one octave/)).toBeDefined();
  const list = screen.getByRole("region", { name: "What changed" });
  expect(within(list).getByRole("heading", { name: "Chords simplified" })).toBeDefined();
  expect(within(list).getByText("system 1, column 2")).toBeDefined();
  expect(within(list).getByText("1 chord note left out.")).toBeDefined();
  expect(within(list).getByText("whole piece")).toBeDefined();
});

test("a tab that needed nothing says so", async () => {
  const fetchMock = await openTab();
  const none = { ...CONVERTED, alterations: [] };
  answerConvert(fetchMock, { ok: true, json: async () => none });
  paste(TAB);
  convert();
  await converted();
  expect(screen.getByText("Nothing had to change.")).toBeDefined();
});

test("text with no tab in it says what a tab line looks like", async () => {
  await openTab();
  paste("just some words");
  convert();
  expect(await screen.findByText(/No guitar tab found in that text/)).toBeDefined();
  expect(screen.getByText(/e\|--0--3--\|/)).toBeDefined();
  expect(screen.queryByRole("region", { name: "Converted tab" })).toBeNull();
});

test("text the API refuses is explained in an alert", async () => {
  const fetchMock = await openTab();
  answerConvert(fetchMock, { ok: false, status: 422 });
  paste(TAB);
  convert();
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toMatch(/1 and 200,000 characters/);
});

test("a backend failure is an alert too", async () => {
  const fetchMock = await openTab();
  answerConvert(fetchMock, { ok: false, status: 500 });
  paste(TAB);
  convert();
  expect((await screen.findByRole("alert")).textContent).toMatch(/Could not convert/);
});

test("any setting that changes the answer converts again, but only after a first conversion", async () => {
  const fetchMock = await openTab();
  paste(TAB);
  fireEvent.change(screen.getByLabelText("Tuning"), { target: { value: "ff" } });
  fireEvent.change(screen.getByLabelText("Capo"), { target: { value: "2" } });
  expect(convertBodies(fetchMock)).toEqual([]);

  convert();
  await converted();
  expect(convertBodies(fetchMock)).toHaveLength(1);

  const change = async (label: string, value: string, calls: number) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    await waitFor(() => expect(convertBodies(fetchMock)).toHaveLength(calls));
    await converted();
  };
  await change("Tuning", "cc", 2);
  await change("Capo", "3", 3);
  await change("Guitar tuning", "dropd", 4);
  await change("Output", "both", 5);

  const last = convertBodies(fetchMock).at(-1);
  expect(last).toMatchObject({ oud_tuning: "cc", mode: "both", guitar: { capo: 3 } });
  expect(last.guitar.strings).toEqual([104, 94, 86, 76, 68, 52]);
});

test("the pasted text is remembered, and Load example fills in an example", async () => {
  await openTab();
  paste(TAB);
  cleanup();
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Tab converter" }));
  const box = (await screen.findByLabelText("Guitar tab")) as HTMLTextAreaElement;
  expect(box.value).toBe(TAB);

  fireEvent.click(screen.getByRole("button", { name: "Load example" }));
  expect(box.value).toMatch(/^e\|/);
  expect(box.value.split("\n")).toHaveLength(6);
});

test("text over the API limit is not sent or kept, and the limit is shown", async () => {
  const fetchMock = await openTab();
  paste("e|-".repeat(70_000));
  expect(screen.getByText(/limit is 200,000 characters/)).toBeDefined();
  const button = screen.getByRole("button", { name: "Convert" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(convertBodies(fetchMock)).toEqual([]);
  expect(JSON.parse(localStorage.getItem("fretless.settings") ?? "{}").tabText).toBe("");
});

test("Copy puts the converted tab on the clipboard and says so", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  await openTab();
  paste(TAB);
  convert();
  await converted();
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  expect(writeText).toHaveBeenCalledWith(CONVERTED.text);
  expect(await screen.findByRole("button", { name: "Copied" })).toBeDefined();
});

test("a clipboard that refuses is not an error", async () => {
  const writeText = vi.fn().mockRejectedValue(new Error("denied"));
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  await openTab();
  paste(TAB);
  convert();
  await converted();
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("button", { name: "Copy" })).toBeDefined();
});
