import json
from typing import Any

from sqlmodel import Session, select

from .models import Setting

DEFAULTS: dict[str, Any] = {
    "telegram_bot_token": "",
    "telegram_chat_id": "",
    "foto_intervall_jung_monate": 6,
    "foto_intervall_alt_monate": 12,
    "foto_alter_grenze_jahre": 5,
    "chip_gewicht_schwelle_g": 500,
    "reminder_fotodoku_aktiv": True,
    "reminder_chip_aktiv": True,
}


def get_all(session: Session) -> dict[str, Any]:
    rows = session.exec(select(Setting)).all()
    stored = {}
    for row in rows:
        try:
            stored[row.key] = json.loads(row.value)
        except (json.JSONDecodeError, TypeError):
            continue
    return {**DEFAULTS, **stored}


def set_many(session: Session, values: dict[str, Any]) -> None:
    for key, val in values.items():
        if key not in DEFAULTS:
            continue
        row = session.get(Setting, key)
        payload = json.dumps(val)
        if row:
            row.value = payload
        else:
            row = Setting(key=key, value=payload)
        session.add(row)
    session.commit()
