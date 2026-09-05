from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Tortoise(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    unterart: Optional[str] = None
    schlupfdatum: Optional[date] = None
    geschlecht: str = "unbekannt"  # maennlich | weiblich | unbekannt
    herkunft: Optional[str] = None
    eigene_nachzucht: bool = Field(default=False)
    cites_nummer: Optional[str] = None
    transponder_nr: Optional[str] = None
    kennzeichnung: Optional[str] = None
    erworben_am: Optional[date] = None
    sterbedatum: Optional[date] = None
    verkaufsdatum: Optional[date] = None
    archiviert: bool = Field(default=False)
    sortierung: int = Field(default=0)  # manuelle Reihenfolge in der Seitenleiste
    titelbild_id: Optional[int] = None
    notizen: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Measurement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tortoise_id: int = Field(foreign_key="tortoise.id", index=True)
    datum: date
    gewicht_g: Optional[float] = None  # eine Nachkommastelle erlaubt
    panzerlaenge_mm: Optional[int] = None
    notiz: Optional[str] = None


class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tortoise_id: int = Field(foreign_key="tortoise.id", index=True)
    datum: date
    typ: str = "sonstiges"  # einwinterung|auswinterung|tierarzt|medikation|sonstiges
    text: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Attachment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tortoise_id: int = Field(foreign_key="tortoise.id", index=True)
    event_id: Optional[int] = Field(default=None, foreign_key="event.id", index=True)
    art: str = "foto"  # foto | dokument
    dateiname: str
    originalname: str
    mime: str
    groesse_bytes: int
    beschriftung: Optional[str] = None
    aufnahme_datum: Optional[datetime] = None
    hochgeladen_am: datetime = Field(default_factory=datetime.utcnow)


class Note(SQLModel, table=True):
    """Standalone free-text note (not tied to a tortoise)."""

    id: Optional[int] = Field(default=None, primary_key=True)
    datum: date = Field(default_factory=lambda: datetime.utcnow().date())
    text: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Setting(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str  # JSON-encoded


class Reminder(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tortoise_id: int = Field(foreign_key="tortoise.id", index=True)
    typ: str  # fotodokumentation | chip
    faellig_seit: date
    status: str = "offen"  # offen | snooze | erledigt
    snooze_bis: Optional[date] = None
    telegram_gesendet_am: Optional[datetime] = None
    kontext: Optional[str] = None
    erstellt_am: datetime = Field(default_factory=datetime.utcnow)
    erledigt_am: Optional[datetime] = None
