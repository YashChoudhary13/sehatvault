import logging
from .db import db
from .callback import post_result

log = logging.getLogger("worker")


async def process_job(record_id: str) -> None:
    """Task 2 stub: prove the lifecycle. Real stages wired in Task 3+."""
    await db.set_status(record_id, "processing")
    payload = {
        "record_id": record_id,
        "status": "done",
        "extracted": {"stub": True},
        "lab_values": [],
        "medications": [],
        "embeddings": [],
        "summary": None,
        "summary_hi": None,
    }
    await post_result(payload)
    log.info("processed record_id=%s (stub)", record_id)
