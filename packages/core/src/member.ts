import { z } from "zod";

// Mirrors the sex_type PG enum from 0002_family.sql.
export const SexEnum = z.enum(["male", "female", "other", "unknown"]);

export const InsertMemberSchema = z.object({
  name: z.string().min(1, "members.form.error.name_required"),
  relationship: z.string().min(1, "members.form.error.relationship_required"),
  dob: z.string().min(1, "members.form.error.dob_required"),
  sex: SexEnum,
  blood_group: z.string().optional(),
  allergies: z.array(z.string()).optional().default([]),
  conditions: z.array(z.string()).optional().default([]),
  emergency_contact: z.string().optional(),
});

export type InsertMemberData = z.infer<typeof InsertMemberSchema>;
