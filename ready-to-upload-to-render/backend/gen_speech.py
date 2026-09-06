import asyncio

import edge_tts

EN = [
    ("en-US-GuyNeural", "Hello Sarah, how are you doing today?"),
    ("en-US-JennyNeural", "I am doing great, thank you for asking."),
    ("en-US-GuyNeural", "Did you finish the report we discussed yesterday?"),
    ("en-US-JennyNeural", "Yes, I finished it this morning and sent it to your inbox."),
    ("en-US-GuyNeural", "Perfect, I will review it right away."),
]

AR = [
    ("ar-SA-HamedNeural", "مرحباً أحمد، كيف حالك اليوم؟"),
    ("ar-SA-ZariyahNeural", "أنا بخير، شكراً لسؤالك."),
    ("ar-SA-HamedNeural", "هل أنهيت التقرير الذي ناقشناه أمس؟"),
    ("ar-SA-ZariyahNeural", "نعم، أنهيته هذا الصباح وأرسلته إليك."),
]


async def make(path, clips):
    buf = bytearray()
    for voice, text in clips:
        communicate = edge_tts.Communicate(text, voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.extend(chunk["data"])
    with open(path, "wb") as f:
        f.write(buf)
    print("wrote", path, len(buf), "bytes")


async def main():
    await make("test_two_speakers.mp3", EN)
    await make("test_arabic.mp3", AR)


asyncio.run(main())