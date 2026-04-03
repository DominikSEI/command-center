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
        f"/gemini-1.5-flash:generateContent?key={api_key}"
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
        raise HTTPException(status_code=502, detail=f"Gemini API Fehler ({res.status_code}): {res.text[:400]}")

    data = res.json()
    candidates = data.get("candidates", [])
    if not candidates:
        feedback = data.get("promptFeedback", {})
        raise HTTPException(status_code=502, detail=f"Gemini: kein Ergebnis (Safety-Filter?) – {feedback}")
    try:
        result = candidates[0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail=f"Unerwartetes Antwortformat: {str(data)[:300]}")

    return {"result": result.strip()}


@router.get("/models")
async def list_models(_: str = Depends(get_current_user)):
    api_key = os.getenv("GEMINI_API_KEY")
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(
            f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        )
    models = [m["name"] for m in res.json().get("models", []) if "generateContent" in m.get("supportedGenerationMethods", [])]
    return {"models": models}
