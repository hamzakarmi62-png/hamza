import logging

from ..config import settings
from ..services import speakers as speakers_service
from ..services.audio import detect_speech_turns

logger = logging.getLogger(__name__)

TURN_GAP_SECONDS = 0.7
MIN_SILENCE_SECONDS = 0.5
MAX_MERGE_GAP_SECONDS = 1.0


def diarize(audio_path: str, segments: list[dict], num_speakers: int = 2) -> tuple[list[dict], list[dict]]:
    method = settings.diarization_method
    if method == "auto":
        method = "pyannote" if _pyannote_ready() else "simple"

    if method == "pyannote":
        try:
            annotations = _diarize_pyannote(audio_path, num_speakers)
            _assign_from_annotations(segments, annotations)
        except Exception as exc:
            logger.warning("pyannote diarization failed (%s), falling back to simple", exc)
            _assign_simple(audio_path, segments, num_speakers)
    else:
        _assign_simple(audio_path, segments, num_speakers)

    merged = _merge_same_speaker_blocks(segments)
    return speakers_service.finalize_speakers(merged)


def _assign_simple(audio_path: str, segments: list[dict], num_speakers: int) -> None:
    if not _assign_energy_turns(audio_path, segments, num_speakers):
        _assign_turn_based(segments, num_speakers)


def _pyannote_ready() -> bool:
    if not settings.hf_token:
        return False
    try:
        import pyannote.audio  # noqa: F401
        return True
    except Exception:
        return False


def _diarize_pyannote(audio_path: str, num_speakers: int) -> list[tuple[float, float, str]]:
    from pyannote.audio import Pipeline

    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1", use_auth_token=settings.hf_token
    )
    diarization = pipeline(audio_path, num_speakers=num_speakers)
    out = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        out.append((round(turn.start, 3), round(turn.end, 3), speaker))
    return out


def _assign_from_annotations(segments: list[dict], annotations: list[tuple[float, float, str]]) -> None:
    overlap = {}
    for ann_start, ann_end, speaker in annotations:
        for seg in segments:
            o = min(seg["end"], ann_end) - max(seg["start"], ann_start)
            if o > 0 and o > overlap.get(seg["id"], (0, None))[0]:
                overlap[seg["id"]] = (o, speaker)
    labels = sorted({spk for _, _, spk in annotations})
    for seg in segments:
        _, label = overlap.get(seg["id"], (0, None))
        if label:
            seg["speaker"] = f"Speaker {labels.index(label) + 1}"


def _detect_turns(audio_path: str) -> list[tuple[float, float]]:
    return detect_speech_turns(audio_path, min_silence=MIN_SILENCE_SECONDS)


def _assign_energy_turns(audio_path: str, segments: list[dict], num_speakers: int) -> bool:
    turns = _detect_turns(audio_path)
    if not turns:
        return False
    turn_of = []
    for seg in segments:
        best = 0
        best_overlap = -1.0
        for i, (ts, te) in enumerate(turns):
            overlap = min(seg["end"], te) - max(seg["start"], ts)
            if overlap > best_overlap:
                best_overlap = overlap
                best = i
        turn_of.append(best)
    used = 0
    for turn_idx in sorted(set(turn_of)):
        label = f"Speaker {(used % max(num_speakers, 1)) + 1}"
        for seg, ti in zip(segments, turn_of):
            if ti == turn_idx:
                seg["speaker"] = label
        used += 1
    return True


def _assign_turn_based(segments: list[dict], num_speakers: int) -> None:
    turns: list[list[dict]] = []
    current: list[dict] = []
    for seg in segments:
        if current and seg["start"] - current[-1]["end"] > TURN_GAP_SECONDS:
            turns.append(current)
            current = []
        current.append(seg)
    if current:
        turns.append(current)
    for i, turn in enumerate(turns):
        label = f"Speaker {(i % max(num_speakers, 1)) + 1}"
        for seg in turn:
            seg["speaker"] = label


def _merge_same_speaker_blocks(segments: list[dict]) -> list[dict]:
    merged: list[dict] = []
    for seg in segments:
        if (
            merged
            and merged[-1]["speaker"] == seg["speaker"]
            and seg["start"] - merged[-1]["end"] <= MAX_MERGE_GAP_SECONDS
        ):
            prev = merged[-1]
            prev["end"] = seg["end"]
            prev["text"] = f"{prev['text']} {seg['text']}".strip()
            prev["words"] = list(prev.get("words", [])) + list(seg.get("words", []))
        else:
            merged.append(dict(seg))
    return merged