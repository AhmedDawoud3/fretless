import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMicrophone } from "./useMicrophone";

describe("useMicrophone", () => {
  it("starts idle and silent", () => {
    const { result } = renderHook(() => useMicrophone());
    expect(result.current.status).toBe("idle");
    expect(result.current.reading).toEqual({ state: "silent" });
  });

  it("reports unsupported when the browser has no mediaDevices", async () => {
    expect(navigator.mediaDevices).toBeUndefined();
    const { result } = renderHook(() => useMicrophone());
    await act(() => result.current.start());
    expect(result.current.status).toBe("unsupported");
  });
});
