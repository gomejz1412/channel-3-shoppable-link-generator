from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from deps import require_auth
from schemas import SettingsResponse, SettingsUpdate
from utils import get_settings, get_feed_settings
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

router = APIRouter(prefix="/admin/settings", tags=["admin"])

@router.get("/", response_model=SettingsResponse)
@router.get("", response_model=SettingsResponse)
def read_settings(
    feed: str | None = None,
    db: Session = Depends(get_db)
):
    """
    Return settings for a specific feed. Defaults to 'default'.
    Public endpoint - no auth required to read avatars.
    """
    print(f"DEBUG: admin_settings.read_settings called with feed={feed}")
    use_feed = (feed or "default").strip().lower()
    if use_feed not in ("default", "wwib"):
        use_feed = "default"
    logger.info(f"Reading settings for feed: {use_feed}")
    fs = get_feed_settings(db, use_feed)
    return SettingsResponse(avatar_url=fs.avatar_url)

@router.put("/", response_model=SettingsResponse)
@router.put("", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    feed: str | None = None,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Update settings for a specific feed. Defaults to 'default'.
    """
    try:
        print(f"DEBUG: admin_settings.update_settings called with feed={feed}, payload={payload}")
        use_feed = (feed or "default").strip().lower()
        if use_feed not in ("default", "wwib"):
            use_feed = "default"
        logger.info(f"Updating settings for feed: {use_feed}")
        fs = get_feed_settings(db, use_feed)
        if payload.avatar_url is not None:
            fs.avatar_url = payload.avatar_url
            db.add(fs)
            db.commit()
            db.refresh(fs)
            logger.info(f"Successfully updated {use_feed} avatar")
        return SettingsResponse(avatar_url=fs.avatar_url)
    except Exception as e:
        logger.error(f"Error updating settings: {e}", exc_info=True)
        raise
