import hashlib
import hmac
import json
import httpx
from .config import settings


def sign(body: bytes) -> str:
    digest = hmac.new(settings.callback_secret.encode(), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


async def post_result(payload: dict) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode()
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            settings.callback_url,
            content=body,
            headers={"Content-Type": "application/json", "X-Signature": sign(body)},
        )
        resp.raise_for_status()
