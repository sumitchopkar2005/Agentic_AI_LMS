"""Voice endpoints — STT and TTS via Sarvam AI."""

import logging

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.sarvam import speech_to_text, text_to_speech

logger = logging.getLogger(__name__)

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    language: str = "en-IN"
    speaker: str = ""


@router.post("/voice/stt")
async def stt_endpoint(
    file: UploadFile = File(...),
    language: str = Form("en-IN"),
) -> dict:
    """Transcribe uploaded audio via Sarvam STT."""
    audio_bytes = await file.read()
    transcript = await speech_to_text(
        audio_bytes,
        filename=file.filename or "audio.webm",
        language=language,
    )
    return {"transcript": transcript}


@router.post("/voice/tts")
async def tts_endpoint(body: TTSRequest) -> Response:
    """Convert text to speech via Sarvam TTS. Returns WAV audio."""
    audio_bytes = await text_to_speech(
        body.text,
        language=body.language,
        speaker=body.speaker or None,
    )
    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": "inline; filename=response.wav"},
    )
