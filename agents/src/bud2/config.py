from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = Field(default="development", alias="ENV")
    log_level: str = Field(default="info", alias="LOG_LEVEL")
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8090, alias="PORT")

    bud2_api_base_url: str = Field(default="http://localhost:8080", alias="BUD2_API_BASE_URL")
    bud2_api_token: str | None = Field(default=None, alias="BUD2_API_TOKEN")
    allow_static_bud2_token_in_production: bool = Field(
        default=False,
        alias="ALLOW_STATIC_BUD2_TOKEN_IN_PRODUCTION",
    )

    agents_database_url: str | None = Field(default=None, alias="AGENTS_DATABASE_URL")

    google_cloud_project: str | None = Field(default=None, alias="GOOGLE_CLOUD_PROJECT")
    google_cloud_location: str = Field(default="us-central1", alias="GOOGLE_CLOUD_LOCATION")
    gemini_model: str = Field(default="gemini-2.0-flash", alias="GEMINI_MODEL")

    whatsapp_verify_token: str | None = Field(default=None, alias="WHATSAPP_VERIFY_TOKEN")
    whatsapp_app_secret: str | None = Field(default=None, alias="WHATSAPP_APP_SECRET")
    whatsapp_access_token: str | None = Field(default=None, alias="WHATSAPP_ACCESS_TOKEN")
    whatsapp_phone_number_id: str | None = Field(default=None, alias="WHATSAPP_PHONE_NUMBER_ID")

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
