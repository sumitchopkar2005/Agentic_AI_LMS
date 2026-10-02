"""Sarvam AI STT / TTS service.

Wraps the Sarvam REST API for speech-to-text (saaras:v3) and
text-to-speech (bulbul:v3).
"""

import base64
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.sarvam.ai"


def _headers() -> dict[str, str]:
    return {"api-subscription-key": settings.sarvam_api_key}


async def speech_to_text(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    language: str = "en-IN",
) -> str:
    """Transcribe audio bytes via Sarvam STT.

    Returns the transcript string.
    """
    # Infer codec from filename extension
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webm"
    codec_map = {
        "webm": "webm",
        "wav": "wav",
        "mp3": "mp3",
        "ogg": "ogg",
        "m4a": "mp4",
        "mp4": "mp4",
        "flac": "flac",
    }
    codec = codec_map.get(ext, "webm")
    mime_map = {
        "webm": "audio/webm",
        "wav": "audio/wav",
        "mp3": "audio/mpeg",
        "ogg": "audio/ogg",
        "mp4": "audio/mp4",
        "flac": "audio/flac",
    }
    mime = mime_map.get(codec, "audio/webm")

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{_BASE_URL}/speech-to-text",
            headers=_headers(),
            files={"file": (filename, audio_bytes, mime)},
            data={
                "model": settings.sarvam_stt_model,
                "language_code": language,
                "mode": "transcribe",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        transcript = data.get("transcript", "")
        logger.info("STT: %d bytes -> %d chars", len(audio_bytes), len(transcript))
        return transcript


async def text_to_speech(
    text: str,
    language: str | None = None,
    speaker: str | None = None,
) -> bytes:
    """Convert text to speech via Sarvam TTS.

    Returns raw WAV audio bytes.
    """
    lang = language or settings.sarvam_tts_language
    spk = speaker or settings.sarvam_tts_speaker

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{_BASE_URL}/text-to-speech",
            headers={**_headers(), "Content-Type": "application/json"},
            json={
                "text": text[:2500],  # v3 max
                "target_language_code": lang,
                "model": settings.sarvam_tts_model,
                "speaker": spk,
                "pace": 1.0,
                "speech_sample_rate": 24000,
                "output_audio_codec": "wav",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        audio_b64 = data["audios"][0]
        audio_bytes = base64.b64decode(audio_b64)
        logger.info("TTS: %d chars -> %d bytes audio", len(text), len(audio_bytes))
        return audio_bytes
