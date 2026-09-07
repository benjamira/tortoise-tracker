import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import UPLOAD_DIR, init_db
from .routers import (
    attachments,
    events,
    measurements,
    notes,
    reminders,
    settings,
    tortoises,
)

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    from . import scheduler

    scheduler.start()
    yield


app = FastAPI(title="Schildkröten-Doku", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


APP_VERSION = os.environ.get("APP_VERSION", "dev")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/version")
def version() -> dict:
    return {"version": APP_VERSION}


app.include_router(tortoises.router)
app.include_router(measurements.router)
app.include_router(events.router)
app.include_router(attachments.router)
app.include_router(settings.router)
app.include_router(reminders.router)
app.include_router(notes.router)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
