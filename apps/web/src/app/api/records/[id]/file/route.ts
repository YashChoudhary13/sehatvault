import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

/**
 * GET /api/records/[id]/file
 * Returns a short-lived signed URL (60 s) for the document attached to a health_record.
 * Record must belong to the authenticated user's family — enforced by RLS + null-check.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json(
      { error: { code: "unauthenticated", message: "Authentication required", details: null } },
      401,
    );
  }

  // RLS scopes this to the user's family — a record from another family returns null.
  const { data: record } = await supabase
    .from("health_record")
    .select("id, file_object_key")
    .eq("id", id)
    .single();

  if (!record) {
    return json(
      { error: { code: "forbidden", message: "Document unavailable", details: null } },
      403,
    );
  }

  if (!record.file_object_key) {
    return json(
      { error: { code: "not_found", message: "No file attached to this record", details: null } },
      404,
    );
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("documents")
    .createSignedUrl(record.file_object_key, SIGNED_URL_TTL_SECONDS);

  if (signedError ?? !signed?.signedUrl) {
    console.error("[records/file] signed URL failed");
    return json(
      { error: { code: "server", message: "Failed to generate file URL", details: null } },
      500,
    );
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();

  return json({ url: signed.signedUrl, expires_at: expiresAt }, 200);
}
