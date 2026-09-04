from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from .. import db
from ..services import export as export_service

router = APIRouter(prefix="/api")

EXPORT_FORMATS = {"txt", "srt", "docx", "pdf"}
CONTENT_TYPES = {
    "txt": "text/plain; charset=utf-8",
    "srt": "application/x-subrip; charset=utf-8",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf": "application/pdf",
}


@router.get("/sessions/{session_id}/export")
def export_session(
    session_id: str,
    format: str = "txt",
    include_speakers: bool = True,
    include_timestamps: bool = True,
):
    if format not in EXPORT_FORMATS:
        raise HTTPException(400, f"Unsupported format '{format}'. Use one of: {', '.join(sorted(EXPORT_FORMATS))}")
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    segments = session["segments"]
    speakers = session["speakers"]

    if format == "txt":
        content = export_service.export_txt(segments, speakers, include_speakers, include_timestamps)
        body = content.encode("utf-8")
    elif format == "srt":
        content = export_service.export_srt(segments, speakers, include_speakers)
        body = content.encode("utf-8")
    elif format == "docx":
        body = export_service.export_docx(segments, speakers, include_speakers, include_timestamps)
    else:
        body = export_service.export_pdf(segments, speakers, include_speakers, include_timestamps)

    filename = f"{session['filename'].rsplit('.', 1)[0] or 'transcript'}.{format}"
    return Response(
        content=body,
        media_type=CONTENT_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )