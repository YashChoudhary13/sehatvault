import { describe, it, expect } from "vitest";
import { canonicalAnalyte, ANALYTES } from "./lab";

describe("canonicalAnalyte", () => {
  it("maps known aliases", () => {
    expect(canonicalAnalyte("HbA1c")).toBe("hba1c");
    expect(canonicalAnalyte("Glycated Haemoglobin")).toBe("hba1c");
    expect(canonicalAnalyte("Fasting Blood Sugar")).toBe("fasting_glucose");
    expect(canonicalAnalyte("TSH")).toBe("tsh");
    expect(canonicalAnalyte("Haemoglobin")).toBe("hemoglobin");
    expect(canonicalAnalyte("Creatinine")).toBe("creatinine");
  });
  it("returns null for unknown", () => {
    expect(canonicalAnalyte("zzz")).toBeNull();
  });
  it("every analyte has a unit + label", () => {
    for (const a of Object.values(ANALYTES)) {
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.unit.length).toBeGreaterThan(0);
    }
  });
});
