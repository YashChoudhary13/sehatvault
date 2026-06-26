import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { t, type Locale } from "@sehatvault/i18n";
import { RecordForm } from "@/components/record-form";
import { updateRecord } from "@/app/actions/record-edit";
import type { CreateRecordData } from "@/app/actions/record";

type RecordRow = {
  id: string;
  member_id: string;
  type: string;
  record_date: string | null;
  title: string | null;
  facility: string | null;
  doctor: string | null;
  summary: string | null;
};

export default async function EditRecordPage({
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

  const [{ data: appUser }, { data: record }, { data: members }] =
    await Promise.all([
      supabase.from("app_user").select("locale").eq("id", user.id).single(),
      supabase
        .from("health_record")
        .select(
          "id, member_id, type, record_date, title, facility, doctor, summary",
        )
        .eq("id", id)
        .single(),
      supabase.from("member_profile").select("id, display_name"),
    ]);

  if (!record) notFound();

  const locale: Locale = appUser?.locale === "hi" ? "hi" : "en";
  const safeMembers = (members ?? []) as { id: string; display_name: string }[];
  const rec = record as unknown as RecordRow;

  const today = new Date().toISOString().split("T")[0]!;
  const boundUpdate = updateRecord.bind(null, id);

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-bold text-primary-ink">
        {t(locale, "records.action.edit_title")}
      </h1>
      <RecordForm
        locale={locale}
        members={safeMembers}
        defaultDate={today}
        initialData={{
          member_id: rec.member_id,
          type: rec.type as CreateRecordData["type"],
          record_date: rec.record_date ?? undefined,
          title: rec.title ?? undefined,
          facility: rec.facility ?? undefined,
          doctor: rec.doctor ?? undefined,
          summary: rec.summary ?? undefined,
        }}
        onSubmit={boundUpdate}
        readOnlyMember
      />
    </main>
  );
}
