export interface AnalyteDef {
  label: string;
  unit: string;
  refLow?: number;
  refHigh?: number;
  aliases: string[];
}

export const ANALYTES: Record<string, AnalyteDef> = {
  hba1c: { label: "HbA1c", unit: "%", refLow: 4, refHigh: 5.6,
    aliases: ["hba1c", "glycated haemoglobin", "glycated hemoglobin", "a1c"] },
  fasting_glucose: { label: "Fasting Glucose", unit: "mg/dL", refLow: 70, refHigh: 100,
    aliases: ["fasting glucose", "fasting blood sugar", "fbs", "glucose fasting"] },
  tsh: { label: "TSH", unit: "µIU/mL", refLow: 0.4, refHigh: 4.0,
    aliases: ["tsh", "thyroid stimulating hormone"] },
  hemoglobin: { label: "Hemoglobin", unit: "g/dL", refLow: 12, refHigh: 17,
    aliases: ["hemoglobin", "haemoglobin", "hb", "hgb"] },
  creatinine: { label: "Creatinine", unit: "mg/dL", refLow: 0.6, refHigh: 1.3,
    aliases: ["creatinine", "serum creatinine"] },
  systolic_bp: { label: "Systolic BP", unit: "mmHg", refLow: 90, refHigh: 120,
    aliases: ["systolic", "systolic bp", "sbp"] },
  diastolic_bp: { label: "Diastolic BP", unit: "mmHg", refLow: 60, refHigh: 80,
    aliases: ["diastolic", "diastolic bp", "dbp"] },
};

const ALIAS_INDEX: Record<string, string> = Object.fromEntries(
  Object.entries(ANALYTES).flatMap(([k, def]) => def.aliases.map((a) => [a, k])),
);

export function canonicalAnalyte(raw: string): string | null {
  return ALIAS_INDEX[raw.trim().toLowerCase()] ?? null;
}
