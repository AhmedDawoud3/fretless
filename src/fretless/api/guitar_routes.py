"""Guitar routes."""

from fastapi import APIRouter

from fretless.api.guitar_mappers import guitar_tuning_out, identify_out
from fretless.api.guitar_schemas import GuitarTuningOut, IdentifyIn, IdentifyOut
from fretless.guitar import GUITAR_TUNINGS

router = APIRouter()


@router.get("/api/guitar/tunings")
def guitar_tunings() -> list[GuitarTuningOut]:
    return [guitar_tuning_out(t) for t in GUITAR_TUNINGS.values()]


@router.post("/api/guitar/identify")
def identify_shape(shape: IdentifyIn) -> IdentifyOut:
    return identify_out(tuple(shape.strings), shape.capo, tuple(shape.frets))
