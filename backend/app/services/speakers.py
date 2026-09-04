PALETTE = [
    "#2563eb",
    "#059669",
    "#dc2626",
    "#d97706",
    "#7c3aed",
    "#0d9488",
    "#db2777",
    "#65a30d",
]


def finalize_speakers(segments: list[dict]) -> tuple[list[dict], list[dict]]:
    order: list[str] = []
    for seg in segments:
        name = seg.get("speaker") or "Speaker 1"
        if name not in order:
            order.append(name)
    speakers = [
        {"id": f"s{i + 1}", "name": name, "color": PALETTE[i % len(PALETTE)]}
        for i, name in enumerate(order)
    ]
    by_name = {s["name"]: s["id"] for s in speakers}
    for seg in segments:
        name = seg.get("speaker") or "Speaker 1"
        seg["speaker"] = by_name.get(name, speakers[0]["id"])
    return segments, speakers


def assign_single_speaker(segments: list[dict]) -> tuple[list[dict], list[dict]]:
    for seg in segments:
        seg["speaker"] = "Speaker 1"
    return finalize_speakers(segments)