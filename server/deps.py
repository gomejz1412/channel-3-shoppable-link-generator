from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from config import settings

def get_current_user(request: Request):
    """Get current user from session"""
    user = request.session.get("user")
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return user

def verify_admin_password(password: str):
    """Verify admin password"""
    return password == settings.admin_password

def require_auth(request: Request):
    """Dependency for routes that require authentication"""
    return get_current_user(request)

def require_public_feed_enabled():
    """Dependency to check if public feed is enabled"""
    if not settings.public_feed_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Public feed is disabled"
        )
