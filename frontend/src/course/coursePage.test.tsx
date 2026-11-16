import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../App";
import { playSequence, playSteps } from "../audio";
import { pressNeck } from "../practice/testPress";
import { LESSONS, stubApi } from "../testApi";

vi.mock("../audio", () => ({ playSteps: vi.fn(), playSequence: vi.fn() }));

beforeEach(() => {
  vi.mocked(playSteps).mockReset();
  vi.mocked(playSequence).mockReset();
  vi.mocked(playSequence).mockImplementation(() => ({
    stop: vi.fn(),
    done: new Promise(() => {}),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openCourse(fresh = true) {
  if (fresh) stubApi();
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Course" }));
  await screen.findByRole("button", { name: /1\. Meet the six courses/ });
}

test("shows all curriculum lessons with guitarist tip and first active step", async () => {
  await openCourse();
  for (const lesson of LESSONS) {
    expect(screen.getByRole("button", { name: new RegExp(lesson.title) })).toBeDefined();
  }
  expect(screen.getByText(/fourth/i)).toBeDefined();
  expect(screen.getByText(/Step 1 of 2/i)).toBeDefined();
  expect(document.querySelectorAll(".marker-active")).toHaveLength(1);
});

test("playing the lesson steps on the oud neck completes the lesson and persists", async () => {
  await openCourse();
  pressNeck(1, 2); // wrong note (C#4)
  expect(screen.getByRole("status").textContent).toMatch(/looking for C/i);

  pressNeck(1, 0); // step 1: C4
  expect(screen.getByText(/Step 2 of 2/i)).toBeDefined();

  pressNeck(1, 4); // step 2: D4
  expect(await screen.findByText(/Lesson complete/i)).toBeDefined();
  expect(screen.getByRole("button", { name: /1\. Meet the six courses/ }).textContent).toContain(
    "Completed",
  );

  cleanup();
  await openCourse(false);
  expect(screen.getByRole("button", { name: /1\. Meet the six courses/ }).textContent).toContain(
    "Completed",
  );
});

test("Hear lesson plays the lesson steps and Restart resets the current step", async () => {
  await openCourse();
  pressNeck(1, 0);
  expect(screen.getByText(/Step 2 of 2/i)).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Restart lesson" }));
  expect(screen.getByText(/Step 1 of 2/i)).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Hear lesson" }));
  expect(playSequence).toHaveBeenCalledWith([96, 100], 120, expect.any(Function));
});

test("Reset course progress clears completed lessons after confirmation", async () => {
  await openCourse();
  pressNeck(1, 0);
  pressNeck(1, 4);
  await screen.findByText(/Lesson complete/i);

  fireEvent.click(screen.getByRole("button", { name: "Reset course progress" }));
  fireEvent.click(screen.getByRole("button", { name: "Yes, reset" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /1\. Meet the six courses/ }).textContent,
    ).not.toContain("Completed"),
  );
});
