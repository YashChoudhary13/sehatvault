import json
from pydantic import ValidationError
from .. import llm
from ..schemas import Extracted

_PROMPT = """You are a medical-document extraction engine for India. Read the attached
document image(s) and return ONLY a JSON object, no prose, matching exactly this shape:
{"type": one of ["prescription","lab_report","scan","discharge","vaccination","bill","other"],
 "title": short human title or null,
 "doc_date": ISO date YYYY-MM-DD or null,
 "facility": clinic/lab/hospital name or null,
 "doctor": doctor name or null,
 "raw_values": [ {"name": analyte as printed, "value": string, "unit": string or null,
                  "ref_range": string or null} ],
 "confidence": 0.0 to 1.0 overall extraction confidence}
Extract every lab analyte you can read into raw_values. If the document is not medical,
use type "other" and confidence below 0.4."""


async def run(images: list[str]) -> Extracted:
    if not images:
        return Extracted(type="other", confidence=0.0)
    raw = await llm.vision_json(_PROMPT, images)
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        return Extracted(type="other", confidence=0.0)
    try:
        data = json.loads(text[start:end + 1])
    except (ValueError, json.JSONDecodeError):
        return Extracted(type="other", confidence=0.0)
    try:
        return Extracted(**{k: v for k, v in data.items() if k in Extracted.model_fields})
    except ValidationError:
        return Extracted(type="other", confidence=0.0)
