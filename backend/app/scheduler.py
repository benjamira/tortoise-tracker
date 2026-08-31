import logging
import os

from apscheduler.schedulers.background import BackgroundScheduler
from . import reminders
from .db import make_session

log = logging.getLogger("scheduler")
_scheduler: BackgroundScheduler | None = None


def run_evaluation() -> int:
    with make_session() as session:
        created = reminders.evaluate(session)
    if created:
        log.info("Reminder-Auswertung: %d neue Erinnerungen", len(created))
    return len(created)


def start() -> None:
    global _scheduler
    if _scheduler is not None or os.environ.get("DISABLE_SCHEDULER") == "1":
        return
    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(run_evaluation, "cron", hour=8, minute=0, id="evaluate_reminders")
    _scheduler.start()
    try:
        run_evaluation()
    except Exception:
        log.exception("Initiale Reminder-Auswertung fehlgeschlagen")
