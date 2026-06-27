import Link from "next/link";
import { FileText, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { UploadSection } from "@/components/upload-section";
import { Button } from "@/components/ui/button";
import {
  RecordFilterChips,
  type HealthRecord,
} from "@/components/record-filter-chips";
import { t, type Locale } from "@sehatvault/i18n";

type Member = { id: string; display_name: string };

export default async function RecordsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: appUser, error: userError },
    { data: records, error: recordsError },
    { data: members },
  ] = await Promise.all([
    supabase.from("app_user").select("locale").eq("id", user.id).single(),
    supabase
      .from("health_record")
      .select(
        "id, title, type, ocr_status, source, record_date, file_object_key, created_at, member_id",
      )
      .order("record_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("member_profile").select("id, display_name"),
  ]);

  const locale: Locale = appUser?.locale === "hi" ? "hi" : "en";
  const safeMembers = (members ?? []) as Member[];
  const memberNames = Object.fromEntries(
    safeMembers.map((m) => [m.id, m.display_name]),
  );

  // Surface a designed error state instead of a blank screen on DB failure
  if (userError ?? recordsError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <EmptyState
          icon={AlertCircle}
          title={t(locale, "records.error.title")}
          description={t(locale, "records.error.description")}
          intent="error"
        />
      </main>
    );
  }

  const safeRecords = (records ?? []) as HealthRecord[];

  return (
    <main className="mx-auto max-w-2xl p-6">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-primary-ink">
          {t(locale, "records.list.title")}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/records/new">
              {t(locale, "records.action.create")}
            </Link>
          </Button>
          {safeMembers.length > 0 && (
            <UploadSection members={safeMembers} locale={locale} />
          )}
        </div>
      </div>

      {safeRecords.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t(locale, "records.empty.title")}
          description={
            safeMembers.length === 0
              ? t(locale, "members.empty.description")
              : t(locale, "records.empty.description")
          }
          action={
            safeMembers.length > 0 ? (
              <UploadSection members={safeMembers} locale={locale} />
            ) : (
              <Button asChild>
                <Link href="/members/new">
                  {t(locale, "members.empty.action")}
                </Link>
              </Button>
            )
          }
        />
      ) : (
        // Grouped + filterable timeline — interaction handled client-side
        <RecordFilterChips
          records={safeRecords}
          memberNames={memberNames}
          locale={locale}
        />
      )}
    </main>
  );
}
