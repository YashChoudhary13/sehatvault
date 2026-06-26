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

export const InsertRecordSchema = z.object({
  member_id: z.string().uuid(),
  type: z.enum(RECORD_TYPES),
  record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" }).refine(d => !isNaN(Date.parse(d)), { message: "Invalid date" }),
  title: z.string().min(1, { message: "Title is required" }),
  facility: z.string().optional(),
  doctor: z.string().optional(),
  summary: z.string().optional(),
});

export type InsertRecordData = z.infer<typeof InsertRecordSchema>;