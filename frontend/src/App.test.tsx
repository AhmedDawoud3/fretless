import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App";

test("shows the project name as the page heading", () => {
  render(<App />);

  expect(screen.getByRole("heading", { level: 1, name: "Fretless" })).toBeDefined();
});
