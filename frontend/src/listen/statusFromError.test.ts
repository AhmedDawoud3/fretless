import { describe, expect, it } from "vitest";
import { statusFromError } from "./statusFromError";

const named = (name: string) => Object.assign(new Error(name), { name });

describe("statusFromError", () => {
  it("maps a refused permission to denied", () => {
    expect(statusFromError(named("NotAllowedError"))).toBe("denied");
    expect(statusFromError(named("SecurityError"))).toBe("denied");
  });

  it("maps a missing API or device to unsupported", () => {
    expect(statusFromError(named("NotFoundError"))).toBe("unsupported");
    expect(statusFromError(new TypeError("mediaDevices is undefined"))).toBe("unsupported");
  });

  it("maps anything else to error", () => {
    expect(statusFromError(named("NotReadableError"))).toBe("error");
    expect(statusFromError("boom")).toBe("error");
    expect(statusFromError(null)).toBe("error");
  });
});
