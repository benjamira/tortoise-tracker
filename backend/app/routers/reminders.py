from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from .. import reminders as reminders_mod
from ..db import get_session
from ..models import Reminder, Tortoise

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


@router.get("")
def list_reminders(session: Session = Depends(get_session)):
    today = date.today()
    rows = session.exec(select(Reminder).where(Reminder.status != "erledigt")).all()
    out = []
    for r in rows:
        if r.status == "snooze" and r.snooze_bis and r.snooze_bis > today:
            continue
        tortoise = session.get(Tortoise, r.tortoise_id)
        out.append(
            {
                **r.model_dump(),
                "tier_name": tortoise.name if tortoise else None,
                "text": reminders_mod.message_for(session, r),
            }
        )
    out.sort(key=lambda x: x["faellig_seit"])
    return out


@router.post("/evaluate")
def evaluate_now(session: Session = Depends(get_session)):
    created = reminders_mod.evaluate(session)
    return {"neue_reminder": len(created)}


@router.post("/{rid}/ack")
def acknowledge(rid: int, session: Session = Depends(get_session)):
    r = session.get(Reminder, rid)
    if not r:
        raise HTTPException(404, "Erinnerung nicht gefunden")
    r.status = "erledigt"
    r.erledigt_am = datetime.utcnow()
    session.add(r)
    session.commit()
    return {"status": "erledigt"}


@router.post("/{rid}/snooze")
def snooze(rid: int, payload: dict | None = None, session: Session = Depends(get_session)):
    r = session.get(Reminder, rid)
    if not r:
        raise HTTPException(404, "Erinnerung nicht gefunden")
    payload = payload or {}
    if payload.get("bis"):
        r.snooze_bis = date.fromisoformat(payload["bis"])
    else:
        tage = int(payload.get("tage", 7))
        r.snooze_bis = date.today() + timedelta(days=tage)
    r.status = "snooze"
    session.add(r)
    session.commit()
    return {"status": "snooze", "snooze_bis": r.snooze_bis.isoformat()}
