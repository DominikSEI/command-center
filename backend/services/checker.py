import httpx
import ssl
import time
import socket
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import Project, CheckResult
from services.telegram import send_alert


async def run_http_check(project: Project, db: Session) -> CheckResult:
    start = time.monotonic()
    status = "down"
    status_code = None
    error_message = None
    response_time_ms = None

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(project.url)
            response_time_ms = (time.monotonic() - start) * 1000
            status_code = resp.status_code
            status = "online" if resp.status_code < 400 else "warning"
    except httpx.TimeoutException:
        error_message = "Request timed out"
    except Exception as e:
        error_message = str(e)

    return _save_result(project, db, status, response_time_ms, status_code, error_message)


async def run_ssl_check(project: Project, db: Session) -> CheckResult:
    status = "online"
    error_message = None

    try:
        hostname = project.url.replace("https://", "").replace("http://", "").split("/")[0]
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=hostname) as s:
            s.settimeout(10)
            s.connect((hostname, 443))
            cert = s.getpeercert()
            expire_date = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
            days_left = (expire_date - datetime.utcnow()).days
            if days_left < 14:
                status = "warning"
                error_message = f"SSL cert expires in {days_left} days"
            elif days_left < 0:
                status = "down"
                error_message = "SSL cert expired"
    except Exception as e:
        status = "down"
        error_message = str(e)

    return _save_result(project, db, status, None, None, error_message)


async def run_heartbeat_check(project: Project, db: Session) -> CheckResult:
    """Check if the last heartbeat was received within expected_interval_minutes."""
    expected = project.expected_interval_minutes or 10
    cutoff = datetime.utcnow() - timedelta(minutes=expected * 1.5)

    last = (
        db.query(CheckResult)
        .filter(
            CheckResult.project_id == project.id,
            CheckResult.status == "online",
        )
        .order_by(CheckResult.checked_at.desc())
        .first()
    )

    if last and last.checked_at >= cutoff:
        status = "online"
        error_message = None
    else:
        status = "down"
        error_message = f"No heartbeat received in last {expected * 1.5:.0f} minutes"

    return _save_result(project, db, status, None, None, error_message)


async def run_custom_json_check(project: Project, db: Session) -> CheckResult:
    start = time.monotonic()
    status = "down"
    status_code = None
    error_message = None
    response_time_ms = None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(project.url)
            response_time_ms = (time.monotonic() - start) * 1000
            status_code = resp.status_code
            data = resp.json()
            reported_status = data.get("status", "").lower()
            if reported_status in ("ok", "online", "healthy", "up"):
                status = "online"
            elif reported_status in ("warning", "degraded"):
                status = "warning"
            else:
                status = "down"
                error_message = f"Unexpected status: {reported_status}"
    except Exception as e:
        error_message = str(e)

    return _save_result(project, db, status, response_time_ms, status_code, error_message)


def _save_result(
    project: Project,
    db: Session,
    status: str,
    response_time_ms,
    status_code,
    error_message,
) -> CheckResult:
    # Determine previous status for alerting
    prev = (
        db.query(CheckResult)
        .filter(CheckResult.project_id == project.id)
        .order_by(CheckResult.checked_at.desc())
        .first()
    )
    prev_status = prev.status if prev else None

    result = CheckResult(
        project_id=project.id,
        status=status,
        response_time_ms=response_time_ms,
        status_code=status_code,
        error_message=error_message,
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    # Telegram alert on status change
    if project.alert_telegram:
        if status == "down" and prev_status != "down":
            send_alert(f"❌ *{project.name}* ist DOWN\n{error_message or ''}")
        elif status == "online" and prev_status == "down":
            send_alert(f"✅ *{project.name}* ist wieder ONLINE")

    return result


async def check_project(project: Project, db: Session) -> CheckResult:
    if project.check_type == "http":
        return await run_http_check(project, db)
    elif project.check_type == "ssl":
        return await run_ssl_check(project, db)
    elif project.check_type == "heartbeat":
        return await run_heartbeat_check(project, db)
    elif project.check_type == "custom_json":
        return await run_custom_json_check(project, db)
    else:
        return _save_result(project, db, "warning", None, None, f"Unknown check type: {project.check_type}")
