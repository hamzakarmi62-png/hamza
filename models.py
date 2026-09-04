from typing import Optional

from pydantic import BaseModel, Field


class Word(BaseModel):
    word: str
    start: float
    end: float


class Segment(BaseModel):
    id: str
    start: float
    end: float
    text: str
    speaker: Optional[str] = None
    words: list[Word] = Field(default_factory=list)


class Speaker(BaseModel):
    id: str
    name: str
    color: str


class TranscribeRequest(BaseModel):
    language: Optional[str] = None


class DiarizeRequest(BaseModel):
    num_speakers: int = Field(default=2, ge=1, le=6)


class SessionUpdate(BaseModel):
    segments: list[Segment]
    speakers: list[Speaker]
    settings: dict = Field(default_factory=dict)
    language: Optional[str] = None
    duration: Optional[float] = None