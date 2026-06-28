import { notFound } from "next/navigation";
import { LineChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { t, type Locale } from "@sehatvault/i18n";
import { EmptyState } from "@sehatvault/ui";
import { TrendChart, type LabPoint } from "./_trend-chart";

type RawLabValue = {
  analyte: string;
  value: number;
  unit: string | null;
  measured_at: string | null;
  ref_low: number | null;
  ref_high: number | null;
  flag: string | null;
};

export default async function TrendsPage({
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

  const [{ data: memberRaw }, { data: appUser }, { data: labRows }] =
    await Promise.all([
      supabase
        .from("member_profile")
        .select("id, display_name")
        .eq("id", id)
        .single(),
      supabase.from("app_user").select("locale").eq("id", user.id).single(),
      supabase
        .from("lab_value")
        .select("analyte, value, unit, measured_at, ref_low, ref_high, flag")
        .eq("member_id", id)
        .order("measured_at", { ascending: true }),
    ]);

  if (!memberRaw) notFound();

  const locale: Locale = appUser?.locale === "hi" ? "hi" : "en";
  const rows = (labRows ?? []) as RawLabValue[];

  // Group by analyte, drop rows without a date or value
  const grouped = new Map<string, LabPoint[]>();
  for (const row of rows) {
    if (row.measured_at == null) continue;
    const point: LabPoint = {
      measured_at: row.measured_at,
      value: row.value,
      unit: row.unit ?? "",
      flag: row.flag,
      ref_low: row.ref_low,
      ref_high: row.ref_high,
    };
    const list = grouped.get(row.analyte) ?? [];
    list.push(point);
    grouped.set(row.analyte, list);
  }

  const series = Array.from(grouped.entries()).map(([analyte, points]) => ({
    analyte,
    points,
  }));

  const flagLabels = {
    high: t(locale, "trends.flag.high"),
    low: t(locale, "trends.flag.low"),
    normal: t(locale, "trends.flag.normal"),
  };
  const refRangeLabel = t(locale, "trends.ref_range");

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <h1 className="text-xl font-bold text-[var(--color-ink)]">
        {t(locale, "trends.title")}
      </h1>

      {series.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title={t(locale, "trends.empty")}
        />
      ) : (
        <TrendChart
          series={series}
          flagLabels={flagLabels}
          refRangeLabel={refRangeLabel}
        />
      )}
    </main>
  );
}
