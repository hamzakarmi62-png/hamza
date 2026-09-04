import threading

from fastapi import APIRouter, HTTPException

from .. import db
from ..models import DiarizeRequest
from ..services import diarization

router = APIRouter(prefix="/api")


def _run_diarization(session_id: str, num_speakers: int) -> None:
    try:
        session = db.get_session(session_id)
        if not session:
            return
        db.update_session(session_id, status="diarizing", error=None)
        segments, speakers = diarization.diarize(
            session["audio_path"], session["segments"], num_speakers
        )
        db.update_session(session_id, status="done", segments=segments, speakers=speakers)
    except Exception as exc:
        db.update_session(session_id, status="error", error=str(exc))


@router.post("/sessions/{session_id}/diarize")
def start_diarization(session_id: str, req: DiarizeRequest):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session["status"] == "diarizing":
        return {"ok": True, "status": "diarizing"}
    thread = threading.Thread(
        target=_run_diarization, args=(session_id, req.num_speakers), daemon=True
    )
    thread.start()
    return {"ok": True, "status": "diarizing"}