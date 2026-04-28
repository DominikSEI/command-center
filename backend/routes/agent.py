from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from database import get_db
from routes.deps import get_current_user
from services.agent import run_agent
from models import AgentRun

router = APIRouter(tags=["agent"])


class ChatRequest(BaseModel):
    message: str


@router.get("/stats")
def agent_stats(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    now         = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = today_start - timedelta(days=6)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def _cost(since):
        val = db.query(func.sum(AgentRun.total_cost_usd)).filter(
            AgentRun.created_at >= since, AgentRun.status == "completed"
        ).scalar()
        return round(float(val or 0), 6)

    def _runs(since):
        return db.query(func.count(AgentRun.id)).filter(
            AgentRun.created_at >= since
        ).scalar() or 0

    # per-day breakdown for last 7 days
    daily = []
    for i in range(6, -1, -1):
        ds = today_start - timedelta(days=i)
        de = ds + timedelta(days=1)
        cost = db.query(func.sum(AgentRun.total_cost_usd)).filter(
            AgentRun.created_at >= ds, AgentRun.created_at < de,
            AgentRun.status == "completed",
        ).scalar()
        runs = db.query(func.count(AgentRun.id)).filter(
            AgentRun.created_at >= ds, AgentRun.created_at < de,
        ).scalar() or 0
        daily.append({"date": ds.strftime("%d.%m"), "cost_usd": round(float(cost or 0), 6), "runs": runs})

    tokens = db.query(
        func.sum(AgentRun.total_tokens_in),
        func.sum(AgentRun.total_tokens_out),
    ).filter(AgentRun.created_at >= month_start).first()

    last = db.query(AgentRun.created_at).order_by(AgentRun.created_at.desc()).first()

    return {
        "cost_today":       _cost(today_start),
        "cost_week":        _cost(week_start),
        "cost_month":       _cost(month_start),
        "runs_today":       _runs(today_start),
        "runs_week":        _runs(week_start),
        "tokens_in_total":  int(tokens[0] or 0),
        "tokens_out_total": int(tokens[1] or 0),
        "last_run_at":      last[0].isoformat() + "Z" if last else None,
        "daily":            daily,
    }


@router.post("/chat")
async def agent_chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    return StreamingResponse(
        run_agent(req.message, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
