import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path

from .config import settings

_lock = threading.Lock()

VIDEO_EXTS = {"mp4", "webm", "mov", "m4v", "mkv", "avi"}


def media_kind(path: str) -> str:
    ext = Path(path).suffix.lower().lstrip(".")
    return "video" if ext in VIDEO_EXTS else "audio"


def _conn() -> sqlite3.Connection:
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _lock:
        conn = _conn()
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                audio_path TEXT NOT NULL,
                duration REAL DEFAULT 0,
                language TEXT,
                status TEXT DEFAULT 'uploaded',
                error TEXT,
                segments TEXT DEFAULT '[]',
                speakers TEXT DEFAULT '[]',
                settings TEXT DEFAULT '{}',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
        conn.close()


def _session_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "filename": row["filename"],
        "audio_path": row["audio_path"],
        "kind": media_kind(row["audio_path"]),
        "audio_url": f"/api/sessions/{row['id']}/audio",
        "duration": row["duration"] or 0,
        "language": row["language"],
        "status": row["status"],
        "error": row["error"],
        "segments": json.loads(row["segments"]),
        "speakers": json.loads(row["speakers"]),
        "settings": json.loads(row["settings"]),
        "created_at": row["created_at"],
    }


def create_session(session_id: str, filename: str, audio_path: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        conn = _conn()
        conn.execute(
            "INSERT INTO sessions (id, filename, audio_path, created_at) VALUES (?, ?, ?, ?)",
            (session_id, filename, audio_path, now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        conn.close()
        return _session_from_row(row)


def get_session(session_id: str) -> dict | None:
    with _lock:
        conn = _conn()
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        conn.close()
        return _session_from_row(row) if row else None


def list_sessions() -> list[dict]:
    with _lock:
        conn = _conn()
        rows = conn.execute("SELECT * FROM sessions ORDER BY created_at DESC").fetchall()
        conn.close()
        return [_session_from_row(r) for r in rows]


def update_session(session_id: str, **fields) -> dict | None:
    allowed = {"duration", "language", "status", "error", "segments", "speakers", "settings"}
    sets = []
    values = []
    for key, value in fields.items():
        if key not in allowed:
            continue
        if isinstance(value, (list, dict)):
            value = json.dumps(value, ensure_ascii=False)
        sets.append(f"{key} = ?")
        values.append(value)
    if not sets:
        return get_session(session_id)
    values.append(session_id)
    with _lock:
        conn = _conn()
        conn.execute(f"UPDATE sessions SET {', '.join(sets)} WHERE id = ?", values)
        conn.commit()
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        conn.close()
        return _session_from_row(row) if row else None


def delete_session(session_id: str) -> bool:
    with _lock:
        conn = _conn()
        cur = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
        conn.close()
        return cur.rowcount > 0