from openai import AsyncOpenAI
from .config import settings

_client = AsyncOpenAI(base_url=settings.openai_base_url, api_key=settings.openai_api_key or "x")


async def vision_json(prompt: str, image_data_uris: list[str], model: str | None = None) -> str:
    """Vision call returning raw model text (expected JSON). Caller parses/validates."""
    content: list[dict] = [{"type": "text", "text": prompt}]
    content += [{"type": "image_url", "image_url": {"url": uri}} for uri in image_data_uris]
    resp = await _client.chat.completions.create(
        model=model or settings.extraction_model,
        messages=[{"role": "user", "content": content}],
        temperature=0,
    )
    return resp.choices[0].message.content or ""


async def text(prompt: str, model: str | None = None) -> str:
    resp = await _client.chat.completions.create(
        model=model or settings.summary_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return resp.choices[0].message.content or ""


async def embed(chunks: list[str]) -> list[list[float]]:
    resp = await _client.embeddings.create(model=settings.embedding_model, input=chunks)
    return [d.embedding for d in resp.data]
