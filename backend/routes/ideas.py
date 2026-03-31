from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import Idea, TrackerProject
from routes.deps import get_current_user

router = APIRouter(prefix="/ideas", tags=["ideas"])


class IdeaCreate(BaseModel):
    title: str
    body: Optional[str] = None


class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None


class IdeaOut(BaseModel):
    id: int
    title: str
    body: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    converted_to_project_id: Optional[int] = None
    converted_project_name: Optional[str] = None

    class Config:
        from_attributes = True


def _to_out(idea: Idea) -> IdeaOut:
    return IdeaOut(
        id=idea.id,
        title=idea.title,
        body=idea.body,
        status=idea.status,
        created_at=idea.created_at,
        updated_at=idea.updated_at,
        converted_to_project_id=idea.converted_to_project_id,
        converted_project_name=idea.converted_project.name if idea.converted_project else None,
    )


@router.get("", response_model=List[IdeaOut])
def list_ideas(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    return [_to_out(i) for i in db.query(Idea).order_by(Idea.created_at.desc()).all()]


@router.post("", response_model=IdeaOut, status_code=status.HTTP_201_CREATED)
def create_idea(body: IdeaCreate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    idea = Idea(**body.model_dump())
    db.add(idea)
    db.commit()
    db.refresh(idea)
    return _to_out(idea)


@router.patch("/{idea_id}", response_model=IdeaOut)
def update_idea(idea_id: int, body: IdeaUpdate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(idea, field, value)
    idea.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(idea)
    return _to_out(idea)


@router.delete("/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_idea(idea_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(idea)
    db.commit()


@router.post("/{idea_id}/convert", response_model=IdeaOut)
def convert_to_project(idea_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    """Convert an idea into a Tracker project."""
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Not found")
    if idea.converted_to_project_id:
        raise HTTPException(status_code=400, detail="Already converted")
    project = TrackerProject(
        name=idea.title,
        description=idea.body,
        status="idea",
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    idea.converted_to_project_id = project.id
    idea.status = "done"
    idea.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(idea)
    return _to_out(idea)
