"""HTTP boundary: the only package that knows about FastAPI and Pydantic."""

from fastapi import FastAPI

from fretless.api.chord_routes import router as chord_router
from fretless.api.guitar_routes import router as guitar_router
from fretless.api.interval_routes import router as interval_router
from fretless.api.routes import router
from fretless.api.tab_routes import router as tab_router

app = FastAPI(title="Fretless")
app.include_router(router)
app.include_router(chord_router)
app.include_router(guitar_router)
app.include_router(tab_router)
app.include_router(interval_router)
