import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);
const MAX_BYTES = 52_428_800; // 50 MiB

/**
 * POST /api/ingest
 * Upload a file, create a health_record with status 'pending',
 * and enqueue a job for AI processing via pgmq.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required", details: null } },
      { status: 401 }
    );
  }

  // Resolve family_id server-side via RLS — never trust a client-supplied value.
  const { data: family } = await supabase
    .from("family")
    .select("id")
    .single();

  if (!family) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Family not found", details: null } },
      { status: 404 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid request body", details: null } },
      { status: 400 }
    );
  }

  const fileEntry = formData.get("file");
  const memberIdEntry = formData.get("member_id");

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "No file provided", details: null } },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.has(fileEntry.type)) {
    return NextResponse.json(
      { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported file type", details: null } },
      { status: 415 }
    );
  }
  if (fileEntry.size > MAX_BYTES) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "File too large (max 50 MB)", details: null } },
      { status: 413 }
    );
  }
  if (typeof memberIdEntry !== "string" || !memberIdEntry) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "member_id is required", details: null } },
      { status: 400 }
    );
  }

  // Validate the member belongs to the authed user's family (RLS-scoped).
  const { data: member } = await supabase
    .from("member_profile")
    .select("id")
    .eq("id", memberIdEntry)
    .single();

  if (!member) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Member not found", details: null } },
      { status: 404 }
    );
  }

  const sanitizedName = fileEntry.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
  const fileKey = `${family.id}/${randomUUID()}-${sanitizedName}`;

  const bytes = await fileEntry.arrayBuffer();
  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(fileKey, bytes, { contentType: fileEntry.type, upsert: false });

  if (storageError) {
    console.error("[ingest] storage upload failed", storageError.message);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Storage upload failed", details: null } },
      { status: 500 }
    );
  }

  // Insert the record and return the inserted ID (to use for enqueueing)
  const { data: insertedRecord, error: dbError } = await supabase
    .from("health_record")
    .insert([
      {
        family_id: family.id,
        member_id: memberIdEntry,
        file_object_key: fileKey,
        source: "upload",
        ocr_status: "pending", // initial state before processing
        created_by: user.id,
      },
    ])
    .select("id")
    .single();

  if (dbError ?? !insertedRecord) {
    console.error("[ingest] db insert failed", dbError?.message);
    // Best-effort cleanup — ignore secondary errors.
    await supabase.storage.from("documents").remove([fileKey]);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to save record", details: null } },
      { status: 500 }
    );
  }

  const recordId = insertedRecord.id;

  // Enqueue a job for the AI worker via pgmq.
  try {
    // Attempt to use the pgmq.send function via RPC.
    const { error: rpcError } = await supabase.rpc("pgmq_send", {
      p_queue_name: "ai_jobs",
      p_message: JSON.stringify({ record_id: recordId }),
    });

    if (rpcError) {
      console.warn("[ingest] RPC enqueue failed, falling back to status-only:", rpcError.message);
      // Fallback: we already set status to 'pending'. In a real system, we might want to
      // ensure the worker polls the table. For now, we log and continue.
    }
  } catch (err) {
    console.error("[ingest] enqueue error", err);
    // Continue — the record is saved with status 'pending'.
  }

  return NextResponse.json({ id: recordId }, { status: 202 });
}