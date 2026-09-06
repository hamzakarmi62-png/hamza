import sys
import time

import httpx

BASE = "http://localhost:8000/api"


def run(client, path, lang):
    with open(path, "rb") as f:
        r = client.post(f"{BASE}/upload", files={"file": (path, f, "audio/mpeg")})
        r.raise_for_status()
        sid = r.json()["id"]
    print(f"\n=== {path} (session {sid}) ===")

    r = client.post(f"{BASE}/sessions/{sid}/transcribe", json={"language": lang})
    r.raise_for_status()
    status = "processing"
    while status not in ("transcribed", "error"):
        time.sleep(4)
        s = client.get(f"{BASE}/sessions/{sid}").json()
        status = s["status"]
    if status == "error":
        print("TRANSCRIBE ERROR:", s["error"])
        return
    print(f"language={s['language']} segments={len(s['segments'])}")

    r = client.post(f"{BASE}/sessions/{sid}/diarize", json={"num_speakers": 2})
    r.raise_for_status()
    status = "diarizing"
    while status not in ("done", "error"):
        time.sleep(3)
        s = client.get(f"{BASE}/sessions/{sid}").json()
        status = s["status"]
    if status == "error":
        print("DIARIZE ERROR:", s["error"])
        return

    print("SPEAKERS:", [(sp["id"], sp["name"]) for sp in s["speakers"]])
    for seg in s["segments"]:
        spk = next((sp["name"] for sp in s["speakers"] if sp["id"] == seg["speaker"]), "?")
        print(f"  [{seg['start']:.2f}-{seg['end']:.2f}] {spk}: {seg['text']}")

    for fmt in ("txt", "srt"):
        r = client.get(f"{BASE}/sessions/{sid}/export", params={"format": fmt})
        r.raise_for_status()
        print(f"--- {fmt} ---")
        print(r.text)
    for fmt in ("docx", "pdf"):
        r = client.get(f"{BASE}/sessions/{sid}/export", params={"format": fmt})
        r.raise_for_status()
        print(f"export {fmt}: {len(r.content)} bytes")


def main():
    with httpx.Client(timeout=120) as client:
        run(client, "test_two_speakers.mp3", "en")
        run(client, "test_arabic.mp3", "ar")


if __name__ == "__main__":
    main()