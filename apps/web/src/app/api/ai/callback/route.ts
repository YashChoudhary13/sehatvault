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
const EmbeddingSchema = z.object({ chunk: z.string(), vector: z.array(z.number()) });
const ExtractedPromote = z
  .object({
    type: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    doc_date: z.string().optional().nullable(),
    facility: z.string().optional().nullable(),
    doctor: z.string().optional().nullable(),
  })
  .partial();
const PayloadSchema = z.object({
  record_id: z.string().uuid(),
  status: z.enum(["done", "needs_review", "failed"]),
  extracted: z.record(z.unknown()).nullable().optional(),
  lab_values: z.array(LabValueSchema).default([]),
  medications: z.array(MedicationSchema).default([]),
  embeddings: z.array(EmbeddingSchema).default([]),
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

  const ex = parsed.extracted ? ExtractedPromote.safeParse(parsed.extracted) : null;
  const promote = ex && ex.success ? ex.data : {};
  const recordDate =
    typeof promote.doc_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(promote.doc_date)
      ? promote.doc_date
      : undefined;

  const svc = createServiceClient();
  const { error } = await svc
    .from("health_record")
    .update({
      ocr_status: parsed.status,
      extracted: parsed.extracted ?? null,
      summary: parsed.summary ?? null,
      summary_hi: parsed.summary_hi ?? null,
      ...(promote.type ? { type: promote.type } : {}),
      ...(promote.title ? { title: promote.title } : {}),
      ...(recordDate ? { record_date: recordDate } : {}),
      ...(promote.facility ? { facility: promote.facility } : {}),
      ...(promote.doctor ? { doctor: promote.doctor } : {}),
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

  const childErrors: string[] = [];

  if (rec) {
    const { error: delLab } = await svc.from("lab_value").delete().eq("record_id", parsed.record_id);
    if (delLab) childErrors.push(delLab.code ?? "unknown");
    if (parsed.lab_values.length) {
      const { error: insLab } = await svc.from("lab_value").insert(
        parsed.lab_values.map((v) => ({
          ...v,
          record_id: parsed.record_id,
          family_id: rec.family_id,
          member_id: rec.member_id,
        })),
      );
      if (insLab) childErrors.push(insLab.code ?? "unknown");
    }
    const { error: delMed } = await svc.from("medication").delete().eq("record_id", parsed.record_id);
    if (delMed) childErrors.push(delMed.code ?? "unknown");
    if (parsed.medications.length) {
      const { error: insMed } = await svc.from("medication").insert(
        parsed.medications.map((m) => ({
          ...m,
          record_id: parsed.record_id,
          family_id: rec.family_id,
          member_id: rec.member_id,
        })),
      );
      if (insMed) childErrors.push(insMed.code ?? "unknown");
    }
    const { error: delEmb } = await svc.from("record_embedding").delete().eq("record_id", parsed.record_id);
    if (delEmb) childErrors.push(delEmb.code ?? "unknown");
    if (parsed.embeddings.length) {
      const { error: insEmb } = await svc.from("record_embedding").insert(
        parsed.embeddings.map((e) => ({
          record_id: parsed.record_id,
          family_id: rec.family_id,
          member_id: rec.member_id,
          chunk: e.chunk,
          embedding: `[${e.vector.join(",")}]`,
        })),
      );
      if (insEmb) childErrors.push(insEmb.code ?? "unknown");
    }
  }

  if (childErrors.length > 0) {
    console.error("[ai/callback] child write failed", childErrors);
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR" } }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
