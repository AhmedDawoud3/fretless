"""HTTP boundary: the only package that knows about FastAPI and Pydantic."""

from fastapi import FastAPI

from fretless.api.chord_routes import router as chord_router
from fretless.api.guitar_routes import router as guitar_router
from fretless.api.routes import router

app = FastAPI(title="Fretless")
app.include_router(router)
app.include_router(chord_router)
app.include_router(guitar_router)
