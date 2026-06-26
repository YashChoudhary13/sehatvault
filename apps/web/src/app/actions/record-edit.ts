"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { InsertRecordSchema } from "@sehatvault/core";
import {
  type CreateRecordData,
  type RecordActionResult,
} from "./record";

export type { CreateRecordData, RecordActionResult };

export async function updateRecord(
  id: string,
  data: CreateRecordData,
): Promise<RecordActionResult> {
  const parsed = InsertRecordSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { member_id, type, record_date, title, facility, doctor, summary } =
    parsed.data;

  const { error: dbError } = await supabase
    .from("health_record")
    .update({
      member_id,
      type,
      record_date: record_date || null,
      title: title || null,
      facility: facility || null,
      doctor: doctor || null,
      summary: summary || null,
    })
    .eq("id", id);

  if (dbError) return { error: dbError.message };

  revalidatePath("/records");
  revalidatePath(`/records/${id}`);
  redirect(`/records/${id}`);
}
