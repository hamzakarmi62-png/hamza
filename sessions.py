from fastapi import APIRouter, HTTPException

from .. import db
from ..models import SessionUpdate

router = APIRouter(prefix="/api")


@router.get("/sessions")
def get_sessions():
    return db.list_sessions()


@router.get("/sessions/{session_id}")
def get_session(session_id: str):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return session


@router.put("/sessions/{session_id}")
def update_session(session_id: str, payload: SessionUpdate):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return db.update_session(
        session_id,
        segments=[s.model_dump() for s in payload.segments],
        speakers=[s.model_dump() for s in payload.speakers],
        settings=payload.settings,
        language=payload.language,
        duration=payload.duration if payload.duration is not None else session["duration"],
    )


@router.post("/sessions/{session_id}/save")
def save_session(session_id: str, payload: SessionUpdate):
    return update_session(session_id, payload)