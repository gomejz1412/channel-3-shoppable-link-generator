try:
    from pydantic_settings import BaseSettings
except Exception:
    from pydantic import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    admin_password: str
    session_secret: str
    database_url: str = "sqlite:///./app.db"
    public_feed_enabled: bool = True
    eve_api_key: str = "CHANGE_ME"
    gemini_api_key: Optional[str] = None
    
    class Config:
        env_file = ".env"

settings = Settings()
