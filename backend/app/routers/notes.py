from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..db import get_session
from ..models import Note

router = APIRouter(prefix="/api/notes", tags=["notes"])


class NoteIn(BaseModel):
    datum: date | None = None  # defaults to today
    text: str = ""


class NoteUpdate(BaseModel):
    datum: date | None = None
    text: str | None = None


@router.get("")
def list_notes(session: Session = Depends(get_session)):
    return session.exec(
        select(Note).order_by(Note.datum.desc(), Note.id.desc())
    ).all()


@router.post("", status_code=201)
def create_note(payload: NoteIn, session: Session = Depends(get_session)):
    note = Note(datum=payload.datum or datetime.utcnow().date(), text=payload.text)
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@router.patch("/{nid}")
def update_note(nid: int, payload: NoteUpdate, session: Session = Depends(get_session)):
    note = session.get(Note, nid)
    if not note:
        raise HTTPException(404, "Notiz nicht gefunden")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(note, key, value)
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@router.delete("/{nid}", status_code=204)
def delete_note(nid: int, session: Session = Depends(get_session)):
    note = session.get(Note, nid)
    if not note:
        raise HTTPException(404, "Notiz nicht gefunden")
    session.delete(note)
    session.commit()
