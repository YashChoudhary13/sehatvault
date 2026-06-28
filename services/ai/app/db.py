import asyncpg
from .config import settings


class Database:
    def __init__(self) -> None:
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=4)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()

    async def read_jobs(self, n: int) -> list[dict]:
        rows = await self._pool.fetch(
            "select msg_id, read_ct, message from pgmq.read($1, $2, $3)",
            "ai_jobs", settings.visibility_timeout_s, n,
        )
        return [
            {"msg_id": r["msg_id"], "read_ct": r["read_ct"], "record_id": r["message"]["record_id"]}
            for r in rows
        ]

    async def delete_job(self, msg_id: int) -> None:
        await self._pool.execute("select pgmq.delete($1, $2)", "ai_jobs", msg_id)

    async def archive_job(self, msg_id: int) -> None:
        await self._pool.execute("select pgmq.archive($1, $2)", "ai_jobs", msg_id)

    async def set_status(self, record_id: str, status: str) -> None:
        await self._pool.execute(
            "update public.health_record set ocr_status = $1::ocr_status where id = $2::uuid",
            status, record_id,
        )

    async def get_record(self, record_id: str) -> dict | None:
        row = await self._pool.fetchrow(
            "select id, family_id, member_id, file_object_key, page_count "
            "from public.health_record where id = $1::uuid",
            record_id,
        )
        return dict(row) if row else None


db = Database()
