from .. import llm
from ..schemas import Embedding, Extracted, LabValue

EMBED_DIM = 768


def build_chunks(extracted: Extracted, lab_values: list[LabValue]) -> list[str]:
    parts = [extracted.title or "", extracted.facility or "", extracted.doctor or ""]
    parts += [f"{lv.analyte} {lv.value}{lv.unit or ''}" for lv in lab_values]
    text = " | ".join(p for p in parts if p).strip()
    return [text] if text else []


async def run(chunks: list[str]) -> list[Embedding]:
    if not chunks:
        return []
    try:
        vectors = await llm.embed(chunks)
    except Exception:
        return []  # embeddings are Should; never fail the record over them
    return [Embedding(chunk=c, vector=v) for c, v in zip(chunks, vectors) if len(v) == EMBED_DIM]
