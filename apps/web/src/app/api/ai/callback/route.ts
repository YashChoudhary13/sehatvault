import { type NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

const LabValueSchema = z.object({
  analyte: z.string(),
  value: z.number(),
  unit: z.string().nullable().optional(),
  measured_at: z.string().nullable().optional(),
  ref_low: z.number().nullable().optional(),
  ref_high: z.number().nullable().optional(),
  flag: z.string().nullable().optional(),
});
const MedicationSchema = z.object({
  name: z.string(),
  dose: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  active: z.boolean().default(true),
  started_at: z.string().nullable().optional(),
});
const PayloadSchema = z.object({
  record_id: z.string().uuid(),
  status: z.enum(["done", "needs_review", "failed"]),
  extracted: z.record(z.unknown()).nullable().optional(),
  lab_values: z.array(LabValueSchema).default([]),
  medications: z.array(MedicationSchema).default([]),
  embeddings: z.array(z.unknown()).default([]),
  summary: z.string().nullable().optional(),
  summary_hi: z.string().nullable().optional(),
});

function verify(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = serverEnv().AI_CALLBACK_SECRET;
  if (!verify(raw, req.headers.get("x-signature"), secret)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  let parsed;
  try {
    parsed = PayloadSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
  }

  const svc = createServiceClient();
  const { error } = await svc
    .from("health_record")
    .update({
      ocr_status: parsed.status,
      extracted: parsed.extracted ?? null,
      summary: parsed.summary ?? null,
      summary_hi: parsed.summary_hi ?? null,
    })
    .eq("id", parsed.record_id);

  if (error) {
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR" } }, { status: 500 });
  }

  // Idempotent child-row writes: derive family_id/member_id server-side; delete-then-insert
  // on record_id so re-extraction is safe. Never trust payload for family_id/member_id.
  const { data: rec } = await svc
    .from("health_record")
    .select("family_id, member_id")
    .eq("id", parsed.record_id)
    .single();
  if (rec) {
    await svc.from("lab_value").delete().eq("record_id", parsed.record_id);
    if (parsed.lab_values.length) {
      await svc.from("lab_value").insert(
        parsed.lab_values.map((v) => ({
          ...v,
          record_id: parsed.record_id,
          family_id: rec.family_id,
          member_id: rec.member_id,
        })),
      );
    }
    await svc.from("medication").delete().eq("record_id", parsed.record_id);
    if (parsed.medications.length) {
      await svc.from("medication").insert(
        parsed.medications.map((m) => ({
          ...m,
          record_id: parsed.record_id,
          family_id: rec.family_id,
          member_id: rec.member_id,
        })),
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
