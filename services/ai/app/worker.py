import logging
from .db import db
from .callback import post_result
from .pipeline import preprocess, extract, classify

log = logging.getLogger("worker")
CONFIDENCE_FLOOR = 0.4


async def process_job(record_id: str) -> None:
    await db.set_status(record_id, "processing")
    record = await db.get_record(record_id)
    if record is None:
        log.warning("record gone record_id=%s", record_id)
        return

    images = await preprocess.load_images(record)
    extracted = await extract.run(images)
    extracted.type = classify.to_record_type(extracted.type)

    status = "needs_review" if extracted.confidence < CONFIDENCE_FLOOR else "done"
    payload = {
        "record_id": record_id,
        "status": status,
        "extracted": extracted.model_dump(),
        "lab_values": [],      # Task 5
        "medications": [],     # Task 5
        "embeddings": [],      # Task 6
        "summary": None,       # Task 7
        "summary_hi": None,
    }
    await post_result(payload)
    log.info("processed record_id=%s status=%s pages=%d", record_id, status, len(images))
