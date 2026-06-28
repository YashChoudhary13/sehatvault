from .. import llm
from ..schemas import Extracted, LabValue

DISCLAIMER_EN = " This is not medical advice; consult a doctor."
DISCLAIMER_HI = " यह चिकित्सकीय सलाह नहीं है; डॉक्टर से सलाह लें।"

_PROMPT = """In one short plain sentence ({lang}), summarise this medical record for a
non-expert family caregiver. Do not give advice. Record type: {type}. Title: {title}.
Key values: {values}. Reply with only the sentence."""


def append_disclaimer(text: str, lang: str) -> str:
    d = DISCLAIMER_HI if lang == "hi" else DISCLAIMER_EN
    return text if text.rstrip().endswith(d.strip()) else text.rstrip() + d


async def _one(extracted: Extracted, values: str, lang: str) -> str | None:
    try:
        prompt = _PROMPT.format(
            lang="English" if lang == "en" else "Hindi",
            type=extracted.type,
            title=extracted.title or "—",
            values=values or "—",
        )
        text = (await llm.text(prompt)).strip()
        return append_disclaimer(text, lang) if text else None
    except Exception:
        return None


async def run(extracted: Extracted, lab_values: list[LabValue]) -> tuple[str | None, str | None]:
    values = ", ".join(
        f"{lv.analyte} {lv.value}{lv.unit or ''} ({lv.flag})" for lv in lab_values
    )
    return await _one(extracted, values, "en"), await _one(extracted, values, "hi")
