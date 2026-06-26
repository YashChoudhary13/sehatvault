import { describe, expect, it } from "vitest";
import { InsertRecordSchema, type InsertRecordData, RECORD_TYPES } from "./record";

const validRecord = {
  member_id: "550e8400-e29b-41d4-a716-446655440000",
  type: "lab_report",
  record_date: "2026-06-26",
  title: "HbA1c blood test",
  facility: "City Diagnostics",
  doctor: "Dr. Mehta",
  summary: "Routine diabetes monitoring",
};

describe("InsertRecordSchema", () => {
  it("accepts a fully populated valid record", () => {
    const result = InsertRecordSchema.safeParse(validRecord);

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual(validRecord);
  });

  it("accepts every record type", () => {
    for (const type of RECORD_TYPES) {
      const result = InsertRecordSchema.safeParse({
        ...validRecord,
        type,
      });

      expect(result.success).toBe(true);
    }
  });

  it("rejects missing or invalid member_id", () => {
    const missingMemberId = InsertRecordSchema.safeParse({
      type: validRecord.type,
      record_date: validRecord.record_date,
      title: validRecord.title,
    });
    const invalidMemberId = InsertRecordSchema.safeParse({
      ...validRecord,
      member_id: "not-a-uuid",
    });

    expect(missingMemberId.success).toBe(false);
    expect(invalidMemberId.success).toBe(false);
  });

  it("rejects missing type or an invalid type value", () => {
    const missingType = InsertRecordSchema.safeParse({
      member_id: validRecord.member_id,
      record_date: validRecord.record_date,
      title: validRecord.title,
    });
    const invalidType = InsertRecordSchema.safeParse({
      ...validRecord,
      type: "xray",
    });

    expect(missingType.success).toBe(false);
    expect(invalidType.success).toBe(false);
  });

  it("rejects missing record_date", () => {
    const result = InsertRecordSchema.safeParse({
      member_id: validRecord.member_id,
      type: validRecord.type,
      title: validRecord.title,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid record_date formats", () => {
    for (const record_date of ["not-a-date", "2026-13-01", "20260101"]) {
      const result = InsertRecordSchema.safeParse({
        ...validRecord,
        record_date,
      });

      expect(result.success).toBe(false);
    }
  });

  it("rejects missing or empty title", () => {
    const missingTitle = InsertRecordSchema.safeParse({
      member_id: validRecord.member_id,
      type: validRecord.type,
      record_date: validRecord.record_date,
    });
    const emptyTitle = InsertRecordSchema.safeParse({
      ...validRecord,
      title: "",
    });

    expect(missingTitle.success).toBe(false);
    expect(emptyTitle.success).toBe(false);
  });

  it("accepts omitted optional fields", () => {
    const result = InsertRecordSchema.safeParse({
      member_id: validRecord.member_id,
      type: validRecord.type,
      record_date: validRecord.record_date,
      title: validRecord.title,
    });

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toEqual({
      member_id: validRecord.member_id,
      type: validRecord.type,
      record_date: validRecord.record_date,
      title: validRecord.title,
    });
  });

  it("accepts optional fields when provided", () => {
    const result = InsertRecordSchema.safeParse(validRecord);

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toMatchObject({
      facility: "City Diagnostics",
      doctor: "Dr. Mehta",
      summary: "Routine diabetes monitoring",
    });
  });

  it("infers InsertRecordData from a valid parse result", () => {
    const result = InsertRecordSchema.safeParse(validRecord);

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error("Expected record parse to succeed");
    }

    const typedRecord: InsertRecordData = result.data;

    expect(typedRecord).toEqual(validRecord);
  });
});
