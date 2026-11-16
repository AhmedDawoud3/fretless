"""Interval routes."""

from dataclasses import asdict

from fastapi import APIRouter

from fretless.api.interval_schemas import IntervalOut
from fretless.interval import INTERVALS

router = APIRouter()


@router.get("/api/intervals")
def intervals() -> list[IntervalOut]:
    return [IntervalOut(**asdict(i)) for i in INTERVALS.values()]
