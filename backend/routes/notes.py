from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import Note
from routes.deps import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])


class NoteCreate(BaseModel):
    title: str
    body: Optional[str] = None
    category: Optional[str] = "sonstiges"
    link: Optional[str] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
    link: Optional[str] = None


class NoteOut(BaseModel):
    id: int
    title: str
    body: Optional[str]
    category: str
    link: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _to_out(note: Note) -> NoteOut:
    return NoteOut(
        id=note.id,
        title=note.title,
        body=note.body,
        category=note.category,
        link=note.link,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.get("", response_model=List[NoteOut])
def list_notes(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    return [_to_out(n) for n in db.query(Note).order_by(Note.created_at.desc()).all()]


@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(body: NoteCreate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    note = Note(**body.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return _to_out(note)


@router.patch("/{note_id}", response_model=NoteOut)
def update_note(note_id: int, body: NoteUpdate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(note, field, value)
    note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return _to_out(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(note)
    db.commit()
