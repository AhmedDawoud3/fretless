import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "../App";
import { stubApi } from "../testApi";

vi.mock("../audio", () => ({ playSteps: vi.fn(), playSequence: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const scaleCalls = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls.map(([url]) => url).filter((url) => url.includes("/scale"));

async function open() {
  const fetchMock = stubApi();
  render(<App />);
  await screen.findByRole("button", { name: /Free play/ });
  return fetchMock;
}

test("free play is the start: no scale is fetched", async () => {
  const fetchMock = await open();
  expect(scaleCalls(fetchMock)).toEqual([]);
});

test("choosing a maqam loads its scale at the traditional root", async () => {
  const fetchMock = await open();
  fireEvent.click(await screen.findByRole("button", { name: /Bayati/ }));
  await waitFor(() =>
    expect(scaleCalls(fetchMock)).toEqual(["/api/maqamat/bayati/scale?root=4&tuning=cc"]),
  );
});

test("the Arabic name is marked as right-to-left Arabic", async () => {
  await open();
  const arabic = await screen.findByText("راست");
  expect(arabic.getAttribute("lang")).toBe("ar");
  expect(arabic.getAttribute("dir")).toBe("rtl");
});

test("choosing a root refetches with it, and the traditional root button goes back", async () => {
  const fetchMock = await open();
  fireEvent.click(await screen.findByRole("button", { name: /Rast/ }));
  fireEvent.change(await screen.findByLabelText("Root"), { target: { value: "8" } });
  await waitFor(() =>
    expect(scaleCalls(fetchMock).at(-1)).toBe("/api/maqamat/rast/scale?root=8&tuning=cc"),
  );

  fireEvent.click(screen.getByRole("button", { name: "Traditional root" }));
  await waitFor(() =>
    expect(scaleCalls(fetchMock).at(-1)).toBe("/api/maqamat/rast/scale?root=0&tuning=cc"),
  );
});

test("changing tuning refetches the scale for the new tuning", async () => {
  const fetchMock = await open();
  fireEvent.click(await screen.findByRole("button", { name: /Rast/ }));
  fireEvent.change(await screen.findByLabelText("Tuning"), { target: { value: "ff" } });
  await waitFor(() =>
    expect(scaleCalls(fetchMock).at(-1)).toBe("/api/maqamat/rast/scale?root=0&tuning=ff"),
  );
});

test("a chosen maqam is drawn on the neck, and free play clears it", async () => {
  await open();
  fireEvent.click(await screen.findByRole("button", { name: /Rast/ }));
  expect(await screen.findByText("C 0")).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: /Free play/ }));
  await waitFor(() => expect(screen.queryByText("C 0")).toBeNull());
});

test("the overlay follows the label mode", async () => {
  await open();
  fireEvent.click(await screen.findByRole("button", { name: /Rast/ }));
  await screen.findByText("C 0");
  fireEvent.change(screen.getByLabelText("Labels"), { target: { value: "names" } });
  const neckSvg = screen.getByRole("img", { name: /oud/i });
  expect(within(neckSvg).getByText("C")).toBeDefined();
  expect(within(neckSvg).queryByText("C 0")).toBeNull();
});

test("the last played note still shows on top of the overlay", async () => {
  await open();
  fireEvent.click(await screen.findByRole("button", { name: /Rast/ }));
  await screen.findByText("C 0");
  const svg = screen.getByRole("img", { name: /oud/i });
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1620, height: 480 }) as DOMRect;
  fireEvent.pointerDown(svg, { clientX: 230, clientY: 175 });
  expect(await screen.findByText("Course 1", { exact: false })).toBeDefined();
  expect(screen.getAllByText("C 0").length).toBe(1);
});
