import logging
from .db import db
from .callback import post_result
from .pipeline import preprocess, extract, classify, normalise, embed

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

    lab_values = normalise.normalise_values(extracted.raw_values, extracted.doc_date)

    chunks = embed.build_chunks(extracted, lab_values)
    embeddings = await embed.run(chunks)

    status = "needs_review" if extracted.confidence < CONFIDENCE_FLOOR else "done"
    payload = {
        "record_id": record_id,
        "status": status,
        "extracted": extracted.model_dump(),
        "lab_values": [lv.model_dump() for lv in lab_values],
        "medications": [],
        "embeddings": [e.model_dump() for e in embeddings],
        "summary": None,       # Task 7
        "summary_hi": None,
    }
    await post_result(payload)
    log.info("processed record_id=%s status=%s pages=%d", record_id, status, len(images))
