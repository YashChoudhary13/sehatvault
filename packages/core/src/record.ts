import { z } from "zod";

export const RECORD_TYPES = [
  "prescription",
  "lab_report",
  "scan",
  "discharge",
  "vaccination",
  "bill",
  "other",
] as const;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function trimToUndefined(value: unknown) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function isValidIsoCalendarDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}

const OptionalTrimmedString255 = z.preprocess(
  trimToUndefined,
  z.string().max(255).optional(),
);

export const InsertRecordSchema = z.object({
  member_id: z.string().uuid(),
  type: z.enum(RECORD_TYPES),
  record_date: z.preprocess(
    trimToUndefined,
    z
      .string()
      .regex(ISO_DATE_PATTERN, { message: "Invalid date format" })
      .refine(isValidIsoCalendarDate, { message: "Invalid date" })
      .optional(),
  ),
  title: OptionalTrimmedString255,
  facility: OptionalTrimmedString255,
  doctor: OptionalTrimmedString255,
  summary: z.preprocess(trimToUndefined, z.string().max(2000).optional()),
});

export type InsertRecordData = z.infer<typeof InsertRecordSchema>;
