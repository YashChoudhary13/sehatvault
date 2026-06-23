import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { t, type Locale } from "@sehatvault/i18n";
import { DeleteMemberButton } from "@/components/delete-member-button";

type MemberProfile = {
  id: string;
  display_name: string;
  relationship: string | null;
  dob: string | null;
  sex: "male" | "female" | "other" | "unknown";
  blood_group: string | null;
  allergies: string[];
  chronic_conditions: string[];
  emergency_contact: unknown;
};

export default async function MemberProfilePage({
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
    supabase.from("member_profile").select("*").eq("id", id).single(),
    supabase.from("app_user").select("locale").eq("id", user.id).single(),
  ]);

  if (!raw) notFound();

  const member = raw as unknown as MemberProfile;
  const locale: Locale = appUser?.locale === "hi" ? "hi" : "en";

  const allergies = (member.allergies ?? []) as string[];
  const conditions = (member.chronic_conditions ?? []) as string[];
  const emergencyContact =
    typeof member.emergency_contact === "string"
      ? member.emergency_contact
      : null;

  return (
    <main className="mx-auto max-w-lg space-y-5 p-6">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
          {member.display_name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-primary-ink">
            {member.display_name}
          </h1>
          {member.relationship && (
            <p className="text-sm capitalize text-muted">
              {member.relationship}
            </p>
          )}
        </div>
        <Link
          href={`/members/${id}/edit`}
          className="shrink-0 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-primary-ink hover:bg-bg"
        >
          {t(locale, "members.profile.edit")}
        </Link>
      </div>

      {/* ── Basic info ────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold text-primary-ink">
          {t(locale, "members.profile.section.basic")}
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">
              {t(locale, "members.profile.dob")}
            </dt>
            <dd className="text-right text-ink">
              {member.dob ?? t(locale, "members.profile.none")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">
              {t(locale, "members.profile.sex")}
            </dt>
            <dd className="text-right text-ink">
              {t(locale, `members.form.sex.${member.sex}`)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">
              {t(locale, "members.profile.blood_group")}
            </dt>
            <dd className="text-right text-ink">
              {member.blood_group ?? t(locale, "members.profile.none")}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Medical info ──────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold text-primary-ink">
          {t(locale, "members.profile.section.medical")}
        </h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="mb-1 text-muted">
              {t(locale, "members.profile.allergies")}
            </dt>
            <dd className="text-ink">
              {allergies.length > 0
                ? allergies.join(", ")
                : t(locale, "members.profile.none")}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-muted">
              {t(locale, "members.profile.conditions")}
            </dt>
            <dd className="text-ink">
              {conditions.length > 0
                ? conditions.join(", ")
                : t(locale, "members.profile.none")}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Emergency contact ─────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold text-primary-ink">
          {t(locale, "members.profile.section.emergency")}
        </h2>
        <p className="text-sm text-ink">
          {emergencyContact ?? t(locale, "members.profile.none")}
        </p>
      </section>

      {/* ── Danger zone ───────────────────────────────────────────── */}
      <section className="rounded-lg border border-danger/30 bg-danger/5 p-5">
        <h2 className="mb-3 font-semibold text-danger">
          {t(locale, "members.profile.section.danger")}
        </h2>
        <DeleteMemberButton memberId={id} />
      </section>

    </main>
  );
}
