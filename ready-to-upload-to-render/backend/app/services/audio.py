import numpy as np
import av

FRAME_SECONDS = 0.03


def load_audio(path: str, sample_rate: int = 16000) -> np.ndarray:
    container = av.open(path, metadata_errors="ignore")
    stream = container.streams.audio[0]
    resampler = av.AudioResampler(format="s16", layout="mono", rate=sample_rate)
    chunks: list[np.ndarray] = []
    for frame in container.decode(stream):
        frame.pts = None
        for res in resampler.resample(frame):
            chunks.append(res.to_ndarray()[0].astype(np.float32))
    while True:
        out = resampler.resample(None)
        if not out:
            break
        for res in out:
            chunks.append(res.to_ndarray()[0].astype(np.float32))
    container.close()
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return np.concatenate(chunks) / 32768.0


def get_duration(path: str) -> float:
    try:
        container = av.open(path, metadata_errors="ignore")
        duration = container.duration
        container.close()
        if duration:
            return round(duration / 1_000_000, 3)
    except Exception:
        pass
    return round(len(load_audio(path)) / 16000.0, 3)


def detect_speech_turns(path: str, min_silence: float = 0.4) -> list[tuple[float, float]]:
    wave = load_audio(path, 16000)
    if len(wave) == 0:
        return []
    frame_len = int(FRAME_SECONDS * 16000)
    n_frames = len(wave) // frame_len
    if n_frames == 0:
        return []
    energies = np.array(
        [
            float(np.sqrt(np.mean(wave[i * frame_len : (i + 1) * frame_len] ** 2)))
            for i in range(n_frames)
        ]
    )
    noise_floor = float(np.percentile(energies, 15))
    threshold = max(noise_floor * 4.0, 0.015)
    speech = energies > threshold
    speech[1:-1] = speech[1:-1] & (speech[:-2] | speech[2:])

    intervals: list[tuple[float, float]] = []
    in_speech = False
    start = 0
    for i, is_speech in enumerate(speech):
        if is_speech and not in_speech:
            start = i
            in_speech = True
        elif not is_speech and in_speech:
            intervals.append((start * FRAME_SECONDS, i * FRAME_SECONDS))
            in_speech = False
    if in_speech:
        intervals.append((start * FRAME_SECONDS, n_frames * FRAME_SECONDS))
    if not intervals:
        return []

    merged: list[list[float]] = [list(intervals[0])]
    for s, e in intervals[1:]:
        if s - merged[-1][1] < min_silence:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    return [(round(a, 3), round(b, 3)) for a, b in merged]