import { describe, expect, it } from "vitest";
import { InsertMemberSchema, SexEnum } from "./member";

const validMember = {
  name: "Priya Sharma",
  relationship: "Self",
  dob: "1990-05-12",
  sex: "female" as const,
  blood_group: "B+",
  allergies: ["Peanuts", "Penicillin"],
  conditions: ["Thyroid"],
  emergency_contact: "+91-9876543210",
};

describe("SexEnum", () => {
  it("accepts all valid sex values", () => {
    for (const sex of ["male", "female", "other", "unknown"] as const) {
      const result = SexEnum.safeParse(sex);

      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid sex values case-sensitively", () => {
    for (const sex of ["M", "", "Male"]) {
      const result = SexEnum.safeParse(sex);

      expect(result.success).toBe(false);
    }
  });
});

describe("InsertMemberSchema", () => {
  it("accepts a fully populated valid member", () => {
    const result = InsertMemberSchema.safeParse(validMember);

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual(validMember);
  });

  it("rejects an empty relationship", () => {
    const result = InsertMemberSchema.safeParse({
      ...validMember,
      relationship: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty dob", () => {
    const result = InsertMemberSchema.safeParse({
      ...validMember,
      dob: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid sex value", () => {
    const result = InsertMemberSchema.safeParse({
      ...validMember,
      sex: "Male",
    });

    expect(result.success).toBe(false);
  });

  it("accepts omitted blood_group and emergency_contact", () => {
    const result = InsertMemberSchema.safeParse({
      name: validMember.name,
      relationship: validMember.relationship,
      dob: validMember.dob,
      sex: validMember.sex,
      allergies: validMember.allergies,
      conditions: validMember.conditions,
    });

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual({
      name: validMember.name,
      relationship: validMember.relationship,
      dob: validMember.dob,
      sex: validMember.sex,
      allergies: validMember.allergies,
      conditions: validMember.conditions,
    });
  });

  it("defaults allergies and conditions to empty arrays when omitted", () => {
    const result = InsertMemberSchema.safeParse({
      name: validMember.name,
      relationship: validMember.relationship,
      dob: validMember.dob,
      sex: validMember.sex,
    });

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual({
      name: validMember.name,
      relationship: validMember.relationship,
      dob: validMember.dob,
      sex: validMember.sex,
      allergies: [],
      conditions: [],
    });
  });

  it("accepts allergies and conditions as arrays of strings", () => {
    const result = InsertMemberSchema.safeParse({
      ...validMember,
      allergies: ["Dust"],
      conditions: ["Asthma", "Diabetes"],
    });

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toMatchObject({
      allergies: ["Dust"],
      conditions: ["Asthma", "Diabetes"],
    });
  });

  it("stores the i18n key for an empty name error", () => {
    const result = InsertMemberSchema.safeParse({
      ...validMember,
      name: "",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected member parse to fail");
    }

    expect(result.error.flatten().fieldErrors.name).toContain("members.form.error.name_required");
  });
});
