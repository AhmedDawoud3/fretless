"""HTTP boundary: the only module that knows about FastAPI and Pydantic."""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Fretless")


class Health(BaseModel):
    status: str


@app.get("/api/health")
def health() -> Health:
    return Health(status="ok")
