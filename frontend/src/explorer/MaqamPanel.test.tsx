import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "../App";
import { rast, stubApi } from "../testApi";

vi.mock("../audio", () => ({ playSteps: vi.fn(), playSequence: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openRast() {
  stubApi();
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: /Rast/ }));
}

test("free play explains why the oud looks different from a guitar", async () => {
  stubApi();
  render(<App />);
  expect(await screen.findByText(/Why it looks different/)).toBeDefined();
});

test("a chosen maqam is explained: description, notes, and gaps in guitar frets", async () => {
  await openRast();
  expect(await screen.findByText(rast.description)).toBeDefined();
  expect(screen.queryByText(/Why it looks different/)).toBeNull();
  expect(screen.getByText(/2 frets, 1½ frets, 1½ frets/)).toBeDefined();
  expect(screen.getByText(/quarter tones a guitar cannot play/)).toBeDefined();
  expect(screen.getByText(/Notes:/).textContent).toContain("C D E𝄳");
});

test("the notes follow the naming system", async () => {
  await openRast();
  await screen.findByText(rast.description);
  fireEvent.change(screen.getByLabelText("Note names"), { target: { value: "solfege" } });
  expect(screen.getByText(/Notes:/).textContent).toContain("Do Re Mi𝄳");
});
