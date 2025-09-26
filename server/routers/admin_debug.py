from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import os
import time
import urllib.parse
import httpx
from database import get_db
from deps import require_auth
from config import settings
from models import Product
from schemas import ResolveUrlsRequest, ResolveUrlsResponse


router = APIRouter(prefix="/admin/debug", tags=["admin"])


@router.get("/db-info")
def db_info(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """
    Report database URL, resolved SQLite file path, file stats, and product count.
    Use to verify persistence across redeploys.
    """
    db_url = settings.database_url
    db_path = None


    # Resolve SQLite file path from DATABASE_URL
    if isinstance(db_url, str):
        if db_url.startswith("sqlite:////"):
            # Absolute path (e.g., sqlite:////var/data/app.db)
            db_path = "/" + db_url[len("sqlite:////"):]
        elif db_url.startswith("sqlite:///"):
            # Relative path (e.g., sqlite:///./app.db)
            db_path = db_url[len("sqlite:///"):]


    file_exists = False
    file_size = None
    file_mtime = None


    if db_path:
        try:
            file_exists = os.path.exists(db_path)
            if file_exists:
                file_size = os.path.getsize(db_path)
                file_mtime = time.strftime(
                    "%Y-%m-%dT%H:%M:%SZ", time.gmtime(os.path.getmtime(db_path))
                )
        except Exception:
            # Leave file stats as None if inspection fails
            pass


    try:
        product_count = db.query(Product).count()
    except Exception:
        product_count = None


    return {
        "database_url": db_url,
        "db_path": db_path,
        "file_exists": file_exists,
        "file_size_bytes": file_size,
        "file_mtime": file_mtime,
        "product_count": product_count,
    }


@router.post("/resolve-urls", response_model=ResolveUrlsResponse)
async def resolve_urls(
    payload: ResolveUrlsRequest,
    user = Depends(require_auth)
):
    """
    Resolve Channel 3 short links to their final destination URLs.

    - Only resolves links whose host is buy.trychannel3.com (others pass through unchanged)
    - Follows redirects (HEAD then GET fallback), with short timeouts
    - Preserves input order and length
    - Caps processing to 10 URLs
    """
    urls = list(payload.urls or [])[:10]
    resolved: list[str] = []

    timeout = httpx.Timeout(3.0, connect=3.0, read=3.0, write=3.0)
    headers = {
        "User-Agent": "Channel3-LinkResolver/1.0 (+https://trychannel3.com)"
    }

    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout, headers=headers) as client:
        for u in urls:
            try:
                parsed = urllib.parse.urlparse(u)
                host = (parsed.hostname or "").lower()
                if host != "buy.trychannel3.com":
                    # Not a Channel 3 URL, pass through unchanged
                    resolved.append(u)
                    continue

                # Try HEAD first (many link shorteners support it)
                final_url: str | None = None
                try:
                    r_head = await client.head(u)
                    final_url = str(r_head.url)
                except Exception:
                    final_url = None

                if not final_url:
                    # Fallback to GET
                    r_get = await client.get(u)
                    final_url = str(r_get.url)

                # Basic sanity check
                if final_url.startswith("http://") or final_url.startswith("https://"):
                    resolved.append(final_url)
                else:
                    resolved.append(u)
            except Exception:
                resolved.append(u)

    return ResolveUrlsResponse(resolved=resolved)
