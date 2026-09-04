import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import init_db
from .routers import diarization, export, sessions, transcription, uploads

app = FastAPI(title="Speech-to-Text Transcription Studio", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(uploads.router)
app.include_router(transcription.router)
app.include_router(diarization.router)
app.include_router(sessions.router)
app.include_router(export.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health():
    return {"ok": True}


# Serve Frontend Static Files
dist_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../frontend/dist")
)
if not os.path.exists(dist_path):
    dist_path = os.path.abspath("frontend/dist")

if os.path.exists(dist_path):
    assets_path = os.path.join(dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            return {"error": "Not found"}
        file_path = os.path.join(dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_path, "index.html"))