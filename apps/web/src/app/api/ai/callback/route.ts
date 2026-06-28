import { type NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

const PayloadSchema = z.object({
  record_id: z.string().uuid(),
  status: z.enum(["done", "needs_review", "failed"]),
  extracted: z.record(z.unknown()).nullable().optional(),
  lab_values: z.array(z.unknown()).default([]),
  medications: z.array(z.unknown()).default([]),
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
  // Task 2: status + summary fields only. Structured child-row inserts land in Task 4.
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
  return NextResponse.json({ ok: true }, { status: 200 });
}
