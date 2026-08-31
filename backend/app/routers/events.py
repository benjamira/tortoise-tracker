from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..db import get_session
from ..models import Attachment, Event, Tortoise
from ..serializers import attachment_out

router = APIRouter(prefix="/api", tags=["events"])

_TYPES = {"einwinterung", "auswinterung", "tierarzt", "medikation", "sonstiges"}


class EventIn(BaseModel):
    datum: date | None = None  # defaults to today if omitted
    typ: str = "sonstiges"
    text: str = ""


class EventUpdate(BaseModel):
    datum: date | None = None
    typ: str | None = None
    text: str | None = None


def _event_out(session: Session, e: Event) -> dict:
    attachments = session.exec(
        select(Attachment).where(Attachment.event_id == e.id)
    ).all()
    return {**e.model_dump(), "attachments": [attachment_out(a) for a in attachments]}


@router.get("/tortoises/{tid}/events")
def list_events(tid: int, session: Session = Depends(get_session)):
    rows = session.exec(
        select(Event)
        .where(Event.tortoise_id == tid)
        .order_by(Event.datum.desc(), Event.id.desc())
    ).all()
    return [_event_out(session, e) for e in rows]


@router.post("/tortoises/{tid}/events", status_code=201)
def create_event(tid: int, payload: EventIn, session: Session = Depends(get_session)):
    if not session.get(Tortoise, tid):
        raise HTTPException(404, "Schildkröte nicht gefunden")
    typ = payload.typ if payload.typ in _TYPES else "sonstiges"
    e = Event(
        tortoise_id=tid,
        datum=payload.datum or datetime.utcnow().date(),
        typ=typ,
        text=payload.text,
    )
    session.add(e)
    session.commit()
    session.refresh(e)
    return _event_out(session, e)


@router.patch("/events/{eid}")
def update_event(eid: int, payload: EventUpdate, session: Session = Depends(get_session)):
    e = session.get(Event, eid)
    if not e:
        raise HTTPException(404, "Ereignis nicht gefunden")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "typ" and value not in _TYPES:
            continue
        setattr(e, key, value)
    session.add(e)
    session.commit()
    session.refresh(e)
    return _event_out(session, e)


@router.delete("/events/{eid}", status_code=204)
def delete_event(eid: int, session: Session = Depends(get_session)):
    e = session.get(Event, eid)
    if not e:
        raise HTTPException(404, "Ereignis nicht gefunden")
    # Detach attachments rather than deleting the files.
    for a in session.exec(select(Attachment).where(Attachment.event_id == eid)).all():
        a.event_id = None
        session.add(a)
    session.delete(e)
    session.commit()
