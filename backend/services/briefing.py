"""
Daily Briefing Service
Fetches recent YouTube videos, grabs transcripts, summarises via Gemini.
Personal agent section generated via Claude Sonnet 4.6.
"""
import asyncio
import json
import logging
import os
from datetime import datetime, timezone, timedelta

import httpx
from anthropic import Anthropic

logger = logging.getLogger(__name__)

KI_CHANNELS     = ["@everlastai"]
STOCKS_CHANNELS = ["@AktienKanal"]
CHANNEL_HANDLES = KI_CHANNELS + STOCKS_CHANNELS
YT_BASE = "https://www.googleapis.com/youtube/v3"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models"
    "/gemini-2.5-flash:generateContent"
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

async def _gemini_call(prompt: str, api_key: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(
            f"{GEMINI_URL}?key={api_key}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
        )
    if res.status_code != 200:
        raise RuntimeError(f"Gemini API Fehler ({res.status_code}): {res.text[:200]}")
    return res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


async def _gemini_summary(videos: list[dict]) -> str:
    """Full combined summary (kept for backwards compatibility)."""
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
    return await _gemini_call(prompt, api_key)


async def _gemini_summary_ki(videos: list[dict]) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY nicht konfiguriert")
    blocks = []
    for v in videos:
        content = v.get("transcript") or v.get("description") or "(kein Inhalt)"
        blocks.append(f"### {v['title']}\n{content[:3000]}")
    if not blocks:
        return "Keine neuen KI & Tech Videos in den letzten 24 Stunden."
    prompt = (
        "Fasse die wichtigsten KI & Tech Erkenntnisse aus diesen Videos zusammen.\n"
        "Maximal 5 bullet points, auf Deutsch, prägnant.\n\n"
        + "\n\n".join(blocks)
    )
    return await _gemini_call(prompt, api_key)


async def _gemini_summary_stocks(videos: list[dict]) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY nicht konfiguriert")
    blocks = []
    for v in videos:
        content = v.get("transcript") or v.get("description") or "(kein Inhalt)"
        blocks.append(f"### {v['title']}\n{content[:3000]}")
    if not blocks:
        return "Keine neuen Aktien & Märkte Videos in den letzten 24 Stunden."
    prompt = (
        "Fasse die wichtigsten Aktien- und Markt-Erkenntnisse aus diesen Videos zusammen.\n"
        "Maximal 5 bullet points, auf Deutsch, prägnant.\n\n"
        + "\n\n".join(blocks)
    )
    return await _gemini_call(prompt, api_key)


# ── Claude agent section ──────────────────────────────────────────────────────

async def _claude_summary_agent(db) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
    if not api_key:
        raise ValueError("Kein Anthropic API Key konfiguriert")

    from models import Task, TrackerProject, Idea
    from sqlalchemy import desc

    # Tasks im Heute-Bucket (max 5)
    tasks = (
        db.query(Task)
        .filter(Task.bucket == "today", Task.done == False)
        .order_by(Task.moved_to_today_at.desc().nullslast())
        .limit(5)
        .all()
    )

    # Projekte in Arbeit (max 5)
    projects = (
        db.query(TrackerProject)
        .filter(TrackerProject.status == "in_progress")
        .order_by(desc(TrackerProject.updated_at))
        .limit(5)
        .all()
    )

    # Neueste Ideen der letzten 7 Tage (max 3)
    week_ago = datetime.utcnow() - timedelta(days=7)
    ideas = (
        db.query(Idea)
        .filter(Idea.created_at >= week_ago)
        .order_by(desc(Idea.created_at))
        .limit(3)
        .all()
    )

    today_str = datetime.now(timezone(timedelta(hours=2))).strftime("%A, %d. %B %Y")

    tasks_text    = "\n".join(f"- {t.title}" for t in tasks) or "Keine Tasks für heute eingetragen."
    projects_text = "\n".join(f"- {p.name} ({p.progress_percent}%)" for p in projects) or "Keine Projekte in Arbeit."
    ideas_text    = "\n".join(f"- {i.title}" for i in ideas) or "Keine neuen Ideen diese Woche."

    prompt = f"""Heute ist {today_str}.

Dashboard-Daten:
Tasks heute:
{tasks_text}

Projekte in Arbeit:
{projects_text}

Neue Ideen (letzte 7 Tage):
{ideas_text}

Schreibe eine persönliche Tagesvorschau für Dominik (Solo-Entrepreneur in Fürth, Projekte: SIMBA, Heartlace, Quiftly, Command Center, NXLY).
Stil: deutsch, locker, direkt, max 200 Wörter.
Struktur: kurze Begrüßung mit Datum → Top-Aufgaben für heute → Projekte-Stand → Reminder falls etwas auffällt.
Keine langen Einleitungen."""

    def _sync_call():
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()

    return await asyncio.to_thread(_sync_call)


# ── Main entry point ──────────────────────────────────────────────────────────

async def run_briefing(db) -> dict:
    """
    1. Fetch videos published in the last 24 h from all configured channels.
    2. Download transcripts (with fallback to description).
    3. Summarise via Gemini Flash — separately for KI&Tech and Aktien&Märkte.
    4. Persist a Briefing row and return it.
    """
    from models import Briefing

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    ki_videos: list[dict]     = []
    stocks_videos: list[dict] = []

    yt_key = os.getenv("YOUTUBE_API_KEY")
    if not yt_key:
        logger.warning("YOUTUBE_API_KEY nicht konfiguriert — YouTube-Sektionen werden übersprungen")
    else:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                for handle in KI_CHANNELS:
                    cid = await _channel_id(handle, yt_key, client)
                    if not cid:
                        logger.warning(f"Kanal nicht gefunden: {handle}")
                        continue
                    vids = await _recent_videos(cid, since, yt_key, client)
                    logger.info(f"{handle} → {len(vids)} neue Videos (KI)")
                    ki_videos.extend(vids)

                for handle in STOCKS_CHANNELS:
                    cid = await _channel_id(handle, yt_key, client)
                    if not cid:
                        logger.warning(f"Kanal nicht gefunden: {handle}")
                        continue
                    vids = await _recent_videos(cid, since, yt_key, client)
                    logger.info(f"{handle} → {len(vids)} neue Videos (Aktien)")
                    stocks_videos.extend(vids)
        except Exception as e:
            logger.error(f"YouTube-Fetch fehlgeschlagen, fahre ohne Videos fort: {e}")

    all_videos = ki_videos + stocks_videos

    # Transcripts via thread pool (library is synchronous)
    if all_videos:
        transcript_tasks = [asyncio.to_thread(_get_transcript, v["id"]) for v in all_videos]
        transcripts = await asyncio.gather(*transcript_tasks, return_exceptions=True)
        for v, t in zip(all_videos, transcripts):
            v["transcript"] = t if isinstance(t, str) else ""

    # Generate all three sections in parallel — failure-isolated
    results = await asyncio.gather(
        _gemini_summary_ki(ki_videos),
        _gemini_summary_stocks(stocks_videos),
        _claude_summary_agent(db),
        return_exceptions=True,
    )
    summary_ai     = results[0] if not isinstance(results[0], Exception) else None
    summary_stocks = results[1] if not isinstance(results[1], Exception) else None
    summary_agent  = results[2] if not isinstance(results[2], Exception) else None

    if isinstance(results[0], Exception):
        logger.error(f"Gemini KI section failed: {results[0]}")
    if isinstance(results[1], Exception):
        logger.error(f"Gemini Stocks section failed: {results[1]}")
    if isinstance(results[2], Exception):
        logger.error(f"Claude agent section failed: {results[2]}")

    # Combined summary for backwards compat (only from non-None sections)
    parts = []
    if summary_ai:     parts.append(f"## KI & Tech\n\n{summary_ai}")
    if summary_stocks: parts.append(f"## Aktien & Märkte\n\n{summary_stocks}")
    summary = "\n\n".join(parts) if parts else "Briefing konnte nicht vollständig generiert werden."

    # Store videos without the (potentially large) transcript field
    videos_stored = [{k: val for k, val in v.items() if k != "transcript"} for v in all_videos]

    briefing = Briefing(
        summary=summary,
        summary_agent=summary_agent,
        summary_ai=summary_ai,
        summary_stocks=summary_stocks,
        videos_json=json.dumps(videos_stored, ensure_ascii=False),
        video_count=len(all_videos),
    )
    db.add(briefing)
    db.commit()
    db.refresh(briefing)
    logger.info(f"Briefing #{briefing.id} gespeichert ({len(all_videos)} Videos)")
    return {"briefing": briefing, "videos": videos_stored}
