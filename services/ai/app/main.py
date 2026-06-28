import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .config import settings
from .db import db
from .worker import process_job

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("main")


async def drain_loop() -> None:
    while True:
        try:
            jobs = await db.read_jobs(n=5)
            for job in jobs:
                try:
                    await process_job(job["record_id"])
                    await db.delete_job(job["msg_id"])
                except Exception:
                    log.exception("job failed msg_id=%s", job["msg_id"])
                    if job["read_ct"] >= settings.max_attempts:
                        await db.set_status(job["record_id"], "failed")
                        await db.archive_job(job["msg_id"])
            if not jobs:
                await asyncio.sleep(settings.poll_interval_s)
        except Exception:
            log.exception("drain loop error")
            await asyncio.sleep(settings.poll_interval_s)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    task = asyncio.create_task(drain_loop())
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
    await db.close()


app = FastAPI(lifespan=lifespan)


@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}
