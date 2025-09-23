from pydantic import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    admin_password: str
    session_secret: str
    database_url: str = "sqlite:///./app.db"
    public_feed_enabled: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()
