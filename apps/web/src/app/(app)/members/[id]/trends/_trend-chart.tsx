"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ANALYTES } from "@sehatvault/core";
import { Card } from "@sehatvault/ui";

export type LabPoint = {
  measured_at: string;
  value: number;
  unit: string;
  flag: string | null;
  ref_low: number | null;
  ref_high: number | null;
};

type AnalyteSeries = {
  analyte: string;
  points: LabPoint[];
};

const CHART_W = 480;
const CHART_H = 160;
const PAD = { top: 16, right: 16, bottom: 32, left: 48 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

function lerp(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  if (inMax === inMin) return (outMin + outMax) / 2;
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function FlagIcon({ flag }: { flag: string | null }) {
  if (flag === "high") return <TrendingUp className="h-4 w-4 text-[var(--color-warn)]" aria-hidden="true" />;
  if (flag === "low") return <TrendingDown className="h-4 w-4 text-[var(--color-warn)]" aria-hidden="true" />;
  return <Minus className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />;
}

function flagLabel(
  flag: string | null,
  labels: { high: string; low: string; normal: string },
): string {
  if (flag === "high") return labels.high;
  if (flag === "low") return labels.low;
  return labels.normal;
}

function SingleChart({
  series,
  flagLabels,
  refRangeLabel,
}: {
  series: AnalyteSeries;
  flagLabels: { high: string; low: string; normal: string };
  refRangeLabel: string;
}) {
  const def = ANALYTES[series.analyte];
  const label = def?.label ?? series.analyte;
  const unit = def?.unit ?? series.points[0]?.unit ?? "";

  const values = series.points.map((p) => p.value);
  const refLow = series.points[0]?.ref_low ?? def?.refLow;
  const refHigh = series.points[0]?.ref_high ?? def?.refHigh;

  const allValues = [
    ...values,
    ...(refLow != null ? [refLow] : []),
    ...(refHigh != null ? [refHigh] : []),
  ];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const padding = (rawMax - rawMin) * 0.15 || 1;
  const vMin = rawMin - padding;
  const vMax = rawMax + padding;

  const toY = (v: number) => lerp(v, vMin, vMax, INNER_H, 0);
  const toX = (i: number) => series.points.length === 1 ? INNER_W / 2 : lerp(i, 0, series.points.length - 1, 0, INNER_W);

  const pts = series.points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(" ");

  const latestFlag = series.points[series.points.length - 1]?.flag ?? null;
  const latestValue = series.points[series.points.length - 1]?.value;

  const refBandY1 = refHigh != null ? toY(refHigh) : null;
  const refBandY2 = refLow != null ? toY(refLow) : null;
  const refBandHeight =
    refBandY1 != null && refBandY2 != null ? refBandY2 - refBandY1 : null;

  const chartId = `chart-${series.analyte}`;
  const titleId = `${chartId}-title`;
  const descId = `${chartId}-desc`;

  return (
    <Card className="p-4 sm:p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[var(--color-ink)]">{label}</h3>
        <span className="flex items-center gap-1 text-sm text-[var(--color-muted)]">
          <FlagIcon flag={latestFlag} />
          <span>{flagLabel(latestFlag, flagLabels)}</span>
        </span>
      </div>

      {/* SVG chart */}
      <svg
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full overflow-visible"
        style={{ maxHeight: "160px" }}
      >
        <title id={titleId}>{label} trend</title>
        <desc id={descId}>
          {series.points.map((p) => `${p.measured_at}: ${p.value} ${unit}`).join("; ")}
          {refLow != null && refHigh != null
            ? `. ${refRangeLabel}: ${refLow}–${refHigh} ${unit}`
            : ""}
        </desc>

        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Ref-range band */}
          {refBandY1 != null && refBandHeight != null && refBandHeight > 0 && (
            <rect
              x={0}
              y={refBandY1}
              width={INNER_W}
              height={refBandHeight}
              fill="var(--color-primary)"
              fillOpacity={0.08}
            />
          )}

          {/* Polyline */}
          {series.points.length > 1 && (
            <polyline
              points={pts}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="motion-reduce:transition-none"
            />
          )}

          {/* Point markers */}
          {series.points.map((p, i) => (
            <circle
              key={i}
              cx={toX(i)}
              cy={toY(p.value)}
              r={4}
              fill="var(--color-surface)"
              stroke={
                p.flag === "high" || p.flag === "low"
                  ? "var(--color-warn)"
                  : "var(--color-primary)"
              }
              strokeWidth={2}
            />
          ))}

          {/* Y-axis labels */}
          <text x={-6} y={0} textAnchor="end" fontSize={10} fill="var(--color-muted)" dominantBaseline="middle">
            {vMax.toFixed(1)}
          </text>
          <text x={-6} y={INNER_H} textAnchor="end" fontSize={10} fill="var(--color-muted)" dominantBaseline="middle">
            {vMin.toFixed(1)}
          </text>

          {/* X-axis date labels (first + last only) */}
          {series.points.length >= 1 && (
            <text x={toX(0)} y={INNER_H + 14} textAnchor="middle" fontSize={9} fill="var(--color-muted)">
              {series.points[0]!.measured_at}
            </text>
          )}
          {series.points.length > 1 && (
            <text x={toX(series.points.length - 1)} y={INNER_H + 14} textAnchor="middle" fontSize={9} fill="var(--color-muted)">
              {series.points[series.points.length - 1]!.measured_at}
            </text>
          )}
        </g>
      </svg>

      {/* Latest value + unit */}
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {latestValue != null ? `${latestValue} ${unit}` : ""}
        {refLow != null && refHigh != null
          ? `  ·  ${refRangeLabel}: ${refLow}–${refHigh} ${unit}`
          : ""}
      </p>

      {/* Screen-reader table fallback */}
      <table className="sr-only">
        <caption>{label} readings</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Value ({unit})</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {series.points.map((p, i) => (
            <tr key={i}>
              <td>{p.measured_at}</td>
              <td>{p.value}</td>
              <td>{flagLabel(p.flag, flagLabels)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function TrendChart({
  series,
  flagLabels,
  refRangeLabel,
}: {
  series: AnalyteSeries[];
  flagLabels: { high: string; low: string; normal: string };
  refRangeLabel: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {series.map((s) => (
        <SingleChart key={s.analyte} series={s} flagLabels={flagLabels} refRangeLabel={refRangeLabel} />
      ))}
    </div>
  );
}
