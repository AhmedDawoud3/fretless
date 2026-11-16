"""Pydantic response model for intervals."""

from pydantic import BaseModel


class IntervalOut(BaseModel):
    steps: int
    id: str
    name: str
    short: str
    frets: str
    quarter_tone: bool
    level: int
