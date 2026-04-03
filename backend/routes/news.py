import xml.etree.ElementTree as ET
from fastapi import APIRouter, Depends
import httpx
from routes.deps import get_current_user

router = APIRouter(prefix="/news", tags=["news"])

FEEDS = {
    "ki": "https://venturebeat.com/category/ai/feed/",
    "finance": "https://finance.yahoo.com/rss/2.0/headline?s=%5EGDAXI&region=DE&lang=de-DE",
}


@router.get("")
async def get_news(_: str = Depends(get_current_user)):
    results = {}
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for key, url in FEEDS.items():
            try:
                res = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                root = ET.fromstring(res.text)
                items = root.findall(".//item")[:5]
                results[key] = [
                    {
                        "title": (item.findtext("title") or "").strip(),
                        "link":  (item.findtext("link")  or "").strip(),
                        "date":  (item.findtext("pubDate") or "").strip(),
                    }
                    for item in items
                    if item.findtext("title")
                ]
            except Exception:
                results[key] = []
    return results
