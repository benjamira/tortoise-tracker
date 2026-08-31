import logging
from datetime import datetime
from pathlib import Path

from PIL import Image

log = logging.getLogger("images")

try:  # HEIC/HEIF support (iPhone photos)
    import pillow_heif

    pillow_heif.register_heif_opener()
except Exception:  # pragma: no cover - optional
    log.info("pillow-heif nicht verfügbar, HEIC-Fotos werden nicht unterstützt")

_EXIF_IFD = 0x8769
_DATETIME_ORIGINAL = 36867
_DATETIME = 306


def extract_capture_date(path: Path) -> datetime | None:
    """Read the EXIF capture date (DateTimeOriginal) from an image, if present."""
    try:
        with Image.open(path) as img:
            exif = img.getexif()
            raw = None
            try:
                raw = exif.get_ifd(_EXIF_IFD).get(_DATETIME_ORIGINAL)
            except Exception:
                raw = None
            if not raw:
                raw = exif.get(_DATETIME)
            if not raw:
                return None
            return datetime.strptime(str(raw).strip(), "%Y:%m:%d %H:%M:%S")
    except Exception:
        return None


def make_thumbnail(src: Path, dest: Path, size: tuple[int, int] = (500, 500)) -> bool:
    try:
        with Image.open(src) as img:
            img = img.convert("RGB")
            img.thumbnail(size)
            dest.parent.mkdir(parents=True, exist_ok=True)
            img.save(dest, "JPEG", quality=82)
        return True
    except Exception:
        log.warning("Thumbnail fehlgeschlagen für %s", src)
        return False
