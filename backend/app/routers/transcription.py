import threading

from fastapi import APIRouter, HTTPException

from .. import db
from ..models import TranscribeRequest
from ..services import transcription

router = APIRouter(prefix="/api")


def _run_transcription(session_id: str, language: str | None) -> None:
    try:
        session = db.get_session(session_id)
        if not session:
            return
        db.update_session(session_id, status="processing", error=None)
        result = transcription.transcribe(session["audio_path"], language=language)
        db.update_session(
            session_id,
            status="transcribed",
            duration=result["duration"],
            language=result["language"],
            segments=result["segments"],
        )
    except Exception as exc:
        db.update_session(session_id, status="error", error=str(exc))


@router.post("/sessions/{session_id}/transcribe")
def start_transcription(session_id: str, req: TranscribeRequest):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session["status"] == "processing":
        return {"ok": True, "status": "processing"}
    db.update_session(session_id, status="processing", error=None)
    thread = threading.Thread(
        target=_run_transcription, args=(session_id, req.language), daemon=True
    )
    thread.start()
    return {"ok": True, "status": "processing"}