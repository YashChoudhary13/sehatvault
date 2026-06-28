import hashlib
import hmac
import json
from app.callback import sign
from app.config import settings
from app.schemas import CallbackPayload


def test_sign_matches_hmac_sha256(monkeypatch):
    monkeypatch.setattr(settings, "callback_secret", "test-secret")
    body = b'{"record_id":"x"}'
    expected = "sha256=" + hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    assert sign(body) == expected


def test_payload_serialises_with_defaults():
    p = CallbackPayload(record_id="11111111-1111-1111-1111-111111111111", status="done")
    data = json.loads(p.model_dump_json())
    assert data["lab_values"] == [] and data["embeddings"] == []
