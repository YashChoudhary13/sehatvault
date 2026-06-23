import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
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

  // Middleware ensures auth; guard for type safety only.
  if (!user) return null;

  // Fetch locale and family+members in parallel.
  const [{ data: appUser }, { data: family }] = await Promise.all([
    supabase
      .from("app_user")
      .select("locale")
      .eq("id", user.id)
      .single(),
    supabase
      .from("family")
      .select("id, name, member_profile(id, display_name, relationship)")
      .single(),
  ]);

  const locale: Locale = appUser?.locale === "hi" ? "hi" : "en";
  const members = (family?.member_profile ?? []) as MemberRow[];

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-bold text-primary-ink">
        {family?.name ?? t(locale, "app.name")}
      </h1>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t(locale, "members.empty.title")}
          description={t(locale, "members.empty.description")}
          actionButton={
            <Link
              href="/members/new"
              className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              {t(locale, "members.empty.action")}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id}>
              <Link
                href={`/members/${m.id}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-bg"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {m.display_name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-primary-ink">
                    {m.display_name}
                  </p>
                  {m.relationship ? (
                    <p className="text-xs capitalize text-muted">
                      {m.relationship}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
