"""Chord routes."""

from typing import Annotated

from fastapi import APIRouter, Path
from pydantic import AfterValidator

from fretless.api.chord_mappers import chord_out, quality_out
from fretless.api.chord_schemas import ChordOut, QualityOut
from fretless.api.lookup import DEFAULT_TUNING, find
from fretless.chord import QUALITIES, Chord
from fretless.tuning import TUNINGS

router = APIRouter()


def _even(root: int) -> int:
    if root % 2:
        raise ValueError("root must be an even pitch class (chords are 12-tone)")
    return root


Root = Annotated[int, Path(ge=0, le=23), AfterValidator(_even)]


@router.get("/api/chords/qualities")
def qualities() -> list[QualityOut]:
    return [quality_out(q) for q in QUALITIES.values()]


@router.get("/api/chords/{root}/{quality_id}")
def chord(root: Root, quality_id: str, tuning: str = DEFAULT_TUNING) -> ChordOut:
    quality = find(QUALITIES, quality_id, "chord quality")
    return chord_out(Chord(root, quality), find(TUNINGS, tuning, "tuning"))
