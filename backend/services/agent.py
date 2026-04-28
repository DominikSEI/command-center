import os
import json
import asyncio
from typing import AsyncGenerator
from anthropic import Anthropic
from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import Project, CheckResult, TrackerProject, TrackerTodo, VpsMetric, Briefing

client = Anthropic(api_key=os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = (
    "Du bist der Command Center Agent. Du hast Zugriff auf das persönliche Dashboard des Users "
    "und kannst Projekt-Status, Tracker, VPS-Metriken und Briefings abrufen. "
    "Hole immer zuerst aktuelle Daten per Tool-Call, bevor du antwortest. "
    "Antworte präzise und auf Deutsch."
)

TOOLS = [
    {
        "name": "get_dashboard_status",
        "description": (
            "Gibt alle überwachten Projekte zurück mit aktuellem Status "
            "(online/warning/down), letztem Check-Zeitpunkt und Response-Time."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_tracker_projects",
        "description": (
            "Gibt alle Tracker-Projekte zurück mit Status, Fortschritt (%) "
            "und offenen sowie erledigten Todos."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_vps_metrics",
        "description": "Gibt die zuletzt gemessenen VPS-Metriken zurück (CPU, RAM, Disk).",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_latest_briefing",
        "description": "Gibt das neueste Daily Briefing zurück (KI-News + Markt-Zusammenfassung).",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]


def _execute_tool(name: str, db: Session) -> dict:
    if name == "get_dashboard_status":
        projects = db.query(Project).filter(Project.is_active == True).all()
        rows = []
        for p in projects:
            latest = (
                db.query(CheckResult)
                .filter(CheckResult.project_id == p.id)
                .order_by(desc(CheckResult.checked_at))
                .first()
            )
            rows.append({
                "name": p.name,
                "cluster": p.cluster,
                "status": latest.status if latest else "unknown",
                "response_time_ms": latest.response_time_ms if latest else None,
                "last_checked": latest.checked_at.isoformat() if latest else None,
            })
        return {"projects": rows, "total": len(rows)}

    if name == "get_tracker_projects":
        projects = db.query(TrackerProject).all()
        rows = []
        for p in projects:
            todos = db.query(TrackerTodo).filter(TrackerTodo.tracker_project_id == p.id).all()
            rows.append({
                "name": p.name,
                "status": p.status,
                "progress": p.progress_percent,
                "open_todos": [t.title for t in todos if not t.done],
                "total_todos": len(todos),
                "done_todos": sum(1 for t in todos if t.done),
            })
        return {"projects": rows}

    if name == "get_vps_metrics":
        metric = db.query(VpsMetric).order_by(desc(VpsMetric.recorded_at)).first()
        if not metric:
            return {"error": "Keine Metriken verfügbar"}
        return {
            "cpu_percent": metric.cpu_percent,
            "ram_percent": metric.ram_percent,
            "disk_percent": metric.disk_percent,
            "recorded_at": metric.recorded_at.isoformat(),
        }

    if name == "get_latest_briefing":
        briefing = db.query(Briefing).order_by(desc(Briefing.generated_at)).first()
        if not briefing:
            return {"error": "Kein Briefing vorhanden"}
        return {
            "summary": briefing.summary,
            "summary_ai": briefing.summary_ai,
            "generated_at": briefing.generated_at.isoformat(),
        }

    return {"error": f"Unbekanntes Tool: {name}"}


async def run_agent(message: str, db: Session) -> AsyncGenerator[str, None]:
    messages = [{"role": "user", "content": message}]

    while True:
        response = await asyncio.to_thread(
            client.messages.create,
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    yield f"data: {json.dumps({'type': 'tool_call', 'tool': block.name})}\n\n"
                    result = _execute_tool(block.name, db)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, ensure_ascii=False),
                    })
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
            continue

        # stop_reason == "end_turn" oder "max_tokens"
        for block in response.content:
            if hasattr(block, "text"):
                yield f"data: {json.dumps({'type': 'text', 'delta': block.text})}\n\n"
        break

    yield f"data: {json.dumps({'type': 'done'})}\n\n"
