import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "../App";
import { stubApi } from "../testApi";

vi.mock("../audio", () => ({ playSteps: vi.fn(), playSequence: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("when the maqam list cannot load, the page says so instead of hiding the picker", async () => {
  const working = stubApi();
  vi.stubGlobal("fetch", async (url: string) => {
    if (url === "/api/maqamat") throw new TypeError("offline");
    return working(url);
  });
  render(<App />);

  expect((await screen.findByRole("alert")).textContent).toContain("maqam list");
});
