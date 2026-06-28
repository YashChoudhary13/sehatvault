import base64
import io
import httpx
from pdf2image import convert_from_bytes
from PIL import Image
from ..config import settings

MAX_PAGES = 5
MAX_EDGE = 1600


def _to_data_uri(img: Image.Image) -> str:
    img.thumbnail((MAX_EDGE, MAX_EDGE))
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/jpeg;base64,{b64}"


async def _fetch_object(file_object_key: str) -> tuple[bytes, str]:
    url = f"{settings.supabase_url}/storage/v1/object/documents/{file_object_key}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            url, headers={"Authorization": f"Bearer {settings.supabase_service_role_key}"}
        )
        resp.raise_for_status()
        return resp.content, resp.headers.get("content-type", "")


async def load_images(record: dict) -> list[str]:
    key = record.get("file_object_key")
    if not key:
        return []  # pure manual record; nothing to read
    data, content_type = await _fetch_object(key)
    if "pdf" in content_type or key.lower().endswith(".pdf"):
        pages = convert_from_bytes(data, fmt="jpeg", dpi=150)[:MAX_PAGES]
        return [_to_data_uri(p) for p in pages]
    return [_to_data_uri(Image.open(io.BytesIO(data)))]
