from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from routes.deps import get_current_user
from services.agent import run_agent

router = APIRouter(tags=["agent"])


class ChatRequest(BaseModel):
    message: str


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
