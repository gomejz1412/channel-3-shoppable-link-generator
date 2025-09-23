from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import os
import time
from database import get_db
from deps import require_auth
from config import settings
from models import Product


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
