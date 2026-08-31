from datetime import date

from app import reminders
from app.db import make_session
from app.models import Measurement, Tortoise


def _add_tortoise(**kwargs) -> int:
    with make_session() as session:
        t = Tortoise(name=kwargs.pop("name", "Test"), **kwargs)
        session.add(t)
        session.commit()
        session.refresh(t)
        return t.id


def test_foto_reminder_for_young_tortoise(client):
    tid = _add_tortoise(name="Jung", schlupfdatum=date(2024, 1, 1))
    with make_session() as session:
        created = reminders.evaluate(session, today=date(2026, 1, 1))
    assert [r.typ for r in created] == ["fotodokumentation"]

    # running again does not create a duplicate
    with make_session() as session:
        assert reminders.evaluate(session, today=date(2026, 1, 2)) == []

    listed = client.get("/api/reminders").json()
    assert listed[0]["typ"] == "fotodokumentation"
    assert listed[0]["tier_name"] == "Jung"


def test_chip_reminder_on_weight_threshold(client):
    tid = _add_tortoise(name="Schwer", schlupfdatum=date(2020, 1, 1))
    with make_session() as session:
        session.add(Measurement(tortoise_id=tid, datum=date(2026, 5, 1), gewicht_g=520))
        session.commit()
        created = reminders.evaluate(session, today=date(2026, 5, 2))
    assert any(r.typ == "chip" for r in created)

    # entering a transponder number resolves the open chip reminder
    client.patch(f"/api/tortoises/{tid}", json={"transponder_nr": "276000000000123"})
    with make_session() as session:
        reminders.evaluate(session, today=date(2026, 5, 3))
    open_types = [r["typ"] for r in client.get("/api/reminders").json() if r["tier_name"] == "Schwer"]
    assert "chip" not in open_types


def test_no_chip_reminder_below_threshold(client):
    tid = _add_tortoise(name="Leicht")
    with make_session() as session:
        session.add(Measurement(tortoise_id=tid, datum=date(2026, 5, 1), gewicht_g=300))
        session.commit()
        created = reminders.evaluate(session, today=date(2026, 5, 2))
    assert all(r.typ != "chip" for r in created)


def test_ack_and_snooze(client):
    _add_tortoise(name="Ack", schlupfdatum=date(2024, 1, 1))
    with make_session() as session:
        created = reminders.evaluate(session, today=date(2026, 1, 1))
    rid = created[0].id

    client.post(f"/api/reminders/{rid}/snooze", json={"tage": 30})
    assert client.get("/api/reminders").json() == []

    client.post(f"/api/reminders/{rid}/ack")
    assert client.get("/api/reminders").json() == []
