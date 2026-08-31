from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from .. import settings_store, telegram
from ..db import get_session

router = APIRouter(prefix="/api/settings", tags=["settings"])

MASK = "********"
_SECRET_KEYS = {"telegram_bot_token"}


def _masked(cfg: dict) -> dict:
    out = dict(cfg)
    for key in _SECRET_KEYS:
        if out.get(key):
            out[key] = MASK
    return out


@router.get("")
def get_settings(session: Session = Depends(get_session)):
    return _masked(settings_store.get_all(session))


@router.put("")
def put_settings(payload: dict, session: Session = Depends(get_session)):
    clean = {k: v for k, v in payload.items() if not (k in _SECRET_KEYS and v == MASK)}
    settings_store.set_many(session, clean)
    return _masked(settings_store.get_all(session))


@router.post("/telegram/test")
def telegram_test(session: Session = Depends(get_session)):
    cfg = settings_store.get_all(session)
    ok = telegram.send_message(
        cfg["telegram_bot_token"],
        cfg["telegram_chat_id"],
        "🐢 Testnachricht der Schildkröten-Doku – Telegram ist korrekt eingerichtet.",
    )
    if not ok:
        raise HTTPException(400, "Telegram-Versand fehlgeschlagen – Bot-Token und Chat-ID prüfen.")
    return {"status": "ok"}
