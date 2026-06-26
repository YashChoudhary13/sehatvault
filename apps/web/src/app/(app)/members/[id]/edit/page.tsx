import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { t, type Locale } from "@sehatvault/i18n";
import { MemberForm, type MemberFormInitialData } from "@/components/member-form";
import { updateMember } from "@/app/actions/member";
import type { InsertMemberData } from "@sehatvault/core";
import type { MemberActionResult } from "@/app/actions/member";

type MemberRow = {
  display_name: string;
  relationship: string | null;
  dob: string | null;
  sex: "male" | "female" | "other" | "unknown";
  blood_group: string | null;
  allergies: string[];
  chronic_conditions: string[];
  emergency_contact: unknown;
};

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: raw }, { data: appUser }] = await Promise.all([
    supabase
      .from("member_profile")
      .select(
        "display_name, relationship, dob, sex, blood_group, allergies, chronic_conditions, emergency_contact",
      )
      .eq("id", id)
      .single(),
    supabase.from("app_user").select("locale").eq("id", user.id).single(),
  ]);

  if (!raw) notFound();

  const member = raw as unknown as MemberRow;
  const locale: Locale = appUser?.locale === "hi" ? "hi" : "en";

  const initialData: MemberFormInitialData = {
    name: member.display_name,
    relationship: member.relationship ?? "",
    dob: member.dob ?? "",
    sex: member.sex,
    blood_group: member.blood_group ?? "",
    allergies: (member.allergies ?? []) as string[],
    conditions: (member.chronic_conditions ?? []) as string[],
    emergency_contact:
      typeof member.emergency_contact === "string"
        ? member.emergency_contact
        : "",
  };

  // Server Action with the member id pre-bound; the signature matches MemberFormProps.onSubmit.
  const action = updateMember.bind(null, id) as (
    data: InsertMemberData,
  ) => Promise<MemberActionResult>;

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-bold text-primary-ink">
        {t(locale, "members.form.edit.title")}
      </h1>
      <MemberForm
        initialData={initialData}
        onSubmit={action}
        cancelHref={`/members/${id}`}
      />
    </main>
  );
}
