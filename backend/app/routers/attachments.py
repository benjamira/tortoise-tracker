from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from ..db import THUMB_DIR, UPLOAD_DIR, get_session
from ..images import extract_capture_date, make_thumbnail
from ..models import Attachment, Tortoise
from ..serializers import attachment_out
from ..storage import delete_files, save_upload, thumb_name

router = APIRouter(prefix="/api", tags=["attachments"])

_EDITABLE = {"beschriftung", "aufnahme_datum", "event_id", "art"}


@router.post("/tortoises/{tid}/attachments", status_code=201)
def upload_attachments(
    tid: int,
    files: list[UploadFile] = File(...),
    art: str = Form("foto"),
    event_id: Optional[int] = Form(None),
    beschriftung: Optional[str] = Form(None),
    session: Session = Depends(get_session),
):
    tortoise = session.get(Tortoise, tid)
    if not tortoise:
        raise HTTPException(404, "Schildkröte nicht gefunden")

    created = []
    for upload in files:
        dateiname, size = save_upload(upload, UPLOAD_DIR)
        is_image = (upload.content_type or "").lower().startswith("image/")
        art_final = "foto" if is_image and art != "dokument" else "dokument"

        aufnahme_datum = None
        if is_image:
            aufnahme_datum = extract_capture_date(UPLOAD_DIR / dateiname)
            make_thumbnail(UPLOAD_DIR / dateiname, THUMB_DIR / thumb_name(dateiname))

        attachment = Attachment(
            tortoise_id=tid,
            event_id=event_id,
            art=art_final,
            dateiname=dateiname,
            originalname=upload.filename or dateiname,
            mime=upload.content_type or "",
            groesse_bytes=size,
            beschriftung=beschriftung,
            aufnahme_datum=aufnahme_datum or (datetime.utcnow() if art_final == "foto" else None),
        )
        session.add(attachment)
        session.commit()
        session.refresh(attachment)

        if art_final == "foto" and not tortoise.titelbild_id:
            tortoise.titelbild_id = attachment.id
            session.add(tortoise)
            session.commit()

        created.append(attachment_out(attachment))
    return created


@router.put("/tortoises/{tid}/titelbild", status_code=201)
def set_titelbild(
    tid: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    tortoise = session.get(Tortoise, tid)
    if not tortoise:
        raise HTTPException(404, "Schildkröte nicht gefunden")
    if not (file.content_type or "").lower().startswith("image/"):
        raise HTTPException(400, "Nur Bilddateien sind als Profilbild erlaubt")

    dateiname, size = save_upload(file, UPLOAD_DIR)
    make_thumbnail(UPLOAD_DIR / dateiname, THUMB_DIR / thumb_name(dateiname))

    previous = session.exec(
        select(Attachment).where(
            Attachment.tortoise_id == tid, Attachment.art == "profil"
        )
    ).all()

    attachment = Attachment(
        tortoise_id=tid,
        art="profil",
        dateiname=dateiname,
        originalname=file.filename or dateiname,
        mime=file.content_type or "",
        groesse_bytes=size,
        aufnahme_datum=extract_capture_date(UPLOAD_DIR / dateiname) or datetime.utcnow(),
    )
    session.add(attachment)
    session.commit()
    session.refresh(attachment)

    tortoise.titelbild_id = attachment.id
    session.add(tortoise)
    for old in previous:
        delete_files(UPLOAD_DIR, THUMB_DIR, old.dateiname)
        session.delete(old)
    session.commit()
    return attachment_out(attachment)


@router.delete("/tortoises/{tid}/titelbild", status_code=204)
def clear_titelbild(tid: int, session: Session = Depends(get_session)):
    tortoise = session.get(Tortoise, tid)
    if not tortoise:
        raise HTTPException(404, "Schildkröte nicht gefunden")
    tortoise.titelbild_id = None
    session.add(tortoise)
    for old in session.exec(
        select(Attachment).where(
            Attachment.tortoise_id == tid, Attachment.art == "profil"
        )
    ).all():
        delete_files(UPLOAD_DIR, THUMB_DIR, old.dateiname)
        session.delete(old)
    session.commit()


@router.patch("/attachments/{aid}")
def update_attachment(aid: int, payload: dict, session: Session = Depends(get_session)):
    attachment = session.get(Attachment, aid)
    if not attachment:
        raise HTTPException(404, "Anhang nicht gefunden")
    for key, value in payload.items():
        if key not in _EDITABLE:
            continue
        if key == "aufnahme_datum" and isinstance(value, str) and value:
            value = datetime.fromisoformat(value)
        setattr(attachment, key, value)
    session.add(attachment)
    session.commit()
    session.refresh(attachment)
    return attachment_out(attachment)


@router.delete("/attachments/{aid}", status_code=204)
def delete_attachment(aid: int, session: Session = Depends(get_session)):
    attachment = session.get(Attachment, aid)
    if not attachment:
        raise HTTPException(404, "Anhang nicht gefunden")

    # Clear title image references pointing at this attachment.
    for tortoise in session.exec(
        select(Tortoise).where(Tortoise.titelbild_id == aid)
    ).all():
        replacement = session.exec(
            select(Attachment)
            .where(
                Attachment.tortoise_id == tortoise.id,
                Attachment.art == "foto",
                Attachment.id != aid,
            )
            .order_by(Attachment.aufnahme_datum.desc())
        ).first()
        tortoise.titelbild_id = replacement.id if replacement else None
        session.add(tortoise)

    delete_files(UPLOAD_DIR, THUMB_DIR, attachment.dateiname)
    session.delete(attachment)
    session.commit()
