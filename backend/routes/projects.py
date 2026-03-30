from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from database import get_db
from models import Project, CheckResult
from routes.deps import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    cluster: str
    check_type: str
    url: Optional[str] = None
    interval_minutes: int = 5
    expected_interval_minutes: Optional[int] = None
    alert_telegram: bool = True
    description: Optional[str] = None
    notes: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    cluster: Optional[str] = None
    check_type: Optional[str] = None
    url: Optional[str] = None
    interval_minutes: Optional[int] = None
    expected_interval_minutes: Optional[int] = None
    alert_telegram: Optional[bool] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    cluster: str
    check_type: str
    url: Optional[str]
    interval_minutes: int
    expected_interval_minutes: Optional[int]
    alert_telegram: bool
    is_active: bool
    description: Optional[str] = None
    notes: Optional[str] = None
    current_status: Optional[str] = None
    uptime_7d: Optional[float] = None
    last_checked: Optional[datetime] = None

    class Config:
        from_attributes = True


def compute_uptime(project_id: int, db: Session, days: int = 7) -> float:
    cutoff = datetime.utcnow() - timedelta(days=days)
    total = db.query(CheckResult).filter(
        CheckResult.project_id == project_id,
        CheckResult.checked_at >= cutoff,
    ).count()
    if total == 0:
        return None
    online = db.query(CheckResult).filter(
        CheckResult.project_id == project_id,
        CheckResult.checked_at >= cutoff,
        CheckResult.status == "online",
    ).count()
    return round(online / total * 100, 2)


@router.get("", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    projects = db.query(Project).all()
    result = []
    for p in projects:
        last = (
            db.query(CheckResult)
            .filter(CheckResult.project_id == p.id)
            .order_by(CheckResult.checked_at.desc())
            .first()
        )
        out = ProjectOut(
            id=p.id,
            name=p.name,
            cluster=p.cluster,
            check_type=p.check_type,
            url=p.url,
            interval_minutes=p.interval_minutes,
            expected_interval_minutes=p.expected_interval_minutes,
            alert_telegram=p.alert_telegram,
            is_active=p.is_active,
            current_status=last.status if last else None,
            uptime_7d=compute_uptime(p.id, db),
            last_checked=last.checked_at if last else None,
        )
        result.append(out)
    return result


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    project = Project(**body.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectOut(**project.__dict__, current_status=None, uptime_7d=None, last_checked=None)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    last = (
        db.query(CheckResult)
        .filter(CheckResult.project_id == project_id)
        .order_by(CheckResult.checked_at.desc())
        .first()
    )
    return ProjectOut(
        **project.__dict__,
        current_status=last.status if last else None,
        uptime_7d=compute_uptime(project_id, db),
        last_checked=last.checked_at if last else None,
    )


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, body: ProjectUpdate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    last = (
        db.query(CheckResult)
        .filter(CheckResult.project_id == project_id)
        .order_by(CheckResult.checked_at.desc())
        .first()
    )
    return ProjectOut(
        **project.__dict__,
        current_status=last.status if last else None,
        uptime_7d=compute_uptime(project_id, db),
        last_checked=last.checked_at if last else None,
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()


@router.get("/{project_id}/logs")
def get_project_logs(
    project_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    logs = (
        db.query(CheckResult)
        .filter(CheckResult.project_id == project_id)
        .order_by(CheckResult.checked_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "status": l.status,
            "response_time_ms": l.response_time_ms,
            "status_code": l.status_code,
            "error_message": l.error_message,
            "checked_at": l.checked_at,
        }
        for l in logs
    ]


@router.post("/{project_id}/heartbeat")
def receive_heartbeat(project_id: int, db: Session = Depends(get_db)):
    """Public endpoint — services call this to report they're alive."""
    project = db.query(Project).filter(Project.id == project_id, Project.check_type == "heartbeat").first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not a heartbeat project")
    result = CheckResult(project_id=project_id, status="online", error_message=None)
    db.add(result)
    db.commit()
    return {"ok": True}
