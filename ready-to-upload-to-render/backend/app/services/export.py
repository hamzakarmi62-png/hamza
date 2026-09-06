import io

from docx import Document
from docx.shared import Pt


def _format_clock(seconds: float) -> str:
    seconds = max(0, seconds)
    minutes = int(seconds // 60)
    sec = seconds - minutes * 60
    return f"{minutes:02d}:{sec:05.2f}"


def _format_srt_time(seconds: float) -> str:
    seconds = max(0, seconds)
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{int(secs):02d},{int((secs - int(secs)) * 1000):03d}"


def _speaker_name(seg, speakers) -> str:
    for s in speakers:
        if s["id"] == seg.get("speaker"):
            return s["name"]
    return "Speaker"


def _prefixed_text(seg, speakers, include_speakers, include_timestamps) -> str:
    parts = []
    if include_timestamps:
        parts.append(f"[{_format_clock(seg['start'])} - {_format_clock(seg['end'])}]")
    if include_speakers:
        parts.append(f"{_speaker_name(seg, speakers)}:")
    parts.append(seg["text"])
    return " ".join(parts)


def _flatten(segments) -> list[dict]:
    return [s for s in segments if s.get("text", "").strip()]


def export_txt(segments, speakers, include_speakers, include_timestamps) -> str:
    lines = [
        _prefixed_text(seg, speakers, include_speakers, include_timestamps)
        for seg in _flatten(segments)
    ]
    return "\n".join(lines)


def export_srt(segments, speakers, include_speakers) -> str:
    blocks = []
    for i, seg in enumerate(_flatten(segments), start=1):
        start = _format_srt_time(seg["start"])
        end = _format_srt_time(seg["end"])
        text = seg["text"]
        if include_speakers:
            text = f"[{_speaker_name(seg, speakers)}] {text}"
        blocks.append(f"{i}\n{start} --> {end}\n{text}")
    return "\n\n".join(blocks)


def export_docx(segments, speakers, include_speakers, include_timestamps) -> bytes:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)
    for seg in _flatten(segments):
        p = doc.add_paragraph(_prefixed_text(seg, speakers, include_speakers, include_timestamps))
        p.paragraph_format.space_after = Pt(4)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def export_pdf(segments, speakers, include_speakers, include_timestamps) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    from reportlab.lib.styles import ParagraphStyle

    font_paths = [
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\tahoma.ttf",
    ]
    from pathlib import Path

    font_name = "Helvetica"
    for fp in font_paths:
        if Path(fp).exists():
            try:
                pdfmetrics.registerFont(TTFont("AppFont", fp))
                font_name = "AppFont"
                break
            except Exception:
                continue

    body = ParagraphStyle(
        name="Body",
        fontName=font_name,
        fontSize=11,
        leading=15,
        wordWrap="CJK",
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm)
    story = []
    for seg in _flatten(segments):
        text = _prefixed_text(seg, speakers, include_speakers, include_timestamps)
        text = _shape_for_pdf(text)
        story.append(Paragraph(text.replace("&", "&amp;").replace("<", "&lt;"), body))
        story.append(Spacer(1, 4))
    doc.build(story)
    return buf.getvalue()


def _shape_for_pdf(text: str) -> str:
    has_arabic = any("\u0600" <= ch <= "\u06FF" for ch in text)
    if not has_arabic:
        return text
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display

        return get_display(arabic_reshaper.reshape(text))
    except Exception:
        return text