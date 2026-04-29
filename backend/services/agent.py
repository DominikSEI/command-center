import os
import json
import asyncio
import time
from datetime import datetime
from typing import AsyncGenerator
from anthropic import Anthropic
from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import (
    Project, CheckResult, TrackerProject, TrackerTodo, VpsMetric, Briefing,
    AgentRun, AgentMessage, ToolCall, Task, Idea, Note,
)

# claude-sonnet-4-6 pricing (USD per token)
_INPUT_COST_PER_TOKEN  = 3.0  / 1_000_000
_OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000

_api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
if not _api_key:
    raise RuntimeError(
        "Weder ANTHROPIC_API_KEY noch CLAUDE_API_KEY in der Umgebung gesetzt. "
        "Setze einen davon in der .env (siehe .env.example)."
    )

client = Anthropic(api_key=_api_key)

SYSTEM_PROMPT = (
    "Du bist der Command Center Agent mit Lese- UND Schreibzugriff auf das Dashboard. "
    "Lesende Tools: get_dashboard_status, get_tracker_projects, get_vps_metrics, get_latest_briefing. "
    "Schreibende Tools: tracker_todo_set_done, tracker_todo_create, project_update, task_create, task_update, idea_create, note_create. "
    "Workflow für Schreiboperationen: erst Lese-Tool aufrufen um IDs zu ermitteln, dann Schreib-Tool. "
    "Workflow für 'Projekt mit Daten füllen': "
    "1. get_tracker_projects aufrufen → project_id ermitteln. "
    "2. project_update → Beschreibung und Notizen setzen. "
    "3. tracker_todo_create (mehrfach aufrufen) → Todos anlegen. "
    "Führe Schreiboperationen direkt aus wenn der User sie verlangt — keine Rückfrage nötig. "
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
    {
        "name": "tracker_todo_set_done",
        "description": (
            "Markiert ein Tracker-Todo als erledigt oder offen. "
            "Erst get_tracker_projects aufrufen um die todo_id zu ermitteln."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "todo_id": {"type": "integer", "description": "ID des Todos"},
                "done":    {"type": "boolean", "description": "true = erledigt, false = wieder öffnen"},
            },
            "required": ["todo_id", "done"],
        },
    },
    {
        "name": "task_create",
        "description": "Erstellt einen neuen Task im Backlog.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title":               {"type": "string"},
                "description":         {"type": "string"},
                "tracker_project_id":  {"type": "integer", "description": "Optionale Verknüpfung mit Tracker-Projekt"},
            },
            "required": ["title"],
        },
    },
    {
        "name": "task_update",
        "description": "Aktualisiert einen Task (erledigt markieren, Titel ändern, Bucket wechseln).",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "integer"},
                "done":    {"type": "boolean"},
                "title":   {"type": "string"},
                "bucket":  {"type": "string", "description": "backlog oder today"},
            },
            "required": ["task_id"],
        },
    },
    {
        "name": "idea_create",
        "description": "Erstellt eine neue Idee.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "body":  {"type": "string"},
            },
            "required": ["title"],
        },
    },
    {
        "name": "note_create",
        "description": "Erstellt eine neue Notiz.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title":    {"type": "string"},
                "body":     {"type": "string"},
                "category": {"type": "string", "description": "ki_news / idee / tool / sonstiges"},
            },
            "required": ["title"],
        },
    },
    {
        "name": "project_update",
        "description": (
            "Aktualisiert ein Tracker-Projekt (Beschreibung, Notizen, Status, Priorität). "
            "Erst get_tracker_projects aufrufen um die project_id zu ermitteln."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id":  {"type": "integer", "description": "ID des Projekts"},
                "description": {"type": "string"},
                "notes":       {"type": "string"},
                "status":      {"type": "string", "description": "idea / in_progress / review / live"},
                "priority":    {"type": "integer", "description": "1=hoch, 2=mittel, 3=niedrig"},
            },
            "required": ["project_id"],
        },
    },
    {
        "name": "tracker_todo_create",
        "description": (
            "Legt ein neues Todo in einem Tracker-Projekt an und aktualisiert den Fortschritt. "
            "Erst get_tracker_projects aufrufen um die project_id zu ermitteln."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "ID des Tracker-Projekts"},
                "title":      {"type": "string",  "description": "Titel des Todos"},
                "done":       {"type": "boolean", "description": "Standard: false"},
            },
            "required": ["project_id", "title"],
        },
    },
]


