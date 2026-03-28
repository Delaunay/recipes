from dataclasses import dataclass
from io import BytesIO
import base64
from datetime import datetime
from typing import Optional


@dataclass
class Input:
    kind: str
    encoding: str
    data: str


@dataclass
class Message:
    id: int
    action_id: Optional[int]
    role: str
    content: Input
    timestamp: datetime


@dataclass
class Conversation:
    messages: list[Message]


def text(text) -> Input:
    return {
        "kind": "text",
        "encoding": "utf8",
        "data": text
    }


def image_b64(img) -> Input:
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("ascii")
    return {
        "kind": "image",
        "encoding": "data_url",
        "data": f"data:image/png;base64,{b64}"
    }


def audio_b64(audio) -> Input:
    buffer = BytesIO()
    # TODO: Save audio to buffer in appropriate format
    # For now, placeholder
    b64 = base64.b64encode(buffer.getvalue()).decode("ascii")
    return {
        "kind": "audio",
        "encoding": "data_url",
        "data": f"data:audio/mp3;base64,{b64}"
    }

def video_b64(video) -> Input:
    buffer = BytesIO()
    # TODO: Save video to buffer in appropriate format
    # For now, placeholder
    b64 = base64.b64encode(buffer.getvalue()).decode("ascii")
    return {
        "kind": "video",
        "encoding": "data_url",
        "data": f"data:video/mp4;base64,{b64}"
    }