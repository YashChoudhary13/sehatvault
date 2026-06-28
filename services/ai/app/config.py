from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    callback_url: str = "http://localhost:3000/api/ai/callback"
    callback_secret: str = ""

    supabase_url: str = ""
    supabase_service_role_key: str = ""

    openai_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    openai_api_key: str = ""
    extraction_model: str = "gemini-2.5-flash"
    summary_model: str = "gemini-2.5-flash"
    embedding_model: str = "text-embedding-004"

    poll_interval_s: float = 2.0
    visibility_timeout_s: int = 120
    max_attempts: int = 3


settings = Settings()
