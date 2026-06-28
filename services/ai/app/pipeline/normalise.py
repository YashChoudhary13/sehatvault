import re
from ..schemas import LabValue

# Mirror of packages/core/src/lab.ts ANALYTES. Keep in sync (both are small, change rarely).
ANALYTES = {
    "hba1c": (["hba1c", "glycated haemoglobin", "glycated hemoglobin", "a1c"], "%", 4.0, 5.6),
    "fasting_glucose": (["fasting glucose", "fasting blood sugar", "fbs", "glucose fasting"], "mg/dL", 70.0, 100.0),
    "tsh": (["tsh", "thyroid stimulating hormone"], "µIU/mL", 0.4, 4.0),
    "hemoglobin": (["hemoglobin", "haemoglobin", "hb", "hgb"], "g/dL", 12.0, 17.0),
    "creatinine": (["creatinine", "serum creatinine"], "mg/dL", 0.6, 1.3),
    "systolic_bp": (["systolic", "systolic bp", "sbp"], "mmHg", 90.0, 120.0),
    "diastolic_bp": (["diastolic", "diastolic bp", "dbp"], "mmHg", 60.0, 80.0),
}
_ALIAS = {a: k for k, (aliases, *_rest) in ANALYTES.items() for a in aliases}


def _canonical(raw: str) -> str | None:
    return _ALIAS.get(raw.strip().lower())


def _num(raw) -> float | None:
    if raw is None:
        return None
    m = re.search(r"-?\d+(\.\d+)?", str(raw))
    return float(m.group()) if m else None


def normalise_values(raw_values: list[dict], doc_date: str | None) -> list[LabValue]:
    out: list[LabValue] = []
    for rv in raw_values:
        analyte = _canonical(str(rv.get("name", "")))
        value = _num(rv.get("value"))
        if analyte is None or value is None:
            continue
        _aliases, unit, ref_low, ref_high = ANALYTES[analyte]
        if value < ref_low:
            flag = "low"
        elif value > ref_high:
            flag = "high"
        else:
            flag = "normal"
        out.append(LabValue(
            analyte=analyte, value=value, unit=rv.get("unit") or unit,
            measured_at=doc_date, ref_low=ref_low, ref_high=ref_high, flag=flag,
        ))
    return out
