import logging
import os
import threading
import uuid

from faster_whisper import WhisperModel

from ..config import settings
from .audio import detect_speech_turns

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_model: WhisperModel | None = None

COVERAGE_THRESHOLD = 0.6
TURN_COVERAGE_THRESHOLD = 0.5


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                cpu_count = max(1, os.cpu_count() or 4)
                _model = WhisperModel(
                    settings.whisper_model,
                    device=settings.whisper_device,
                    compute_type=settings.whisper_compute_type,
                    cpu_threads=cpu_count,
                    num_workers=min(4, cpu_count),
                )
    return _model


def _collect(segments_iter) -> list[dict]:
    segments = []
    for seg in segments_iter:
        words = []
        for w in seg.words or []:
            words.append({"word": w.word, "start": round(w.start, 3), "end": round(w.end, 3)})
        text = (seg.text or "").strip()
        if not text:
            continue
        segments.append(
            {
                "id": uuid.uuid4().hex[:12],
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": text,
                "speaker": None,
                "words": words,
            }
        )
    return segments


def _vad_coverage(audio_path: str, segments: list[dict]) -> float:
    turns = detect_speech_turns(audio_path)
    if not turns:
        return 1.0
    spans = [(seg["start"], seg["end"]) for seg in segments]
    total_speech = 0.0
    covered_total = 0.0
    for ts, te in turns:
        turn_len = te - ts
        total_speech += turn_len
        covered = 0.0
        for ss, se in spans:
            covered += max(0.0, min(se, te) - max(ss, ts))
        if turn_len > 0 and covered / turn_len < TURN_COVERAGE_THRESHOLD:
            return 0.0
        covered_total += covered
    if total_speech <= 0:
        return 1.0
    return covered_total / total_speech


def transcribe(audio_path: str, language: str | None = None) -> dict:
    model = get_model()
    kwargs = {
        "language": language or None,
        "word_timestamps": True,
        "beam_size": 1,
        "best_of": 1,
    }

    segments_iter, info = model.transcribe(audio_path, vad_filter=True, **kwargs)
    segments = _collect(segments_iter)
    coverage = _vad_coverage(audio_path, segments)
    if coverage < COVERAGE_THRESHOLD:
        logger.warning("VAD dropped too much speech (coverage %.2f), retrying without VAD", coverage)
        segments_iter, info = model.transcribe(audio_path, vad_filter=False, **kwargs)
        segments = _collect(segments_iter)

    return {
        "segments": segments,
        "duration": round(info.duration, 3),
        "language": info.language,
    }