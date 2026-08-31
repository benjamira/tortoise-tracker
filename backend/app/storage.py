import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

ALLOWED_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heic",
    "application/pdf": ".pdf",
}
MAX_BYTES = 20 * 1024 * 1024


def thumb_name(dateiname: str) -> str:
    return Path(dateiname).stem + ".jpg"


def save_upload(file: UploadFile, upload_dir: Path) -> tuple[str, int]:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Dateityp nicht erlaubt: {file.content_type}")

    dateiname = f"{uuid.uuid4().hex}{ALLOWED_TYPES[content_type]}"
    dest = upload_dir / dateiname
    size = 0
    with dest.open("wb") as out:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_BYTES:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(413, "Datei zu groß (max. 20 MB)")
            out.write(chunk)
    return dateiname, size


def delete_files(upload_dir: Path, thumb_dir: Path, dateiname: str) -> None:
    (upload_dir / dateiname).unlink(missing_ok=True)
    (thumb_dir / thumb_name(dateiname)).unlink(missing_ok=True)
