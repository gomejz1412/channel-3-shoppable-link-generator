from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from deps import require_auth
from schemas import SettingsResponse, SettingsUpdate
from utils import get_settings, get_feed_settings

router = APIRouter(prefix="/admin/settings", tags=["admin"])

@router.get("/", response_model=SettingsResponse)
def read_settings(
    feed: str | None = None,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Return settings for a specific feed. Defaults to 'default'.
    """
    use_feed = (feed or "default").strip().lower()
    if use_feed not in ("default", "wwib"):
        use_feed = "default"
    fs = get_feed_settings(db, use_feed)
    return SettingsResponse(avatar_url=fs.avatar_url)

@router.put("/", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    feed: str | None = None,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Update settings for a specific feed. Defaults to 'default'.
    """
    use_feed = (feed or "default").strip().lower()
    if use_feed not in ("default", "wwib"):
        use_feed = "default"
    fs = get_feed_settings(db, use_feed)
    if payload.avatar_url is not None:
        fs.avatar_url = payload.avatar_url
        db.add(fs)
        db.commit()
        db.refresh(fs)
    return SettingsResponse(avatar_url=fs.avatar_url)
