import { createClient } from "@/lib/supabase/server";
import { t, type Locale } from "@sehatvault/i18n";
import { RecordForm } from "@/components/record-form";

export default async function NewRecordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: appUser }, { data: members }] = await Promise.all([
    supabase.from("app_user").select("locale").eq("id", user.id).single(),
    supabase.from("member_profile").select("id, display_name"),
  ]);

  const locale: Locale = appUser?.locale === "hi" ? "hi" : "en";
  const safeMembers = (members ?? []) as { id: string; display_name: string }[];

  const today = new Date().toISOString().split("T")[0]!;

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-bold text-primary-ink">
        {t(locale, "records.action.create_title")}
      </h1>

      {safeMembers.length === 0 ? (
        <p className="text-sm text-muted">{t(locale, "members.empty.description")}</p>
      ) : (
        <RecordForm locale={locale} members={safeMembers} defaultDate={today} />
      )}
    </main>
  );
}
