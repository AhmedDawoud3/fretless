"""Route handlers. Pydantic and FastAPI stay inside this package."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from fretless.api.mappers import maqam_out, neck_out, scale_out, tuning_out
from fretless.api.schemas import Health, MaqamOut, NeckOut, ScaleOut, TuningOut
from fretless.maqam import MAQAMAT
from fretless.tuning import TUNINGS

DEFAULT_TUNING = "cc"

router = APIRouter()


def _find[T](table: dict[str, T], key: str, kind: str) -> T:
    if key not in table:
        raise HTTPException(status_code=404, detail=f"unknown {kind}: {key}")
    return table[key]


@router.get("/api/health")
def health() -> Health:
    return Health(status="ok")


@router.get("/api/tunings")
def tunings() -> list[TuningOut]:
    return [tuning_out(t) for t in TUNINGS.values()]


@router.get("/api/neck/{tuning_id}")
def neck(tuning_id: str) -> NeckOut:
    return neck_out(_find(TUNINGS, tuning_id, "tuning"))


@router.get("/api/maqamat")
def maqamat() -> list[MaqamOut]:
    return [maqam_out(m) for m in MAQAMAT.values()]


@router.get("/api/maqamat/{maqam_id}/scale")
def scale(
    maqam_id: str,
    root: Annotated[int | None, Query(ge=0, le=23)] = None,
    tuning: str = DEFAULT_TUNING,
) -> ScaleOut:
    maqam = _find(MAQAMAT, maqam_id, "maqam")
    return scale_out(
        maqam, maqam.default_root if root is None else root, _find(TUNINGS, tuning, "tuning")
    )
