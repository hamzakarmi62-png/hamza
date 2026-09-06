import asyncio
import io

import av
import edge_tts
import numpy as np

SR = 16000
VOICE_A = "en-US-GuyNeural"
VOICE_B = "en-US-JennyNeural"

CLIPS = [
    (VOICE_A, "Hello Sarah, how are you doing today?"),
    (VOICE_A, "Did you finish the report we discussed yesterday?"),
    (VOICE_B, "I am doing great, thank you for asking."),
    (VOICE_B, "Yes, I finished it this morning and sent it to your inbox."),
    (VOICE_A, "Perfect, I will review it right away."),
]

# silence per item: before turn start and between sentences within a turn
PAD_BEFORE = [0.8, 0.3, 0.8, 0.3, 0.8]


async def synth(text, voice):
    buf = bytearray()
    c = edge_tts.Communicate(text, voice)
    async for chunk in c.stream():
        if chunk["type"] == "audio":
            buf.extend(chunk["data"])
    return bytes(buf)


def decode_wav(data):
    container = av.open(io.BytesIO(data))
    stream = container.streams.audio[0]
    resampler = av.AudioResampler(format="s16", layout="mono", rate=SR)
    chunks = []
    for frame in container.decode(stream):
        frame.pts = None
        for r in resampler.resample(frame):
            chunks.append(r.to_ndarray()[0].astype(np.float32))
    while True:
        out = resampler.resample(None)
        if not out:
            break
        for r in out:
            chunks.append(r.to_ndarray()[0].astype(np.float32))
    container.close()
    if not chunks:
        return np.zeros(0, np.float32)
    return np.concatenate(chunks)


def write_wav(path, wave):
    wave16 = (wave * 32767).astype(np.int16)
    out = av.open(path, "w")
    stream = out.add_stream("pcm_s16le", rate=SR, layout="mono")
    for i in range(0, len(wave16), SR):
        frame = av.AudioFrame.from_ndarray(wave16[i : i + SR].reshape(1, -1), format="s16", layout="mono")
        frame.sample_rate = SR
        for p in stream.encode(frame):
            out.mux(p)
    for p in stream.encode():
        out.mux(p)
    out.close()
    print("wrote", path, len(wave) / SR, "sec")


def mux_to_mp4(wav_path, mp4_path):
    container_in = av.open(wav_path)
    audio_in = container_in.streams.audio[0]
    container_out = av.open(mp4_path, "w")
    stream_out = container_out.add_stream("aac", rate=SR, layout="mono")
    for frame in container_in.decode(audio_in):
        for p in stream_out.encode(frame):
            container_out.mux(p)
    for p in stream_out.encode():
        container_out.mux(p)
    container_out.close()
    container_in.close()
    print("wrote", mp4_path)


def trim_silence(wave, thresh=0.01, margin=int(0.08 * SR)):
    idx = np.where(np.abs(wave) > thresh)[0]
    if len(idx) == 0:
        return wave
    return wave[max(0, idx[0] - margin) : min(len(wave), idx[-1] + margin)]


async def main():
    waves = []
    for i, (voice, text) in enumerate(CLIPS):
        audio = await synth(text, voice)
        waves.append(trim_silence(decode_wav(audio)))
    full = []
    for i, wave in enumerate(waves):
        full.append(np.zeros(int(PAD_BEFORE[i] * SR), dtype=np.float32))
        full.append(wave)
    write_wav("test_multisentence.wav", np.concatenate(full))
    mux_to_mp4("test_two_speakers.mp3", "test_two_speakers.mp4")


asyncio.run(main())