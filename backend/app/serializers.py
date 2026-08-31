from .models import Attachment
from .storage import thumb_name


def attachment_out(a: Attachment) -> dict:
    data = a.model_dump()
    data["url"] = f"/uploads/{a.dateiname}"
    data["thumbnail_url"] = (
        f"/uploads/thumbs/{thumb_name(a.dateiname)}" if a.art in ("foto", "profil") else None
    )
    return data
