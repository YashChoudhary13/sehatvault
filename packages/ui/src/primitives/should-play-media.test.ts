import { describe, it, expect } from "vitest";
import { shouldPlayMedia } from "./should-play-media";

describe("shouldPlayMedia", () => {
  it("plays on a fast connection with motion allowed", () => {
    expect(shouldPlayMedia({ reducedMotion: false, effectiveType: "4g", saveData: false })).toBe(true);
  });
  it("never plays when reduced motion is requested", () => {
    expect(shouldPlayMedia({ reducedMotion: true, effectiveType: "4g" })).toBe(false);
  });
  it("never plays when Save-Data is on", () => {
    expect(shouldPlayMedia({ reducedMotion: false, saveData: true })).toBe(false);
  });
  it("does not play on slow connections (2g/3g)", () => {
    expect(shouldPlayMedia({ reducedMotion: false, effectiveType: "3g" })).toBe(false);
    expect(shouldPlayMedia({ reducedMotion: false, effectiveType: "2g" })).toBe(false);
  });
  it("plays when connection info is unavailable and motion is allowed", () => {
    expect(shouldPlayMedia({ reducedMotion: false })).toBe(true);
  });
});
