import { describe, it, expect } from "vitest";
import { resolveMotion } from "./use-motion-tier";

describe("resolveMotion", () => {
  it("calm tier uses the calm duration and a small fade-rise", () => {
    const m = resolveMotion("calm", false);
    expect(m.initial).toEqual({ opacity: 0, y: 4 });
    expect(m.animate).toEqual({ opacity: 1, y: 0 });
    expect(m.transition.duration).toBeCloseTo(0.2);
  });

  it("expressive tier rises further and lasts longer", () => {
    const m = resolveMotion("expressive", false);
    expect(m.initial).toEqual({ opacity: 0, y: 24 });
    expect(m.transition.duration).toBeCloseTo(0.6);
  });

  it("reduced motion collapses every tier to an instant opacity fade, no transform", () => {
    const m = resolveMotion("expressive", true);
    expect(m.initial).toEqual({ opacity: 0 });
    expect(m.animate).toEqual({ opacity: 1 });
    expect(m.transition.duration).toBeCloseTo(0.01);
  });
});
