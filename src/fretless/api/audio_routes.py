"""Audio-to-oud transcription route."""

import base64
import binascii

from fastapi import APIRouter, HTTPException

from fretless.api.audio_schemas import TranscribeIn
from fretless.api.lookup import find
from fretless.api.tab_mappers import convert_placed_out
from fretless.api.tab_schemas import ConvertOut
from fretless.audio.arrange import arrange_notes
from fretless.audio.decode import decode_audio
from fretless.audio.inference import run_basic_pitch
from fretless.audio.notes import extract_notes
from fretless.tuning import TUNINGS

router = APIRouter()


@router.post("/api/audio/transcribe")
def transcribe_audio(body: TranscribeIn) -> ConvertOut:
    tuning = find(TUNINGS, body.oud_tuning, "tuning")
    try:
        raw = base64.b64decode(body.audio_base64, validate=True)
        samples = decode_audio(raw)
    except (binascii.Error, ValueError) as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    frames, onsets, contours = run_basic_pitch(samples)
    notes = extract_notes(
        frames,
        onsets,
        contours,
        onset_threshold=body.onset_threshold,
        frame_threshold=body.frame_threshold,
    )
    notes_in, converted = arrange_notes(notes, tuning)
    return convert_placed_out(notes_in, converted, tuning, body.mode)
