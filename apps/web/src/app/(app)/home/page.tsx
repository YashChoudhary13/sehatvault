import Link from "next/link";
import { Users, AlertCircle, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { UploadSection } from "@/components/upload-section";
import { RecordCard } from "@/components/record-card";
import { DashboardStatsRow } from "@/components/dashboard-stats";
import { MotionTierBox } from "@sehatvault/ui/motion";
import { t, type Locale } from "@sehatvault/i18n";
import { summarizeDashboard } from "@sehatvault/core";

type MemberRow = {
  id: string;
  display_name: string;
  relationship: string | null;
};

type RecordRow = {
  id: string;
  title: string | null;
  type: string;
  ocr_status: string;
  source: string;
  record_date: string | null;
  file_object_key: string | null;
  created_at: string;
  member_id: string;
};

const RECENT_LIMIT = 5;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [
    { data: appUser, error: userError },
    { data: family, error: familyError },
    { data: records },
  ] = await Promise.all([
    supabase.from("app_user").select("locale").eq("id", user.id).single(),
    supabase
      .from("family")
      .select("id, name, member_profile(id, display_name, relationship)")
      .single(),
    supabase
      .from("health_record")
      .select(
        "id, title, type, ocr_status, source, record_date, file_object_key, created_at, member_id",
      )
      .order("record_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const locale: Locale = appUser?.locale === "hi" ? "hi" : "en";

  if (userError ?? familyError) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <EmptyState
          icon={AlertCircle}
          title={t(locale, "home.error.title")}
          description={t(locale, "home.error.description")}
          intent="error"
        />
      </main>
    );
  }

  const members = (family?.member_profile ?? []) as MemberRow[];
  const safeRecords = (records ?? []) as RecordRow[];

  const stats = summarizeDashboard(members, safeRecords, new Date());
  const recentRecords = safeRecords.slice(0, RECENT_LIMIT);
  const memberNames = Object.fromEntries(
    members.map((m) => [m.id, m.display_name]),
  );

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      {/* Greeting + family name */}
      <MotionTierBox tier="calm">
        <div>
          <p className="text-sm text-muted">
            {t(locale, "home.greeting")}, {family?.name}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {t(locale, "home.subtitle")}
          </p>
        </div>
      </MotionTierBox>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t(locale, "members.empty.title")}
          description={t(locale, "members.empty.description")}
          action={
            <Button asChild>
              <Link href="/members/new">
                {t(locale, "members.empty.action")}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Stats row */}
          <MotionTierBox tier="calm">
            <DashboardStatsRow
              stats={stats}
              labels={{
                members: t(locale, "home.stats.members"),
                records: t(locale, "home.stats.records"),
                recent: t(locale, "home.stats.recent"),
              }}
            />
          </MotionTierBox>

          {/* Upload CTA */}
          <UploadSection members={members} locale={locale} />

          {/* Recent records strip */}
          <MotionTierBox tier="calm">
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                {t(locale, "home.recent.title")}
              </h2>

              {recentRecords.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={t(locale, "home.recent.empty")}
                  description={t(locale, "records.empty.description")}
                />
              ) : (
                <ul className="space-y-2.5">
                  {recentRecords.map((record) => {
                    const memberName = memberNames[record.member_id] ?? "—";
                    const title =
                      record.title ??
                      record.file_object_key?.split("/").pop() ??
                      t(locale, "records.detail.untitled");
                    const typeLabel = t(locale, `records.type.${record.type}`);
                    const statusLabel = t(
                      locale,
                      `records.status.${record.ocr_status}`,
                    );
                    const dateStr = record.record_date ?? record.created_at;
                    const displayDate = new Date(dateStr).toLocaleDateString(
                      locale === "hi" ? "hi-IN" : "en-IN",
                      { day: "numeric", month: "short", year: "numeric" },
                    );
                    return (
                      <li key={record.id}>
                        <RecordCard
                          id={record.id}
                          title={title}
                          type={record.type}
                          ocrStatus={record.ocr_status}
                          statusLabel={statusLabel}
                          typeLabel={typeLabel}
                          memberName={memberName}
                          displayDate={displayDate}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}

              {safeRecords.length > RECENT_LIMIT && (
                <div className="mt-4 text-center">
                  <Link
                    href="/records"
                    className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm"
                  >
                    {t(locale, "records.list.title")} →
                  </Link>
                </div>
              )}
            </div>
          </MotionTierBox>

          {/* Member navigation */}
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/members/${m.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-[border-color,background-color,transform] duration-150 hover:border-primary/30 hover:bg-bg active:scale-[0.97]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                    {m.display_name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary-ink">
                      {m.display_name}
                    </p>
                    {m.relationship ? (
                      <p className="mt-0.5 text-xs capitalize text-muted">
                        {m.relationship}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