def _execute_tool(name: str, inputs: dict, db: Session) -> dict:
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
                "open_todos": [{"id": t.id, "title": t.title} for t in todos if not t.done],
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

    if name == "tracker_todo_set_done":
        todo_id = inputs.get("todo_id")
        done    = bool(inputs.get("done", True))
        todo = db.query(TrackerTodo).filter(TrackerTodo.id == todo_id).first()
        if not todo:
            return {"error": f"Todo mit ID {todo_id} nicht gefunden"}
        todo.done = done
        db.commit()
        project = db.query(TrackerProject).filter(TrackerProject.id == todo.tracker_project_id).first()
        if project:
            todos = db.query(TrackerTodo).filter(TrackerTodo.tracker_project_id == project.id).all()
            if todos:
                project.progress_percent = round(sum(1 for t in todos if t.done) / len(todos) * 100)
                project.updated_at = datetime.utcnow()
                db.commit()
        return {"success": True, "todo_id": todo_id, "title": todo.title, "done": todo.done}

    if name == "task_create":
        task = Task(
            title=inputs["title"],
            description=inputs.get("description"),
            tracker_project_id=inputs.get("tracker_project_id"),
            bucket="backlog",
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return {"success": True, "task_id": task.id, "title": task.title}

    if name == "task_update":
        task_id = inputs.get("task_id")
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {"error": f"Task mit ID {task_id} nicht gefunden"}
        if "done"   in inputs: task.done   = bool(inputs["done"])
        if "title"  in inputs and inputs["title"]: task.title  = inputs["title"]
        if "bucket" in inputs and inputs["bucket"] in ("backlog", "today"): task.bucket = inputs["bucket"]
        db.commit()
        return {"success": True, "task_id": task_id, "title": task.title, "done": task.done}

    if name == "idea_create":
        idea = Idea(title=inputs["title"], body=inputs.get("body"))
        db.add(idea)
        db.commit()
        db.refresh(idea)
        return {"success": True, "idea_id": idea.id, "title": idea.title}

    if name == "note_create":
        note = Note(
            title=inputs["title"],
            body=inputs.get("body"),
            category=inputs.get("category", "sonstiges"),
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return {"success": True, "note_id": note.id, "title": note.title}

    if name == "project_update":
        project_id = inputs.get("project_id")
        project = db.query(TrackerProject).filter(TrackerProject.id == project_id).first()
        if not project:
            return {"error": f"Projekt mit ID {project_id} nicht gefunden"}
        if "description" in inputs and inputs["description"] is not None:
            project.description = inputs["description"]
        if "notes" in inputs and inputs["notes"] is not None:
            project.notes = inputs["notes"]
        if "status" in inputs and inputs["status"] in ("idea", "in_progress", "review", "live"):
            project.status = inputs["status"]
        if "priority" in inputs and inputs["priority"] in (1, 2, 3):
            project.priority = inputs["priority"]
        project.updated_at = datetime.utcnow()
        db.commit()
        return {"success": True, "project_id": project_id, "name": project.name}

    if name == "tracker_todo_create":
        project_id = inputs.get("project_id")
        project = db.query(TrackerProject).filter(TrackerProject.id == project_id).first()
        if not project:
            return {"error": f"Projekt mit ID {project_id} nicht gefunden"}
        todo = TrackerTodo(
            tracker_project_id=project_id,
            title=inputs["title"],
            done=bool(inputs.get("done", False)),
        )
        db.add(todo)
        db.commit()
        db.refresh(todo)
        # Recalculate progress
        todos = db.query(TrackerTodo).filter(TrackerTodo.tracker_project_id == project_id).all()
        project.progress_percent = round(sum(1 for t in todos if t.done) / len(todos) * 100)
        project.updated_at = datetime.utcnow()
        db.commit()
        return {"success": True, "todo_id": todo.id, "title": todo.title, "project_id": project_id}

    return {"error": f"Unbekanntes Tool: {name}"}


def _serialize_content(content) -> object:
    """Convert Anthropic SDK content blocks to JSON-serializable form for JSONB storage."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        result = []
        for block in content:
            if hasattr(block, "model_dump"):
                result.append(block.model_dump())
            elif isinstance(block, dict):
                result.append(block)
            else:
                result.append(str(block))
        return result
    return str(content)


async def run_agent(message: str, db: Session) -> AsyncGenerator[str, None]:
    start_time = time.monotonic()
    title = message[:60] + ("…" if len(message) > 60 else "")

    # ── Create AgentRun ───────────────────────────────────────
    run = AgentRun(
        title=title,
        status="running",
        input_mode="text",
        initial_prompt=message,
        total_tokens_in=0,
        total_tokens_out=0,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Save initial user message (sequence 0)
    db.add(AgentMessage(run_id=run.id, role="user", content=message, sequence=0))
    db.commit()

    claude_messages = [{"role": "user", "content": message}]
    sequence = 1
    total_tokens_in = 0
    total_tokens_out = 0
    final_text = ""

    try:
        while True:
            response = await asyncio.to_thread(
                client.messages.create,
                model="claude-sonnet-4-6",
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=claude_messages,
            )

            total_tokens_in  += response.usage.input_tokens
            total_tokens_out += response.usage.output_tokens

            # Save assistant message
            asst_msg = AgentMessage(
                run_id=run.id,
                role="assistant",
                content=_serialize_content(response.content),
                sequence=sequence,
            )
            db.add(asst_msg)
            db.commit()
            db.refresh(asst_msg)
            sequence += 1

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue

                    yield f"data: {json.dumps({'type': 'tool_call', 'tool': block.name})}\n\n"

                    # Create ToolCall (status=running)
                    tc = ToolCall(
                        run_id=run.id,
                        message_id=asst_msg.id,
                        tool_name=block.name,
                        tool_input=block.input,
                        status="running",
                    )
                    db.add(tc)
                    db.commit()
                    db.refresh(tc)

                    tool_start = time.monotonic()
                    try:
                        result = _execute_tool(block.name, block.input, db)
                        tc.tool_output = result
                        tc.status = "completed"
                    except Exception as e:
                        tc.status = "error"
                        tc.error = str(e)
                        result = {"error": str(e)}
                    finally:
                        tc.duration_ms = int((time.monotonic() - tool_start) * 1000)
                        tc.completed_at = datetime.utcnow()
                        db.commit()

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, ensure_ascii=False),
                    })

                claude_messages.append({"role": "assistant", "content": response.content})
                claude_messages.append({"role": "user",      "content": tool_results})

                # Save tool-results as user message
                db.add(AgentMessage(
                    run_id=run.id,
                    role="user",
                    content=_serialize_content(tool_results),
                    sequence=sequence,
                ))
                db.commit()
                sequence += 1
                continue

            # stop_reason == "end_turn" or "max_tokens"
            for block in response.content:
                if hasattr(block, "text"):
                    final_text += block.text
                    yield f"data: {json.dumps({'type': 'text', 'delta': block.text})}\n\n"
            break

        # ── Finalize AgentRun ─────────────────────────────────
        cost = (total_tokens_in * _INPUT_COST_PER_TOKEN
                + total_tokens_out * _OUTPUT_COST_PER_TOKEN)
        run.status          = "completed"
        run.final_response  = final_text or None
        run.total_tokens_in  = total_tokens_in
        run.total_tokens_out = total_tokens_out
        run.total_cost_usd  = round(cost, 8)
        run.duration_ms     = int((time.monotonic() - start_time) * 1000)
        run.completed_at    = datetime.utcnow()
        db.commit()

    except Exception as e:
        run.status       = "error"
        run.error        = str(e)
        run.duration_ms  = int((time.monotonic() - start_time) * 1000)
        run.completed_at = datetime.utcnow()
        try:
            db.commit()
        except Exception:
            db.rollback()
        yield f"data: {json.dumps({'type': 'error', 'message': 'Interner Fehler im Agent.'})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"
