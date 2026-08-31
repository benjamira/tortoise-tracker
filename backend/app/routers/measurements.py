from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..db import get_session
from ..models import Measurement, Tortoise

router = APIRouter(prefix="/api", tags=["measurements"])

class MeasurementIn(BaseModel):
    datum: date
    gewicht_g: Optional[float] = None  # eine Nachkommastelle
    panzerlaenge_mm: Optional[int] = None
    notiz: Optional[str] = None


class MeasurementUpdate(BaseModel):
    datum: Optional[date] = None
    gewicht_g: Optional[float] = None
    panzerlaenge_mm: Optional[int] = None
    notiz: Optional[str] = None


def _round_weight(data: dict) -> dict:
    if data.get("gewicht_g") is not None:
        data["gewicht_g"] = round(float(data["gewicht_g"]), 1)
    return data


def _with_ratio(m: Measurement) -> dict:
    data = m.model_dump()
    if m.gewicht_g and m.panzerlaenge_mm:
        data["jackson_ratio"] = round(m.gewicht_g / m.panzerlaenge_mm, 3)
    else:
        data["jackson_ratio"] = None
    return data


@router.get("/tortoises/{tid}/measurements")
def list_measurements(tid: int, session: Session = Depends(get_session)):
    rows = session.exec(
        select(Measurement)
        .where(Measurement.tortoise_id == tid)
        .order_by(Measurement.datum)
    ).all()
    return [_with_ratio(m) for m in rows]


@router.post("/tortoises/{tid}/measurements", status_code=201)
def create_measurement(tid: int, payload: MeasurementIn, session: Session = Depends(get_session)):
    if not session.get(Tortoise, tid):
        raise HTTPException(404, "Schildkröte nicht gefunden")
    m = Measurement(tortoise_id=tid, **_round_weight(payload.model_dump()))
    session.add(m)
    session.commit()
    session.refresh(m)
    return _with_ratio(m)


@router.patch("/measurements/{mid}")
def update_measurement(mid: int, payload: MeasurementUpdate, session: Session = Depends(get_session)):
    m = session.get(Measurement, mid)
    if not m:
        raise HTTPException(404, "Messung nicht gefunden")
    for key, value in _round_weight(payload.model_dump(exclude_unset=True)).items():
        setattr(m, key, value)
    session.add(m)
    session.commit()
    session.refresh(m)
    return _with_ratio(m)


@router.delete("/measurements/{mid}", status_code=204)
def delete_measurement(mid: int, session: Session = Depends(get_session)):
    m = session.get(Measurement, mid)
    if not m:
        raise HTTPException(404, "Messung nicht gefunden")
    session.delete(m)
    session.commit()
