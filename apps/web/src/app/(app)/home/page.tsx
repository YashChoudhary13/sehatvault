import Link from "next/link";
import { Users, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { UploadSection } from "@/components/upload-section";
import { t, type Locale } from "@sehatvault/i18n";

type MemberRow = {
  id: string;
  display_name: string;
  relationship: string | null;
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [
    { data: appUser, error: userError },
    { data: family, error: familyError },
  ] = await Promise.all([
    supabase.from("app_user").select("locale").eq("id", user.id).single(),
    supabase
      .from("family")
      .select("id, name, member_profile(id, display_name, relationship)")
      .single(),
  ]);

  const locale: Locale = appUser?.locale === "hi" ? "hi" : "en";

  // Designed error state rather than a blank screen on DB failure
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

  return (
    <main className="mx-auto max-w-lg p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary-ink">
          {family?.name ?? t(locale, "app.name")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t(locale, "home.subtitle")}
        </p>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t(locale, "members.empty.title")}
          description={t(locale, "members.empty.description")}
          actionButton={
            <Button asChild>
              <Link href="/members/new">
                {t(locale, "members.empty.action")}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <UploadSection members={members} locale={locale} />
          <ul className="mt-4 space-y-3">
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
