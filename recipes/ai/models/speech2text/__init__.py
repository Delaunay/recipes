from __future__ import annotations

import os
import sys
import base64
import numpy as np
import io
import wave
from threading import Lock
import threading

import torch
from flask import request
from contextlib import contextmanager
import torchcompat.core as accelerator
from transformers import pipeline
import torchaudio

from assai.tools import namespaced_route, capture_progress_thread, cached, websocket_pusher
from assai.tools.input import Input, Message, Conversation, text as text_input
from datetime import datetime
import time


def audio_from_url(data_url, sample_rate=16000):
    mono = True

    header, b64 = data_url.split(",", 1)
    audio_bytes = base64.b64decode(b64)
    bio = io.BytesIO(audio_bytes)

    bio.seek(0)
    waveform, sr = torchaudio.load(bio, format=None)

    if mono and waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)

    if sample_rate is not None and sr != sample_rate:
        # resample
        resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=sample_rate)
        waveform = resampler(waveform)
        sr = sample_rate

    return waveform, sr


def routes(app: ASSAI, db):
    #
    # We need something to handle keeping models in VRAM/RAM
    # to reduce latency but also a way to move them if we need more VRAM/RAM
    #
    route = namespaced_route(app, '/speech2text')
    default_model = "openai/whisper-large-v3"  # Default ASR model

    @route("/model/download")
    @route("/model/download/<string:name>")
    def download_model_s2t(name=default_model):
        """Download a new model"""
        # Need to spawn a long term running process
        # to start the download and have a way to measure progress as well
        # and resume previous downloads

    @route("/model/delete/<string:name>")
    def delete_model_s2t(name):
        """Delete a local model"""

    @route("/model/list")
    def list_model_s2t():
        """List local models the user can choose from"""
        return [
            default_model,
            "openai/whisper-tiny",
            "openai/whisper-small",
            "openai/whisper-medium",
            "openai/whisper-large-v3",
        ]

    @route("/model/settings")
    @route("/model/settings/<string:name>")
    def model_settings_s2t(name=default_model):
        return {
            "language": {
                "type": str,
                "default": "en"  # None = auto-detect
            },
            "task": {
                "type": str,
                "default": "transcribe"  # "transcribe" or "translate"
            },
        }

    @route("/model/run", methods=['POST'])
    @route("/model/run/<string:model>", methods=['POST'])
    def run_s2t(model=default_model):
        """Execute the model from the provided input using Message format"""

        data = request.get_json()
        message = data.pop("message", {})
        session_id = data.pop("session_id", None)
        action_id = data.pop("action_id", 0)

        # Validate message
        if not message:
            return {"error": "No message provided"}, 400

        if message.get("role") != "user":
            return {"error": "Message must be from user"}, 400

        content_input = message.get("content", {})
        if content_input.get("kind") != "audio":
            return {"error": "Speech2Text expects audio input"}, 400

        audio_data_uri = content_input.get("data", "")

        pusher = websocket_pusher(app, action_id)

        @cached("s2t")
        def load():
            with capture_progress_thread(pusher, action_id):
                device = 0 if accelerator.device_type == "cuda" else -1

                pipe = pipeline(
                    "automatic-speech-recognition",
                    model=model,
                    device_map=device,
                    dtype=torch.bfloat16
                )
                return pipe

        generation_args = {
            "language": "en",  # Auto-detect
            "task": "transcribe",
        }

        # Update with any provided parameters
        generation_args.update({k: v for k, v in data.items() if k in generation_args})

        pipe = load()

        with capture_progress_thread(pusher, action_id):
            print(f"[S2T] Starting speech recognition", flush=True)
            print(f"[S2T] Action ID: {action_id}", flush=True)
            sys.stdout.flush()

            # Convert audio data URI to numpy array
            print("[S2T] Converting audio data...", flush=True)
            sys.stdout.flush()
            audio_array, sample_rate = audio_from_url(audio_data_uri)
            print(f"[S2T] Audio shape: {audio_array.shape}, sample rate: {sample_rate}", flush=True)
            sys.stdout.flush()

            print("[S2T] Transcribing audio...", flush=True)
            sys.stdout.flush()

            # Transcribe audio
            result = pipe(
                audio_array,
                **{k: v for k, v in generation_args.items() if v is not None}
            )

            print("[S2T] Transcription complete", flush=True)
            sys.stdout.flush()

            # Extract text from result
            if isinstance(result, dict):
                text = result.get("text", "")
            elif isinstance(result, str):
                text = result
            else:
                text = str(result)

            # Return Message format
            response_input: Input = text_input(text)

            response_message: Message = {
                "id": int(time.time() * 1000),
                "action_id": action_id,
                "role": "assistant",
                "content": response_input,
                "timestamp": datetime.now().isoformat()
            }

            return {"message": response_message}

if __name__ == "__main__":
    routes(None)
