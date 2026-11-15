"""HTTP boundary: the only package that knows about FastAPI and Pydantic."""

from fastapi import FastAPI

from fretless.api.routes import router

app = FastAPI(title="Fretless")
app.include_router(router)
