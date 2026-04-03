from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx
import os
from routes.deps import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


class AIRequest(BaseModel):
    prompt: str


class AIResponse(BaseModel):
    result: str


@router.post("/improve", response_model=AIResponse)
async def ai_improve(body: AIRequest, _: str = Depends(get_current_user)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY nicht konfiguriert")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models"
        f"/gemini-2.0-flash:generateContent?key={api_key}"
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(
                url,
                json={"contents": [{"parts": [{"text": body.prompt}]}]},
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Gemini API Timeout")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Gemini API nicht erreichbar")

    if res.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Gemini API Fehler ({res.status_code})")

    data = res.json()
    try:
        result = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Unerwartetes Antwortformat von Gemini")

    return {"result": result.strip()}
