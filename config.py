from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    whisper_model: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    diarization_method: str = "auto"
    hf_token: str = ""

    upload_dir: str = "uploads"
    db_path: str = "data/app.db"
    max_upload_mb: int = 2000
    cors_origins: str = "http://localhost:5173"

    model_config = {"env_file": ".env"}

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir)

    @property
    def database_path(self) -> Path:
        return Path(self.db_path)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()