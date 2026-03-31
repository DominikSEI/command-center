from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import Task
from routes.deps import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    tracker_project_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    bucket: Optional[str] = None
    done: Optional[bool] = None
    tracker_project_id: Optional[int] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    tracker_project_id: Optional[int]
    project_name: Optional[str] = None
    bucket: str
    done: bool
    created_at: datetime
    moved_to_today_at: Optional[datetime]

    class Config:
        from_attributes = True


def _to_out(task: Task) -> TaskOut:
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        tracker_project_id=task.tracker_project_id,
        project_name=task.tracker_project.name if task.tracker_project else None,
        bucket=task.bucket,
        done=task.done,
        created_at=task.created_at,
        moved_to_today_at=task.moved_to_today_at,
    )


@router.get("")
def list_tasks(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    tasks = db.query(Task).order_by(Task.created_at.asc()).all()
    return {
        "backlog": [_to_out(t) for t in tasks if t.bucket == "backlog"],
        "today":   [_to_out(t) for t in tasks if t.bucket == "today"],
    }


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(body: TaskCreate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    task = Task(**body.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return _to_out(task)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, body: TaskUpdate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Not found")
    data = body.model_dump(exclude_none=True)
    if data.get("bucket") == "today" and task.bucket != "today":
        task.moved_to_today_at = datetime.utcnow()
    for field, value in data.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return _to_out(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(task)
    db.commit()


@router.post("/reset-today", status_code=status.HTTP_200_OK)
def reset_today(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    """Midnight reset: unfinished today-tasks → backlog, done today-tasks → deleted."""
    today_tasks = db.query(Task).filter(Task.bucket == "today").all()
    deleted = 0
    moved = 0
    for task in today_tasks:
        if task.done:
            db.delete(task)
            deleted += 1
        else:
            task.bucket = "backlog"
            task.moved_to_today_at = None
            moved += 1
    db.commit()
    return {"moved_to_backlog": moved, "deleted": deleted}
