import shutil
import threading
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .. import db
from ..config import settings

router = APIRouter(prefix="/api")

ALLOWED_EXTENSIONS = {"mp3", "wav", "m4a", "ogg", "webm", "mp4", "aac", "flac"}

MIME_BY_EXT = {
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "m4a": "audio/mp4",
    "aac": "audio/aac",
    "flac": "audio/flac",
    "ogg": "audio/ogg",
    "webm": "video/webm",
    "mp4": "video/mp4",
}

MAX_BYTES = 2000 * 1024 * 1024


def _validate_and_save(file: UploadFile) -> tuple[str, str, str]:
    filename = file.filename or "recording.webm"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webm"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '.{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    session_id = uuid.uuid4().hex[:12]
    stored_name = f"{session_id}.{ext}"
    dest = settings.upload_path / stored_name
    size = 0
    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)
        size = dest.stat().st_size
    if size > MAX_BYTES:
        dest.unlink(missing_ok=True)
        raise HTTPException(413, "File too large")
    return session_id, filename, str(dest)


@router.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    session_id, filename, path = _validate_and_save(file)
    session = db.create_session(session_id, filename, path)
    return session


@router.get("/sessions/{session_id}/audio")
def get_audio(session_id: str):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    path = Path(session["audio_path"])
    if not path.exists():
        raise HTTPException(404, "Audio file missing")
    ext = path.suffix.lower().lstrip(".")
    media_type = MIME_BY_EXT.get(ext, "application/octet-stream")
    return FileResponse(path, media_type=media_type, filename=session["filename"])


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    Path(session["audio_path"]).unlink(missing_ok=True)
    db.delete_session(session_id)
    return {"ok": True}


@router.post("/jobs/refresh")
def _noop():
    return {"ok": True, "threads": threading.active_count()}