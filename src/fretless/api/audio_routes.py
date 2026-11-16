"""Audio-to-oud transcription route."""

import base64
import binascii

from fastapi import APIRouter, HTTPException

from fretless.api.audio_schemas import TranscribeIn
from fretless.api.lookup import find
from fretless.api.tab_mappers import arrangement_out, convert_placed_out
from fretless.api.tab_schemas import ConvertOut
from fretless.audio.arrange import build_audio_arrangements
from fretless.audio.decode import decode_audio_stereo
from fretless.tab.convert_model import Converted
from fretless.tuning import TUNINGS

router = APIRouter()


@router.post("/api/audio/transcribe")
def transcribe_audio(body: TranscribeIn) -> ConvertOut:
    tuning = find(TUNINGS, body.oud_tuning, "tuning")
    try:
        raw = base64.b64decode(body.audio_base64, validate=True)
        mono, stereo = decode_audio_stereo(raw)
    except (binascii.Error, ValueError) as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    arrangements, bpm = build_audio_arrangements(
        mono,
        stereo,
        tuning,
        body.onset_threshold,
        body.frame_threshold,
    )
    if not arrangements:
        return convert_placed_out(0, Converted((), (), 0), tuning, body.mode, tempo=bpm)
    winner = arrangements[0]
    mapped = [arrangement_out(item, tuning, body.mode) for item in arrangements]
    return convert_placed_out(
        winner.notes_in,
        winner.converted,
        tuning,
        body.mode,
        tempo=bpm,
        active_arrangement_id=winner.id,
        arrangements=mapped,
    )
