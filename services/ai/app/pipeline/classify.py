RECORD_TYPES = {"prescription", "lab_report", "scan", "discharge", "vaccination", "bill", "other"}

_ALIASES = {
    "prescription": "prescription", "rx": "prescription",
    "lab": "lab_report", "lab report": "lab_report", "labreport": "lab_report",
    "pathology": "lab_report", "blood test": "lab_report", "test report": "lab_report",
    "scan": "scan", "x-ray": "scan", "xray": "scan", "mri": "scan", "ct": "scan",
    "ultrasound": "scan", "radiology": "scan", "imaging": "scan",
    "discharge": "discharge", "discharge summary": "discharge",
    "vaccination": "vaccination", "vaccine": "vaccination", "immunization": "vaccination",
    "bill": "bill", "invoice": "bill", "receipt": "bill",
}


def to_record_type(raw_type: str | None) -> str:
    if not raw_type:
        return "other"
    key = raw_type.strip().lower()
    if key in RECORD_TYPES:
        return key
    return _ALIASES.get(key, "other")
