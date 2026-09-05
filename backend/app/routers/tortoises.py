from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from ..db import get_session
from ..models import Attachment, Measurement, Tortoise
from ..serializers import attachment_out
from ..storage import thumb_name

router = APIRouter(prefix="/api/tortoises", tags=["tortoises"])

# When "eigene Nachzucht" is set, origin is fixed to this value.
NACHZUCHT_HERKUNFT = "Moosbach (Deutschland)"


class TortoiseIn(BaseModel):
    name: str
    unterart: Optional[str] = None
    schlupfdatum: Optional[date] = None
    geschlecht: str = "unbekannt"
    herkunft: Optional[str] = None
    eigene_nachzucht: bool = False
    cites_nummer: Optional[str] = None
    transponder_nr: Optional[str] = None
    kennzeichnung: Optional[str] = None
    erworben_am: Optional[date] = None
    sterbedatum: Optional[date] = None
    verkaufsdatum: Optional[date] = None
    archiviert: bool = False
    titelbild_id: Optional[int] = None
    notizen: Optional[str] = None


class TortoiseUpdate(BaseModel):
    """PATCH body – every field optional; unknown keys (id, created_at, …) ignored.
    Using a model (not a raw dict) so date strings are coerced to date objects."""

    name: Optional[str] = None
    unterart: Optional[str] = None
    schlupfdatum: Optional[date] = None
    geschlecht: Optional[str] = None
    herkunft: Optional[str] = None
    eigene_nachzucht: Optional[bool] = None
    cites_nummer: Optional[str] = None
    transponder_nr: Optional[str] = None
    kennzeichnung: Optional[str] = None
    erworben_am: Optional[date] = None
    sterbedatum: Optional[date] = None
    verkaufsdatum: Optional[date] = None
    archiviert: Optional[bool] = None
    titelbild_id: Optional[int] = None
    notizen: Optional[str] = None


def _latest_weight(session: Session, tortoise_id: int) -> Optional[float]:
    row = session.exec(
        select(Measurement)
        .where(Measurement.tortoise_id == tortoise_id, Measurement.gewicht_g != None)  # noqa: E711
        .order_by(Measurement.datum.desc())
    ).first()
    return row.gewicht_g if row else None


def _titelbild_url(session: Session, t: Tortoise) -> Optional[str]:
    if not t.titelbild_id:
        return None
    a = session.get(Attachment, t.titelbild_id)
    if not a or a.art not in ("foto", "profil"):
        return None
    return f"/uploads/thumbs/{thumb_name(a.dateiname)}"


class OrderIn(BaseModel):
    ids: list[int]


@router.get("")
def list_tortoises(session: Session = Depends(get_session)):
    out = []
    for t in session.exec(
        select(Tortoise).order_by(Tortoise.sortierung, Tortoise.name)
    ).all():
        out.append(
            {
                **t.model_dump(),
                "aktuelles_gewicht_g": _latest_weight(session, t.id),
                "titelbild_url": _titelbild_url(session, t),
            }
        )
    return out


@router.post("", status_code=201)
def create_tortoise(payload: TortoiseIn, session: Session = Depends(get_session)):
    t = Tortoise(**payload.model_dump())
    if t.eigene_nachzucht:
        t.herkunft = NACHZUCHT_HERKUNFT
    max_pos = session.exec(select(func.max(Tortoise.sortierung))).first()
    t.sortierung = (max_pos or 0) + 1
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@router.put("/order")
def reorder_tortoises(payload: OrderIn, session: Session = Depends(get_session)):
    """Persist the manual sidebar order. Body: the tortoise ids in the new order."""
    for pos, tid in enumerate(payload.ids):
        t = session.get(Tortoise, tid)
        if t:
            t.sortierung = pos
            session.add(t)
    session.commit()
    return {"ok": True}


@router.get("/{tid}")
def get_tortoise(tid: int, session: Session = Depends(get_session)):
    t = session.get(Tortoise, tid)
    if not t:
        raise HTTPException(404, "Schildkröte nicht gefunden")
    return {
        **t.model_dump(),
        "aktuelles_gewicht_g": _latest_weight(session, tid),
        "titelbild_url": _titelbild_url(session, t),
    }


@router.patch("/{tid}")
def update_tortoise(tid: int, payload: TortoiseUpdate, session: Session = Depends(get_session)):
    t = session.get(Tortoise, tid)
    if not t:
        raise HTTPException(404, "Schildkröte nicht gefunden")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(t, key, value)
    if t.eigene_nachzucht:
        t.herkunft = NACHZUCHT_HERKUNFT
    session.add(t)
    session.commit()
    session.refresh(t)

    # A newly entered transponder number resolves an open chip reminder.
    from .. import reminders as reminders_mod

    reminders_mod._auto_resolve_chip(session, t)
    session.commit()
    return t


@router.delete("/{tid}", status_code=204)
def delete_tortoise(tid: int, session: Session = Depends(get_session)):
    t = session.get(Tortoise, tid)
    if not t:
        raise HTTPException(404, "Schildkröte nicht gefunden")
    session.delete(t)
    session.commit()


@router.get("/{tid}/attachments")
def list_attachments(tid: int, art: Optional[str] = None, session: Session = Depends(get_session)):
    query = select(Attachment).where(Attachment.tortoise_id == tid)
    if art:
        query = query.where(Attachment.art == art)
    query = query.order_by(Attachment.aufnahme_datum, Attachment.hochgeladen_am)
    return [attachment_out(a) for a in session.exec(query).all()]
