"""Shared route helpers."""

from fastapi import HTTPException

DEFAULT_TUNING = "cc"


def find[T](table: dict[str, T], key: str, kind: str) -> T:
    if key not in table:
        raise HTTPException(status_code=404, detail=f"unknown {kind}: {key}")
    return table[key]
