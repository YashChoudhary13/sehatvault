"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { InsertMemberSchema, type InsertMemberData } from "@sehatvault/core";

export type MemberActionResult = { error: string } | null;

export async function createMember(
  data: InsertMemberData,
): Promise<MemberActionResult> {
  const parsed = InsertMemberSchema.safeParse(data);
  if (!parsed.success) return { error: "members.form.error.save_failed" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  // RLS: family query is scoped to auth.uid() — always the user's own family.
  const { data: family } = await supabase.from("family").select("id").single();
  if (!family) return { error: "members.form.error.save_failed" };

  const {
    name,
    relationship,
    dob,
    sex,
    blood_group,
    allergies,
    conditions,
    emergency_contact,
  } = parsed.data;

  const { error: dbError } = await supabase.from("member_profile").insert({
    family_id: family.id,
    display_name: name,
    relationship: relationship || null,
    dob: dob || null,
    sex,
    blood_group: blood_group || null,
    allergies: allergies ?? [],
    chronic_conditions: conditions ?? [],
    emergency_contact: emergency_contact || null,
  });

  if (dbError) return { error: "members.form.error.save_failed" };

  revalidatePath("/");
  redirect("/");
}

export async function updateMember(
  id: string,
  data: InsertMemberData,
): Promise<MemberActionResult> {
  const parsed = InsertMemberSchema.safeParse(data);
  if (!parsed.success) return { error: "members.form.error.save_failed" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const {
    name,
    relationship,
    dob,
    sex,
    blood_group,
    allergies,
    conditions,
    emergency_contact,
  } = parsed.data;

  // RLS: member_profile UPDATE policy restricts to rows owned by auth_family_ids().
  const { error: dbError } = await supabase
    .from("member_profile")
    .update({
      display_name: name,
      relationship: relationship || null,
      dob: dob || null,
      sex,
      blood_group: blood_group || null,
      allergies: allergies ?? [],
      chronic_conditions: conditions ?? [],
      emergency_contact: emergency_contact || null,
    })
    .eq("id", id);

  if (dbError) return { error: "members.form.error.save_failed" };

  revalidatePath("/");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}`);
}

export async function deleteMember(id: string): Promise<MemberActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  // RLS: member_profile DELETE policy restricts to rows owned by auth_family_ids().
  const { error: dbError } = await supabase
    .from("member_profile")
    .delete()
    .eq("id", id);

  if (dbError) return { error: "members.form.error.save_failed" };

  revalidatePath("/");
  redirect("/");
}
