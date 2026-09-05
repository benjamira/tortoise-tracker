from datetime import date, datetime

from app import reminders
from app.db import make_session
from app.models import Attachment, Measurement, Tortoise


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
    # structured context for the frontend to localize
    assert listed[0]["context"]["intervall_monate"] == 6
    assert "letzte_doku" in listed[0]["context"]


def test_foto_reminder_clears_when_photo_added(client):
    tid = _add_tortoise(name="Alt", schlupfdatum=date(2011, 8, 4))
    with make_session() as session:
        created = reminders.evaluate(session, today=date(2026, 9, 5))
    assert any(r.typ == "fotodokumentation" for r in created)

    # a recent photo makes the reminder no longer due -> it is auto-resolved
    with make_session() as session:
        session.add(
            Attachment(
                tortoise_id=tid,
                art="foto",
                dateiname="x.jpg",
                originalname="x.jpg",
                mime="image/jpeg",
                groesse_bytes=1,
                aufnahme_datum=datetime(2026, 8, 31, 12, 0),
            )
        )
        session.commit()
        reminders.evaluate(session, today=date(2026, 9, 5))

    open_types = [r["typ"] for r in client.get("/api/reminders").json() if r["tier_name"] == "Alt"]
    assert "fotodokumentation" not in open_types


def test_chip_reminder_on_weight_threshold(client):
    tid = _add_tortoise(name="Schwer", schlupfdatum=date(2020, 1, 1))
    with make_session() as session:
        session.add(Measurement(tortoise_id=tid, datum=date(2026, 5, 1), gewicht_g=520))
        session.commit()
        created = reminders.evaluate(session, today=date(2026, 5, 2))
    assert any(r.typ == "chip" for r in created)

    chip = next(r for r in client.get("/api/reminders").json() if r["typ"] == "chip")
    assert chip["context"] == {"gewicht_g": 520, "schwelle_g": 500}

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
