import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path

from .config import settings

_lock = threading.Lock()
VIDEO_EXTS = {"mp4", "webm", "mov", "m4v", "mkv", "avi"}
DATABASE_URL = os.getenv("DATABASE_URL", "")


def media_kind(path: str) -> str:
    ext = Path(path).suffix.lower().lstrip(".")
    return "video" if ext in VIDEO_EXTS else "audio"


class PgRowWrapper:
    def __init__(self, cursor, row):
        self._cursor = cursor
        self._row = row
        self._keys = [d[0] for d in cursor.description]

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._row[key]
        idx = self._keys.index(key)
        return self._row[idx]


class PgConnWrapper:
    def __init__(self, pg_conn):
        self.conn = pg_conn

    def execute(self, query, params=None):
        cur = self.conn.cursor()
        pg_query = query.replace("?", "%s")
        if params:
            cur.execute(pg_query, params)
        else:
            cur.execute(pg_query)
        return cur

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()


def _conn():
    if DATABASE_URL:
        import psycopg2
        pg_conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        return PgConnWrapper(pg_conn)
    else:
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


def _session_from_row(row) -> dict:
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
        cur = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = cur.fetchone()
        if DATABASE_URL:
            row = PgRowWrapper(cur, row)
        conn.close()
        return _session_from_row(row)


def get_session(session_id: str) -> dict | None:
    with _lock:
        conn = _conn()
        cur = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = cur.fetchone()
        if row and DATABASE_URL:
            row = PgRowWrapper(cur, row)
        conn.close()
        return _session_from_row(row) if row else None


def list_sessions() -> list[dict]:
    with _lock:
        conn = _conn()
        cur = conn.execute("SELECT * FROM sessions ORDER BY created_at DESC")
        rows = cur.fetchall()
        result = []
        for r in rows:
            row = PgRowWrapper(cur, r) if DATABASE_URL else r
            result.append(_session_from_row(row))
        conn.close()
        return result


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
        cur = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = cur.fetchone()
        if row and DATABASE_URL:
            row = PgRowWrapper(cur, row)
        conn.close()
        return _session_from_row(row) if row else None


def delete_session(session_id: str) -> bool:
    with _lock:
        conn = _conn()
        cur = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
        affected = cur.rowcount if hasattr(cur, "rowcount") else 1
        conn.close()
        return affected > 0
