import sys
import time

import httpx

BASE = "http://localhost:8000/api"


def main():
    with httpx.Client(timeout=120) as client:
        r = client.get(f"{BASE}/health")
        r.raise_for_status()

        with open("test_audio.wav", "rb") as f:
            r = client.post(f"{BASE}/upload", files={"file": ("test_audio.wav", f, "audio/wav")})
            r.raise_for_status()
            sid = r.json()["id"]
        print("SESSION:", sid)

        r = client.post(f"{BASE}/sessions/{sid}/transcribe", json={"language": None})
        r.raise_for_status()
        print("transcribe started")

        status = "processing"
        while status not in ("transcribed", "error"):
            time.sleep(4)
            s = client.get(f"{BASE}/sessions/{sid}").json()
            status = s["status"]
            print("  status:", status)
        if status == "error":
            print("TRANSCRIBE ERROR:", s["error"])
            sys.exit(1)
        print("SEGMENTS:", len(s["segments"]))

        r = client.post(f"{BASE}/sessions/{sid}/diarize", json={"num_speakers": 2})
        r.raise_for_status()
        print("diarize started")

        status = "diarizing"
        while status not in ("done", "error"):
            time.sleep(3)
            s = client.get(f"{BASE}/sessions/{sid}").json()
            status = s["status"]
            print("  status:", status)
        if status == "error":
            print("DIARIZE ERROR:", s["error"])
            sys.exit(1)

        print("SPEAKERS:", s["speakers"])
        for seg in s["segments"][:5]:
            print(f"  [{seg['start']:.2f}-{seg['end']:.2f}] spk={seg['speaker']}: {seg['text']!r}")

        for fmt in ("txt", "srt", "docx", "pdf"):
            r = client.get(f"{BASE}/sessions/{sid}/export", params={"format": fmt})
            r.raise_for_status()
            print(f"export {fmt}: {len(r.content)} bytes")

        r = client.get(f"{BASE}/sessions/{sid}/audio")
        r.raise_for_status()
        print("audio served:", r.headers.get("content-length"), "bytes")

        print("OK")


if __name__ == "__main__":
    main()