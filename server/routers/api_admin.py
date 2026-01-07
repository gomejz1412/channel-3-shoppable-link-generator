from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from check_links import check_links
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/check-links")
async def trigger_check_links(
    background_tasks: BackgroundTasks,
    dry_run: bool = True,
    republish: bool = False,
    db: Session = Depends(get_db)
):
    """
    Trigger the link health checker.
    By default runs in dry_run mode.
    If republish=True, it will republish all products (undo unpublishing).
    """
    try:
        # Run in background to avoid blocking
        background_tasks.add_task(check_links, dry_run=dry_run, republish=republish)
        
        if republish:
            mode = "DRY RUN" if dry_run else "LIVE"
            return {"message": f"Republishing all products in {mode} mode. Check logs."}
            
        mode = "DRY RUN" if dry_run else "LIVE"
        return {"message": f"Link health check started in {mode} mode. Check logs for details."}
    except Exception as e:
        logger.error(f"Failed to trigger link check: {e}")
        raise HTTPException(status_code=500, detail=str(e))
