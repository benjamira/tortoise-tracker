"""Reminder rules: photo documentation due (age based) and chip implant (weight based)."""
import logging
from calendar import monthrange
from datetime import date, datetime

from sqlmodel import Session, select

from . import settings_store, telegram
from .models import Attachment, Measurement, Reminder, Tortoise

log = logging.getLogger("reminders")


def _add_months(d: date, months: int) -> date:
    total = d.month - 1 + months
    year = d.year + total // 12
    month = total % 12 + 1
    day = min(d.day, monthrange(year, month)[1])
    return date(year, month, day)


def _age_years(born: date, today: date) -> int:
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def _de(d: date) -> str:
    return d.strftime("%d.%m.%Y")


def _open_reminder(session: Session, tortoise_id: int, typ: str) -> Reminder | None:
    return session.exec(
        select(Reminder).where(
            Reminder.tortoise_id == tortoise_id,
            Reminder.typ == typ,
            Reminder.status != "erledigt",
        )
    ).first()


def _latest_photo_date(session: Session, tortoise_id: int) -> date | None:
    fotos = session.exec(
        select(Attachment).where(
            Attachment.tortoise_id == tortoise_id,
            Attachment.art == "foto",
        )
    ).all()
    dates = [a.aufnahme_datum.date() for a in fotos if a.aufnahme_datum]
    return max(dates) if dates else None


def _latest_weight(session: Session, tortoise_id: int) -> int | None:
    row = session.exec(
        select(Measurement)
        .where(Measurement.tortoise_id == tortoise_id, Measurement.gewicht_g != None)  # noqa: E711
        .order_by(Measurement.datum.desc())
    ).first()
    return row.gewicht_g if row else None


def message_for(session: Session, reminder: Reminder) -> str:
    tortoise = session.get(Tortoise, reminder.tortoise_id)
    name = tortoise.name if tortoise else f"Tier {reminder.tortoise_id}"
    ctx = f"\n{reminder.kontext}" if reminder.kontext else ""
    if reminder.typ == "fotodokumentation":
        return f"🐢 {name}: Neue Fotodokumentation fällig.{ctx}"
    if reminder.typ == "chip":
        return f"🐢 {name}: Chip-Kennzeichnung (Transponder) fällig.{ctx}"
    return f"🐢 {name}: Erinnerung ({reminder.typ}).{ctx}"


def _check_foto(session, tortoise: Tortoise, today: date, cfg: dict) -> Reminder | None:
    if _open_reminder(session, tortoise.id, "fotodokumentation"):
        return None
    ref = _latest_photo_date(session, tortoise.id) or tortoise.schlupfdatum or tortoise.erworben_am
    if ref is None:
        return None
    if tortoise.schlupfdatum and _age_years(tortoise.schlupfdatum, today) < cfg["foto_alter_grenze_jahre"]:
        interval = cfg["foto_intervall_jung_monate"]
    else:
        interval = cfg["foto_intervall_alt_monate"]
    if _add_months(ref, interval) > today:
        return None
    reminder = Reminder(
        tortoise_id=tortoise.id,
        typ="fotodokumentation",
        faellig_seit=today,
        kontext=f"Letzte Fotodokumentation: {_de(ref)} (Intervall {interval} Monate)",
    )
    session.add(reminder)
    session.flush()
    return reminder


def _check_chip(session, tortoise: Tortoise, today: date, cfg: dict) -> Reminder | None:
    if tortoise.transponder_nr and tortoise.transponder_nr.strip():
        return None
    if _open_reminder(session, tortoise.id, "chip"):
        return None
    weight = _latest_weight(session, tortoise.id)
    if weight is None or weight < cfg["chip_gewicht_schwelle_g"]:
        return None
    reminder = Reminder(
        tortoise_id=tortoise.id,
        typ="chip",
        faellig_seit=today,
        kontext=f"Aktuelles Gewicht {weight} g liegt über {cfg['chip_gewicht_schwelle_g']} g, keine Transpondernummer hinterlegt",
    )
    session.add(reminder)
    session.flush()
    return reminder


def _resolve_all_open(session, tortoise_id: int) -> None:
    for reminder in session.exec(
        select(Reminder).where(
            Reminder.tortoise_id == tortoise_id, Reminder.status != "erledigt"
        )
    ).all():
        reminder.status = "erledigt"
        reminder.erledigt_am = datetime.utcnow()
        session.add(reminder)


def _auto_resolve_chip(session, tortoise: Tortoise) -> None:
    if not (tortoise.transponder_nr and tortoise.transponder_nr.strip()):
        return
    reminder = _open_reminder(session, tortoise.id, "chip")
    if reminder:
        reminder.status = "erledigt"
        reminder.erledigt_am = datetime.utcnow()
        session.add(reminder)


def evaluate(session: Session, today: date | None = None) -> list[Reminder]:
    today = today or date.today()
    cfg = settings_store.get_all(session)
    created: list[Reminder] = []

    for tortoise in session.exec(select(Tortoise)).all():
        if tortoise.archiviert:
            _resolve_all_open(session, tortoise.id)
            continue
        _auto_resolve_chip(session, tortoise)
        if cfg["reminder_fotodoku_aktiv"]:
            r = _check_foto(session, tortoise, today, cfg)
            if r:
                created.append(r)
        if cfg["reminder_chip_aktiv"]:
            r = _check_chip(session, tortoise, today, cfg)
            if r:
                created.append(r)

    session.commit()

    for reminder in created:
        session.refresh(reminder)
        sent = telegram.send_message(
            cfg["telegram_bot_token"], cfg["telegram_chat_id"], message_for(session, reminder)
        )
        if sent:
            reminder.telegram_gesendet_am = datetime.utcnow()
            session.add(reminder)
    session.commit()

    return created
