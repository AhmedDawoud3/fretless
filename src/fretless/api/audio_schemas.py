"""Pydantic request schema for audio transcription."""

from typing import Annotated

from pydantic import BaseModel, Field

from fretless.tab.oud_render import Mode


class TranscribeIn(BaseModel):
    audio_base64: Annotated[str, Field(min_length=1, max_length=20_000_000)]
    oud_tuning: str = "cc"
    mode: Mode = "frets"
    onset_threshold: Annotated[float, Field(ge=0.05, le=0.95)] = 0.5
    frame_threshold: Annotated[float, Field(ge=0.05, le=0.95)] = 0.3
