"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { InsertRecordSchema, type InsertRecordData } from "@sehatvault/core";

export type CreateRecordData = InsertRecordData;
export type RecordActionResult = { error: string } | null;
export type DeleteRecordResult = { error: string } | { success: true };

const recordActionRuntime: {
  revalidatePath: (path: string) => void;
  redirect: (path: string) => never;
} = {
  revalidatePath,
  redirect,
};

export async function __setRecordActionRuntimeForTests(overrides: {
  revalidatePath?: (path: string) => void;
  redirect?: (path: string) => never;
}) {
  if (overrides.revalidatePath) {
    recordActionRuntime.revalidatePath = overrides.revalidatePath;
  }

  if (overrides.redirect) {
    recordActionRuntime.redirect = overrides.redirect;
  }
}

export async function finalizeRecordMutation(
  revalidatePaths: string[],
  redirectTo?: string,
) {
  for (const path of revalidatePaths) {
    recordActionRuntime.revalidatePath(path);
  }

  if (redirectTo) {
    recordActionRuntime.redirect(redirectTo);
  }
}

export async function createRecord(
  data: CreateRecordData,
): Promise<RecordActionResult> {
  const parsed = InsertRecordSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { data: family } = await supabase.from("family").select("id").single();
  if (!family) return { error: "no_family" };

  const { member_id, type, record_date, title, facility, doctor, summary } =
    parsed.data;

  const { error: dbError } = await supabase.from("health_record").insert({
    family_id: family.id,
    member_id,
    type,
    source: "manual",
    ocr_status: "manual",
    record_date: record_date || null,
    title: title || null,
    facility: facility || null,
    doctor: doctor || null,
    summary: summary || null,
    created_by: user.id,
  });

  if (dbError) return { error: dbError.message };

  await finalizeRecordMutation(["/records"], "/records");
  return null;
}

export async function deleteRecord(id: string): Promise<DeleteRecordResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { data: record } = await supabase
    .from("health_record")
    .select("id, file_object_key")
    .eq("id", id)
    .single();

  if (!record) return { error: "not_found" };

  // Best-effort storage cleanup — ignore errors so the DB delete always proceeds.
  if (record.file_object_key) {
    await supabase.storage
      .from("documents")
      .remove([record.file_object_key as string]);
  }

  const { error: dbError } = await supabase
    .from("health_record")
    .delete()
    .eq("id", id);

  if (dbError) return { error: dbError.message };

  await finalizeRecordMutation(["/records"]);
  return { success: true };
}
