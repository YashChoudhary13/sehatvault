import json
from app.pipeline import extract
from app.schemas import Extracted


async def test_malformed_confidence_falls_back_safely(monkeypatch):
    """LLM returns confidence as string — pydantic ValidationError must not propagate."""
    payload = json.dumps({"type": "lab_report", "confidence": "high"})

    async def _stub(prompt, images, **kwargs):
        return payload

    monkeypatch.setattr("app.llm.vision_json", _stub)
    result = await extract.run(["data:image/jpeg;base64,x"])
    assert isinstance(result, Extracted)
    assert result.confidence == 0.0


async def test_happy_path_returns_extracted_fields(monkeypatch):
    """Valid LLM JSON produces a correctly populated Extracted model."""
    payload = json.dumps(
        {"type": "lab_report", "title": "CBC", "confidence": 0.9, "raw_values": []}
    )

    async def _stub(prompt, images, **kwargs):
        return payload

    monkeypatch.setattr("app.llm.vision_json", _stub)
    result = await extract.run(["data:image/jpeg;base64,x"])
    assert result.type == "lab_report"
    assert result.title == "CBC"
    assert result.confidence == 0.9
