from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    app_name: str = "Stage API"
    version: str = "1.0.0"
    db_url: str = "sqlite:///./app.db"
    cors_origins: List[str] = ["http://localhost:5173"]
    require_auth: bool = False  # toggle auth zonder code-aanpassing

    class Config:
        env_file = ".env"

settings = Settings()
