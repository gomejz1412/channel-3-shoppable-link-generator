from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from deps import require_auth
from schemas import SettingsResponse, SettingsUpdate
from utils import get_settings

router = APIRouter(prefix="/admin/settings", tags=["admin"])

@router.get("/", response_model=SettingsResponse)
def read_settings(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    settings = get_settings(db)
    return SettingsResponse(avatar_url=settings.avatar_url)

@router.put("/", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    settings = get_settings(db)
    if payload.avatar_url is not None:
        settings.avatar_url = payload.avatar_url
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return SettingsResponse(avatar_url=settings.avatar_url)
