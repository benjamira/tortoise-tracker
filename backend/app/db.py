import os
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
UPLOAD_DIR = DATA_DIR / "uploads"
THUMB_DIR = UPLOAD_DIR / "thumbs"

for _d in (DATA_DIR, UPLOAD_DIR, THUMB_DIR):
    _d.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "schildkroeten.db"
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)


def init_db() -> None:
    # Import models so they are registered on SQLModel.metadata before create_all.
    from . import models  # noqa: F401

    SQLModel.metadata.create_all(engine)
    _ensure_columns()


# Lightweight, idempotent "migrations" for SQLite – add columns that were
# introduced after a database was first created. New databases already get every
# column from create_all(), so this is a no-op for them.
_ADDED_COLUMNS: dict[str, dict[str, str]] = {
    "tortoise": {
        "sterbedatum": "DATE",
        "verkaufsdatum": "DATE",
        "archiviert": "BOOLEAN NOT NULL DEFAULT 0",
        "sortierung": "INTEGER NOT NULL DEFAULT 0",
        "eigene_nachzucht": "BOOLEAN NOT NULL DEFAULT 0",
    },
}

# Run once, right after a column is first added.
_BACKFILL: dict[str, dict[str, str]] = {
    "tortoise": {
        "sortierung": "UPDATE tortoise SET sortierung = id",
    },
}


def _ensure_columns() -> None:
    with engine.begin() as conn:
        for table, columns in _ADDED_COLUMNS.items():
            existing = {
                row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")
            }
            for name, ddl in columns.items():
                if name not in existing:
                    conn.exec_driver_sql(
                        f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"
                    )
                    stmt = _BACKFILL.get(table, {}).get(name)
                    if stmt:
                        conn.exec_driver_sql(stmt)


def make_session() -> Session:
    # expire_on_commit=False keeps attributes readable after commit(), so handlers
    # can serialize an object they just saved without a redundant refresh.
    return Session(engine, expire_on_commit=False)


def get_session():
    with make_session() as session:
        yield session
