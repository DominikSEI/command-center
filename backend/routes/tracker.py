from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import TrackerProject, TrackerTodo
from routes.deps import get_current_user

router = APIRouter(prefix="/tracker", tags=["tracker"])


class TrackerProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "idea"
    progress_percent: int = 0


class TrackerProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    progress_percent: Optional[int] = None


class TrackerTodoCreate(BaseModel):
    title: str


class TrackerTodoOut(BaseModel):
    id: int
    title: str
    done: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TrackerProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    notes: Optional[str] = None
    status: str
    progress_percent: int
    created_at: datetime
    updated_at: datetime
    todos: List[TrackerTodoOut] = []

    class Config:
        from_attributes = True


def _recalculate_progress(project: TrackerProject, db: Session):
    """Auto-sets progress_percent from done todos. No-op if no todos exist."""
    todos = project.todos
    if not todos:
        return
    done = sum(1 for t in todos if t.done)
    project.progress_percent = round(done / len(todos) * 100)
    project.updated_at = datetime.utcnow()
    db.commit()


@router.get("", response_model=List[TrackerProjectOut])
def list_tracker_projects(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    return db.query(TrackerProject).order_by(TrackerProject.updated_at.desc()).all()


@router.get("/{project_id}", response_model=TrackerProjectOut)
def get_tracker_project(project_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    project = db.query(TrackerProject).filter(TrackerProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Not found")
    return project


@router.post("", response_model=TrackerProjectOut, status_code=status.HTTP_201_CREATED)
def create_tracker_project(body: TrackerProjectCreate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    project = TrackerProject(**body.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=TrackerProjectOut)
def update_tracker_project(project_id: int, body: TrackerProjectUpdate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    project = db.query(TrackerProject).filter(TrackerProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tracker_project(project_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    project = db.query(TrackerProject).filter(TrackerProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(project)
    db.commit()


@router.post("/{project_id}/todos", response_model=TrackerProjectOut, status_code=status.HTTP_201_CREATED)
def add_todo(project_id: int, body: TrackerTodoCreate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    project = db.query(TrackerProject).filter(TrackerProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Not found")
    todo = TrackerTodo(tracker_project_id=project_id, title=body.title)
    db.add(todo)
    db.commit()
    db.refresh(project)
    _recalculate_progress(project, db)
    db.refresh(project)
    return project


@router.patch("/{project_id}/todos/{todo_id}", response_model=TrackerProjectOut)
def toggle_todo(project_id: int, todo_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    todo = db.query(TrackerTodo).filter(TrackerTodo.id == todo_id, TrackerTodo.tracker_project_id == project_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Not found")
    todo.done = not todo.done
    db.commit()
    project = db.query(TrackerProject).filter(TrackerProject.id == project_id).first()
    _recalculate_progress(project, db)
    db.refresh(project)
    return project


@router.delete("/{project_id}/todos/{todo_id}", response_model=TrackerProjectOut)
def delete_todo(project_id: int, todo_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    todo = db.query(TrackerTodo).filter(TrackerTodo.id == todo_id, TrackerTodo.tracker_project_id == project_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(todo)
    db.commit()
    project = db.query(TrackerProject).filter(TrackerProject.id == project_id).first()
    _recalculate_progress(project, db)
    db.refresh(project)
    return project
