import json
from functools import lru_cache

from pydantic import Field
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = Field(default="pos-restaurante", alias="APP_NAME")
    app_version: str = Field(default="0.1.0", alias="APP_VERSION")
    database_url: str = Field(default="postgresql+psycopg://pos_user:change_me@db:5432/pos_restaurante", alias="DATABASE_URL")
    api_cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:8081"], alias="API_CORS_ORIGINS")
    media_root: str = Field(default="uploads", alias="MEDIA_ROOT")
    secret_key: str = Field(default="change-me-in-production", alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=720, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    initial_restaurant_name: str = Field(default="El Tacazo", alias="INITIAL_RESTAURANT_NAME")
    initial_business_name: str = Field(default="El Tacazo", alias="INITIAL_BUSINESS_NAME")
    initial_admin_username: str = Field(default="admin", alias="INITIAL_ADMIN_USERNAME")
    initial_admin_password: str = Field(default="admin123", alias="INITIAL_ADMIN_PASSWORD")
    initial_admin_full_name: str = Field(default="Administrador", alias="INITIAL_ADMIN_FULL_NAME")

    @field_validator("api_cors_origins", mode="before")
    @classmethod
    def parse_api_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            if value.startswith("["):
                try:
                    parsed = json.loads(value)
                except json.JSONDecodeError:
                    parsed = None
                if isinstance(parsed, list):
                    return [str(origin).strip() for origin in parsed if str(origin).strip()]
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return ["http://localhost:8081"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
