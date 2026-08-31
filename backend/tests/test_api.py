import io

from PIL import Image


def _png_bytes(exif_date: str | None = None) -> bytes:
    img = Image.new("RGB", (32, 32), (60, 120, 60))
    buf = io.BytesIO()
    if exif_date:
        exif = img.getexif()
        exif[306] = exif_date  # DateTime
        img.save(buf, format="JPEG", exif=exif)
    else:
        img.save(buf, format="PNG")
    return buf.getvalue()


def test_tortoise_crud(client):
    resp = client.post("/api/tortoises", json={"name": "Speedy", "geschlecht": "weiblich"})
    assert resp.status_code == 201
    tid = resp.json()["id"]

    resp = client.get("/api/tortoises")
    assert resp.status_code == 200
    assert resp.json()[0]["name"] == "Speedy"
    assert resp.json()[0]["aktuelles_gewicht_g"] is None

    resp = client.patch(f"/api/tortoises/{tid}", json={"cites_nummer": "DE-1234"})
    assert resp.json()["cites_nummer"] == "DE-1234"

    assert client.delete(f"/api/tortoises/{tid}").status_code == 204
    assert client.get(f"/api/tortoises/{tid}").status_code == 404


def test_patch_tortoise_with_full_body_and_dates(client):
    """The edit form sends the whole object back (id, created_at, date strings)."""
    created = client.post(
        "/api/tortoises", json={"name": "Berta", "schlupfdatum": "2024-03-01"}
    ).json()
    resp = client.patch(
        f"/api/tortoises/{created['id']}",
        json={**created, "herkunft": "Nachzucht 2024"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["herkunft"] == "Nachzucht 2024"
    assert body["schlupfdatum"] == "2024-03-01"


def test_measurement_ratio(client):
    tid = client.post("/api/tortoises", json={"name": "Franz"}).json()["id"]
    resp = client.post(
        f"/api/tortoises/{tid}/measurements",
        json={"datum": "2026-01-01", "gewicht_g": 400, "panzerlaenge_mm": 100},
    )
    assert resp.status_code == 201
    assert resp.json()["jackson_ratio"] == 4.0
    assert client.get(f"/api/tortoises/{tid}").json()["aktuelles_gewicht_g"] == 400


def test_photo_upload_reads_exif_date(client):
    tid = client.post("/api/tortoises", json={"name": "Nero"}).json()["id"]
    files = {"files": ("foto.jpg", _png_bytes("2025:06:15 10:00:00"), "image/jpeg")}
    resp = client.post(f"/api/tortoises/{tid}/attachments", files=files)
    assert resp.status_code == 201
    body = resp.json()[0]
    assert body["art"] == "foto"
    assert body["aufnahme_datum"].startswith("2025-06-15")
    assert body["thumbnail_url"].startswith("/uploads/thumbs/")

    # first uploaded photo becomes the title image
    assert client.get(f"/api/tortoises/{tid}").json()["titelbild_url"] is not None


def test_reorder_tortoises(client):
    ids = [client.post("/api/tortoises", json={"name": n}).json()["id"] for n in ("A", "B", "C")]
    # default order follows creation (sortierung increments)
    assert [t["id"] for t in client.get("/api/tortoises").json()] == ids

    new_order = [ids[2], ids[0], ids[1]]
    assert client.put("/api/tortoises/order", json={"ids": new_order}).status_code == 200
    assert [t["id"] for t in client.get("/api/tortoises").json()] == new_order


def test_archive_flow(client):
    tid = client.post("/api/tortoises", json={"name": "Uralt"}).json()["id"]
    assert client.get(f"/api/tortoises/{tid}").json()["archiviert"] is False

    resp = client.patch(
        f"/api/tortoises/{tid}",
        json={"sterbedatum": "2026-07-01", "archiviert": True},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["sterbedatum"] == "2026-07-01"
    assert body["archiviert"] is True

    # list still returns it, flagged – the sidebar splits client-side
    listed = {t["id"]: t for t in client.get("/api/tortoises").json()}
    assert listed[tid]["archiviert"] is True

    # un-archiving works
    assert client.patch(f"/api/tortoises/{tid}", json={"archiviert": False}).json()["archiviert"] is False


def test_archived_tortoise_gets_no_reminders(client):
    tid = client.post(
        "/api/tortoises", json={"name": "Weg", "schlupfdatum": "2024-01-01", "archiviert": True}
    ).json()["id"]
    client.post("/api/reminders/evaluate")
    open_ids = [r["tortoise_id"] for r in client.get("/api/reminders").json()]
    assert tid not in open_ids


def test_profile_picture(client):
    tid = client.post("/api/tortoises", json={"name": "Paula"}).json()["id"]
    assert client.get(f"/api/tortoises/{tid}").json()["titelbild_url"] is None

    up = client.put(
        f"/api/tortoises/{tid}/titelbild",
        files={"file": ("p.jpg", _png_bytes("2025:01:01 09:00:00"), "image/jpeg")},
    )
    assert up.status_code == 201
    assert up.json()["art"] == "profil"

    detail = client.get(f"/api/tortoises/{tid}").json()
    assert detail["titelbild_url"] is not None
    # profile picture must not count as photo documentation
    assert client.get(f"/api/tortoises/{tid}/attachments", params={"art": "foto"}).json() == []

    # replacing keeps a single profile attachment
    client.put(
        f"/api/tortoises/{tid}/titelbild",
        files={"file": ("p2.jpg", _png_bytes("2025:02:02 09:00:00"), "image/jpeg")},
    )
    profils = client.get(f"/api/tortoises/{tid}/attachments", params={"art": "profil"}).json()
    assert len(profils) == 1

    assert client.delete(f"/api/tortoises/{tid}/titelbild").status_code == 204
    assert client.get(f"/api/tortoises/{tid}").json()["titelbild_url"] is None


def test_document_upload_and_listing(client):
    tid = client.post("/api/tortoises", json={"name": "Olga"}).json()["id"]
    files = {"files": ("cites.pdf", b"%PDF-1.4 fake", "application/pdf")}
    resp = client.post(f"/api/tortoises/{tid}/attachments", files=files, data={"art": "dokument"})
    assert resp.status_code == 201
    assert resp.json()[0]["art"] == "dokument"

    docs = client.get(f"/api/tortoises/{tid}/attachments", params={"art": "dokument"}).json()
    assert len(docs) == 1


def test_events_crud(client):
    tid = client.post("/api/tortoises", json={"name": "Rex"}).json()["id"]
    resp = client.post(
        f"/api/tortoises/{tid}/events",
        json={"datum": "2026-10-01", "typ": "einwinterung", "text": "Kühlschrank, 5°C"},
    )
    assert resp.status_code == 201
    eid = resp.json()["id"]

    # several events in a row must all persist; date and free text are optional
    second = client.post(f"/api/tortoises/{tid}/events", json={"typ": "tierarzt"})
    assert second.status_code == 201
    assert second.json()["datum"]
    assert second.json()["text"] == ""
    assert len(client.get(f"/api/tortoises/{tid}/events").json()) == 2

    resp = client.patch(f"/api/events/{eid}", json={"text": "Kühlschrank, 6°C"})
    assert resp.json()["text"] == "Kühlschrank, 6°C"

    assert client.delete(f"/api/events/{eid}").status_code == 204
    assert len(client.get(f"/api/tortoises/{tid}/events").json()) == 1


def test_settings_masks_token(client):
    client.put("/api/settings", json={"telegram_bot_token": "secret123", "telegram_chat_id": "42"})
    cfg = client.get("/api/settings").json()
    assert cfg["telegram_bot_token"] == "********"
    assert cfg["telegram_chat_id"] == "42"

    # sending the mask back does not overwrite the stored token
    client.put("/api/settings", json={"telegram_bot_token": "********", "telegram_chat_id": "99"})
    cfg = client.get("/api/settings").json()
    assert cfg["telegram_chat_id"] == "99"
