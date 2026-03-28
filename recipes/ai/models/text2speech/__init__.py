from __future__ import annotations

import os
import sys
import time
import base64
from io import BytesIO
from threading import Lock
import threading

import torch
import numpy as np
from flask import request
from contextlib import contextmanager
import torchcompat.core as accelerator
from transformers import pipeline

from assai.tools import namespaced_route, capture_progress_thread, cached, websocket_pusher
from assai.tools.input import Input, Message, Conversation
from datetime import datetime
import time


def audio_to_base64_wav(audio_array, sample_rate=22050):
    """Convert audio numpy array to base64 WAV data URI"""
    import wave
    buffer = BytesIO()

    # Normalize audio to 16-bit PCM
    audio_int16 = (audio_array * 32767).astype(np.int16)

    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_int16.tobytes())

    buffer.seek(0)
    audio_base64 = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:audio/wav;base64,{audio_base64}"


def routes(app: ASSAI, db):
    #
    # We need something to handle keeping models in VRAM/RAM
    # to reduce latency but also a way to move them if we need more VRAM/RAM
    #
    route = namespaced_route(app, '/text2speech')
    default_model = "microsoft/speecht5_tts"

    @route("/model/download")
    @route("/model/download/<string:name>")
    def download_model_t2s(name=default_model):
        """Download a new model"""
        # Need to spawn a long term running process
        # to start the download and have a way to measure progress as well
        # and resume previous downloads

    @route("/model/delete/<string:name>")
    def delete_model_t2s(name):
        """Delete a local model"""

    @route("/model/list")
    def list_model_t2s():
        """List local models the user can choose from"""
        return [
            default_model,
        ]

    @route("/model/settings")
    @route("/model/settings/<string:name>")
    def model_settings_t2s(name=default_model):
        return {
            "speed": {
                "type": float,
                "min": 0.5,
                "max": 2.0,
                "default": 1.0
            },
            "pitch": {
                "type": float,
                "min": -12.0,
                "max": 12.0,
                "default": 0.0
            },
            "sample_rate": {
                "type": int,
                "min": 8000,
                "max": 48000,
                "default": 22050
            },
        }

    @route("/model/run", methods=['POST'])
    @route("/model/run/<string:model>", methods=['POST'])
    def run_t2s(model=default_model):
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
        if content_input.get("kind") != "text":
            return {"error": "Text2Speech expects text input"}, 400

        prompt = content_input.get("data", "")

        pusher = websocket_pusher(app, action_id)

        @cached("t2s")
        def load():
            with capture_progress_thread(pusher, action_id):
                print(f"[T2S] Loading TTS model: {model}", flush=True)
                sys.stdout.flush()
                # Use transformers pipeline for TTS
                device = 0 if accelerator.device_type == "cuda" else -1
                print(f"[T2S] Using device: {device}", flush=True)
                sys.stdout.flush()

                pipe = pipeline(
                    "text-to-speech",
                    model=model,
                    device=device
                )
                print("[T2S] Model loaded successfully", flush=True)
                sys.stdout.flush()
                return pipe

        generation_args = {
            # "speed": 1.0,
            # "pitch": 0.0,
            "sample_rate": 22050,
        }

        # generation_args.update({k: v for k, v in data.items() if k in generation_args})

        pipe = load()

        with capture_progress_thread(pusher, action_id):
            print(f"[T2S] Starting speech generation for prompt: {prompt[:50]}...", flush=True)
            print(f"[T2S] Action ID: {action_id}", flush=True)
            sys.stdout.flush()

            print("[T2S] Fetching speaker embeddings...", flush=True)
            sys.stdout.flush()
            from .dataset import fetch

            vector = fetch()
            speaker_embeddings = torch.tensor(vector).unsqueeze(0)

            print("[T2S] Generating speech...", flush=True)
            sys.stdout.flush()
            output = pipe(prompt, forward_params={"speaker_embeddings": speaker_embeddings})

            print("[T2S] Speech generation complete", flush=True)
            sys.stdout.flush()

            # Handle different output formats
            if isinstance(output, dict):
                audio_array = output.get("audio", output.get("generated_audio"))
                sample_rate = output.get("sampling_rate", output.get("sample_rate", generation_args["sample_rate"]))
            elif isinstance(output, np.ndarray):
                audio_array = output
                sample_rate = generation_args["sample_rate"]
            elif isinstance(output, (tuple, list)):
                # Try to extract audio from tuple/list
                audio_array = output[0] if len(output) > 0 else output
                sample_rate = output[1] if len(output) > 1 else generation_args["sample_rate"]
            else:
                audio_array = output
                sample_rate = generation_args["sample_rate"]

            # Ensure audio is numpy array
            if isinstance(audio_array, torch.Tensor):
                audio_array = audio_array.cpu().numpy()

            # Handle stereo audio (take first channel if needed)
            if len(audio_array.shape) > 1:
                # If shape is (channels, samples), transpose; if (samples, channels), take first channel
                if audio_array.shape[0] < audio_array.shape[1]:
                    audio_array = audio_array[0]
                else:
                    audio_array = audio_array[:, 0] if audio_array.shape[1] > 1 else audio_array.flatten()

            # Normalize audio to [-1, 1] range
            if audio_array.dtype != np.float32:
                audio_array = audio_array.astype(np.float32)

            # Normalize if values are outside [-1, 1]
            max_val = np.max(np.abs(audio_array))
            if max_val > 1.0:
                audio_array = audio_array / max_val

        # Convert audio to Input format
        audio_data_url = audio_to_base64_wav(audio_array, sample_rate)

        response_input: Input = {
            "kind": "audio",
            "encoding": "data_url",
            "data": audio_data_url
        }

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
