"""
Daily Briefing Service
Fetches recent YouTube videos, grabs transcripts, summarises via Gemini.
"""
import asyncio
import json
import logging
import os
from datetime import datetime, timezone, timedelta

import httpx

logger = logging.getLogger(__name__)

CHANNEL_HANDLES = ["@AktienKanal", "@everlastai"]
YT_BASE = "https://www.googleapis.com/youtube/v3"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models"
    "/gemini-2.0-flash:generateContent"
)


# ── YouTube helpers ───────────────────────────────────────────────────────────

async def _channel_id(handle: str, api_key: str, client: httpx.AsyncClient) -> str | None:
    try:
        res = await client.get(f"{YT_BASE}/channels", params={
            "part": "id",
            "forHandle": handle,
            "key": api_key,
        })
        items = res.json().get("items", [])
        return items[0]["id"] if items else None
    except Exception as e:
        logger.warning(f"Could not resolve channel {handle}: {e}")
        return None


async def _recent_videos(
    channel_id: str, since: datetime, api_key: str, client: httpx.AsyncClient
) -> list[dict]:
    try:
        res = await client.get(f"{YT_BASE}/search", params={
            "part": "snippet",
            "channelId": channel_id,
            "order": "date",
            "type": "video",
            "publishedAfter": since.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "maxResults": 10,
            "key": api_key,
        })
        videos = []
        for item in res.json().get("items", []):
            vid_id  = item["id"]["videoId"]
            snippet = item["snippet"]
            videos.append({
                "id":           vid_id,
                "title":        snippet["title"],
                "description":  snippet.get("description", "")[:400],
                "url":          f"https://www.youtube.com/watch?v={vid_id}",
                "thumbnail":    snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
                "published_at": snippet["publishedAt"],
                "channel":      snippet["channelTitle"],
            })
        return videos
    except Exception as e:
        logger.warning(f"Could not fetch videos for {channel_id}: {e}")
        return []


def _get_transcript(video_id: str) -> str:
    """Synchronous – will be called via asyncio.to_thread."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        try:
            entries = YouTubeTranscriptApi.get_transcript(video_id, languages=["de", "en"])
        except Exception:
            entries = YouTubeTranscriptApi.get_transcript(video_id)
        text = " ".join(e["text"] for e in entries)
        return text[:4000]
    except Exception as e:
        logger.debug(f"No transcript for {video_id}: {e}")
        return ""


# ── Gemini summary ────────────────────────────────────────────────────────────

async def _gemini_summary(videos: list[dict]) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY nicht konfiguriert")

    blocks = []
    for v in videos:
        content = v.get("transcript") or v.get("description") or "(kein Inhalt)"
        blocks.append(f"### {v['title']} ({v['channel']})\n{content[:3000]}")

    prompt = (
        "Fasse die wichtigsten Erkenntnisse aus diesen YouTube Videos zusammen.\n"
        "Strukturiere es in: KI-News, Aktien & Märkte, Sonstiges.\n"
        "Maximal 300 Wörter, auf Deutsch, bullet points.\n\n"
        + "\n\n".join(blocks)
    )

    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(
            f"{GEMINI_URL}?key={api_key}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
        )

    if res.status_code != 200:
        raise RuntimeError(f"Gemini API Fehler ({res.status_code}): {res.text[:200]}")

    return res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


# ── Main entry point ──────────────────────────────────────────────────────────

async def run_briefing(db) -> dict:
    """
    1. Fetch videos published in the last 24 h from all configured channels.
    2. Download transcripts (with fallback to description).
    3. Summarise via Gemini Flash.
    4. Persist a Briefing row and return it.
    """
    from models import Briefing

    yt_key = os.getenv("YOUTUBE_API_KEY")
    if not yt_key:
        raise ValueError("YOUTUBE_API_KEY nicht konfiguriert")

    since      = datetime.now(timezone.utc) - timedelta(hours=24)
    all_videos: list[dict] = []

    async with httpx.AsyncClient(timeout=30) as client:
        for handle in CHANNEL_HANDLES:
            cid = await _channel_id(handle, yt_key, client)
            if not cid:
                logger.warning(f"Kanal nicht gefunden: {handle}")
                continue
            videos = await _recent_videos(cid, since, yt_key, client)
            logger.info(f"{handle} → {len(videos)} neue Videos")
            all_videos.extend(videos)

    if not all_videos:
        logger.info("Keine neuen Videos in den letzten 24 h")
        summary = "Keine neuen Videos in den letzten 24 Stunden gefunden."
        briefing = Briefing(summary=summary, videos_json="[]", video_count=0)
        db.add(briefing)
        db.commit()
        db.refresh(briefing)
        return {"briefing": briefing, "videos": []}

    # Transcripts via thread pool (library is synchronous)
    transcript_tasks = [asyncio.to_thread(_get_transcript, v["id"]) for v in all_videos]
    transcripts = await asyncio.gather(*transcript_tasks, return_exceptions=True)
    for v, t in zip(all_videos, transcripts):
        v["transcript"] = t if isinstance(t, str) else ""

    summary = await _gemini_summary(all_videos)

    # Store videos without the (potentially large) transcript field
    videos_stored = [{k: val for k, val in v.items() if k != "transcript"} for v in all_videos]

    briefing = Briefing(
        summary=summary,
        videos_json=json.dumps(videos_stored, ensure_ascii=False),
        video_count=len(all_videos),
    )
    db.add(briefing)
    db.commit()
    db.refresh(briefing)
    logger.info(f"Briefing #{briefing.id} gespeichert ({len(all_videos)} Videos)")
    return {"briefing": briefing, "videos": videos_stored}
