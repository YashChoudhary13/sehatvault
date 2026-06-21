import { describe, it, expect } from "vitest";
import { isNonEmptyName } from "./health";

describe("isNonEmptyName", () => {
  it("rejects blank, accepts real names", () => {
    expect(isNonEmptyName("   ")).toBe(false);
    expect(isNonEmptyName("Ramesh")).toBe(true);
  });
});
