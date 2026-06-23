import { describe, it, expect } from "vitest";
import { validatePin } from "./pin";

describe("validatePin", () => {
  describe("valid PINs", () => {
    it("accepts a 4-digit non-trivial PIN", () => {
      expect(validatePin("2947")).toEqual({ valid: true });
    });

    it("accepts a 5-digit PIN", () => {
      expect(validatePin("98162")).toEqual({ valid: true });
    });

    it("accepts a 6-digit PIN", () => {
      expect(validatePin("294016")).toEqual({ valid: true });
    });
  });

  describe("length enforcement", () => {
    it("rejects empty string as too_short", () => {
      expect(validatePin("")).toEqual({ valid: false, reason: "too_short" });
    });

    it("rejects a 3-digit PIN as too_short", () => {
      expect(validatePin("294")).toEqual({ valid: false, reason: "too_short" });
    });

    it("rejects a 7-digit PIN as too_long", () => {
      expect(validatePin("2947162")).toEqual({ valid: false, reason: "too_long" });
    });
  });

  describe("digits-only enforcement", () => {
    it("rejects a PIN with letters as not_digits", () => {
      expect(validatePin("12ab")).toEqual({ valid: false, reason: "not_digits" });
    });

    it("rejects a PIN with whitespace as not_digits", () => {
      expect(validatePin("12 3")).toEqual({ valid: false, reason: "not_digits" });
    });

    it("rejects a PIN with a leading sign as not_digits", () => {
      expect(validatePin("-123")).toEqual({ valid: false, reason: "not_digits" });
    });
  });

  describe("trivial PIN blocklist", () => {
    it("rejects all-zeros '0000' as trivial", () => {
      expect(validatePin("0000")).toEqual({ valid: false, reason: "trivial" });
    });

    it("rejects all-same-digit '5555' as trivial", () => {
      expect(validatePin("5555")).toEqual({ valid: false, reason: "trivial" });
    });

    it("rejects all-same 6-digit '999999' as trivial", () => {
      expect(validatePin("999999")).toEqual({ valid: false, reason: "trivial" });
    });

    it("rejects ascending sequence '1234' as trivial", () => {
      expect(validatePin("1234")).toEqual({ valid: false, reason: "trivial" });
    });

    it("rejects ascending sequence '34567' as trivial", () => {
      expect(validatePin("34567")).toEqual({ valid: false, reason: "trivial" });
    });

    it("rejects ascending 6-digit '123456' as trivial", () => {
      expect(validatePin("123456")).toEqual({ valid: false, reason: "trivial" });
    });

    it("rejects descending sequence '9876' as trivial", () => {
      expect(validatePin("9876")).toEqual({ valid: false, reason: "trivial" });
    });

    it("rejects descending sequence '54321' as trivial", () => {
      expect(validatePin("54321")).toEqual({ valid: false, reason: "trivial" });
    });

    it("rejects descending 6-digit '987654' as trivial", () => {
      expect(validatePin("987654")).toEqual({ valid: false, reason: "trivial" });
    });
  });
});
