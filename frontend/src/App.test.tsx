import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App";

vi.mock("./audio", () => ({ playSteps: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const neck = {
  tuning: { id: "cc", label: "C–C" },
  courses: [{ course: 1, open_pitch: 96, max_position: 24 }],
  locations: [{ course: 1, position: 0, pitch: 96, name: { letter: "C", alter: 0, octave: 4 } }],
};

function stubApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.startsWith("/api/neck") ? neck : [{ id: "cc", label: "C–C" }]),
    })),
  );
}

test("shows the project name as the page heading", () => {
  stubApi();
  render(<App />);

  expect(screen.getByRole("heading", { level: 1, name: "Fretless" })).toBeDefined();
});

test("tells the user to start the backend when the API cannot be reached", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  render(<App />);

  expect((await screen.findByRole("alert")).textContent).toContain("just api");
});

test("playing the open course shows its note, and switching to solfege renames it", async () => {
  stubApi();
  render(<App />);
  const svg = await screen.findByRole("img", { name: /oud/i });
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1620, height: 480 }) as DOMRect;

  fireEvent.pointerDown(svg, { clientX: 230, clientY: 175 });
  expect((await screen.findByText("C4")).tagName).toBe("STRONG");

  fireEvent.change(screen.getByLabelText("Note names"), { target: { value: "solfege" } });
  expect(screen.getByText("Do4")).toBeDefined();
});
