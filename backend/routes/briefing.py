from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any, List
from datetime import datetime
import json

from database import get_db
from models import Briefing
from routes.deps import get_current_user

router = APIRouter(prefix="/briefing", tags=["briefing"])


class BriefingOut(BaseModel):
    id: int
    summary: str
    summary_agent: str | None = None
    summary_ai: str | None = None
    summary_stocks: str | None = None
    video_count: int
    videos: List[Any] = []
    generated_at: datetime

    class Config:
        from_attributes = True


class BriefingHistoryItem(BaseModel):
    id: int
    summary_agent: str | None = None
    summary_ai: str | None = None
    summary_stocks: str | None = None
    video_count: int
    generated_at: datetime

    class Config:
        from_attributes = True


def _to_out(briefing: Briefing) -> BriefingOut:
    return BriefingOut(
        id=briefing.id,
        summary=briefing.summary,
        summary_agent=briefing.summary_agent,
        summary_ai=briefing.summary_ai,
        summary_stocks=briefing.summary_stocks,
        video_count=briefing.video_count,
        videos=json.loads(briefing.videos_json or "[]"),
        generated_at=briefing.generated_at,
    )


@router.get("/latest", response_model=BriefingOut)
def get_latest(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    briefing = db.query(Briefing).order_by(Briefing.generated_at.desc()).first()
    if not briefing:
        raise HTTPException(status_code=404, detail="Noch kein Briefing vorhanden")
    return _to_out(briefing)


@router.get("/history", response_model=List[BriefingHistoryItem])
def get_history(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    briefings = (
        db.query(Briefing)
        .order_by(Briefing.generated_at.desc())
        .limit(14)
        .all()
    )
    return [
        BriefingHistoryItem(
            id=b.id,
            summary_agent=b.summary_agent,
            summary_ai=b.summary_ai,
            summary_stocks=b.summary_stocks,
            video_count=b.video_count,
            generated_at=b.generated_at,
        )
        for b in briefings
    ]


@router.post("/generate", response_model=BriefingOut)
async def generate(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    from services.briefing import run_briefing
    try:
        result = await run_briefing(db)
        return _to_out(result["briefing"])
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generierung fehlgeschlagen: {e}")
