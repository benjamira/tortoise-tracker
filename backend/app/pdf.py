import re
from io import BytesIO

from fpdf import FPDF
from PIL import Image, ImageOps

from . import images  # noqa: F401  (registers HEIC/HEIF support)
from .db import UPLOAD_DIR
from .models import Attachment

_MARGIN = 15
_CAPTION_HEIGHT = 10
_TARGET_DPI = 150  # plenty for a printed/on-screen photo at page size; keeps the PDF small


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "schildkroete"


def build_photo_pdf(tortoise_name: str, photos: list[Attachment]) -> bytes:
    """One photo per page, scaled to fit, with its capture date printed below it."""
    pdf = FPDF(unit="mm")
    pdf.set_auto_page_break(False)
    pdf.set_title(f"{tortoise_name} – Fotodokumentation")

    for photo in photos:
        try:
            with Image.open(UPLOAD_DIR / photo.dateiname) as img:
                img = ImageOps.exif_transpose(img).convert("RGB")
                w_px, h_px = img.size
                pdf.add_page(orientation="L" if w_px > h_px else "P")
                page_w, page_h = pdf.w, pdf.h
                max_w = page_w - 2 * _MARGIN
                max_h = page_h - 2 * _MARGIN - _CAPTION_HEIGHT
                scale = min(max_w / w_px, max_h / h_px)
                draw_w, draw_h = w_px * scale, h_px * scale

                # Camera photos are usually far higher-resolution than the page
                # needs; downscale to the DPI we'll actually render at instead of
                # embedding the full original pixels (that's what bloated the PDF).
                target_w = max(1, round(draw_w / 25.4 * _TARGET_DPI))
                target_h = max(1, round(draw_h / 25.4 * _TARGET_DPI))
                if target_w < w_px or target_h < h_px:
                    img = img.resize((target_w, target_h), Image.LANCZOS)

                buf = BytesIO()
                img.save(buf, "JPEG", quality=82)
                buf.seek(0)
                pdf.image(buf, x=(page_w - draw_w) / 2, y=_MARGIN, w=draw_w, h=draw_h)

                pdf.set_xy(_MARGIN, _MARGIN + draw_h + 4)
                pdf.set_font("Helvetica", size=12)
                caption = (
                    photo.aufnahme_datum.strftime("%d.%m.%Y")
                    if photo.aufnahme_datum
                    else "ohne Datum"
                )
                pdf.cell(max_w, 8, caption, align="C")
        except Exception:
            continue  # missing/corrupt file – skip rather than fail the whole export

    if pdf.page_no() == 0:
        raise ValueError("no photos could be rendered")

    return bytes(pdf.output())
