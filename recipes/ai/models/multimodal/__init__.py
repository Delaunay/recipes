from __future__ import annotations

import os
import sys
import time
import base64
from io import BytesIO
from threading import Lock
import threading
from typing import List, Dict, Any

import torch
from flask import request
from contextlib import contextmanager
import torchcompat.core as accelerator

from assai.tools import namespaced_route, capture_progress_thread, cached, websocket_pusher
from assai.tools.input import Input, Message, Conversation, text as text_input

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from assai.server.run import ASSAI


def routes(app: 'ASSAI', db):
    """
    Multimodal chat model that can handle text, images, audio, and video inputs.
    Follows the Input/Message/Conversation format from assai.tools.input
    """
    route = namespaced_route(app, '/multimodal')
    default_model = "microsoft/DialoGPT-medium"  # Default model, can be extended for multimodal

    @route("/model/download")
    @route("/model/download/<string:name>")
    def download_model_multimodal(name=default_model):
        """Download a new model"""
        print(f"[Multimodal] Downloading model: {name}", flush=True)
        sys.stdout.flush()
        # TODO: Implement actual download logic
        time.sleep(2)
        print(f"[Multimodal] Model {name} downloaded.", flush=True)
        sys.stdout.flush()
        return {"status": "downloaded", "model": name}

    @route("/model/delete/<string:name>")
    def delete_model_multimodal(name):
        """Delete a local model"""
        print(f"[Multimodal] Deleting model: {name}", flush=True)
        sys.stdout.flush()
        # TODO: Implement actual deletion logic
        time.sleep(1)
        print(f"[Multimodal] Model {name} deleted.", flush=True)
        sys.stdout.flush()
        return {"status": "deleted", "model": name}

    @route("/model/list")
    def list_model_multimodal():
        """List local models the user can choose from"""
        return [
            default_model,
            "gpt2",
            "distilgpt2",
        ]

    @route("/model/settings")
    @route("/model/settings/<string:name>")
    def model_settings_multimodal(name=default_model):
        return {
            "max_new_tokens": {
                "type": int,
                "min": 10,
                "max": 500,
                "default": 100
            },
            "temperature": {
                "type": float,
                "min": 0.1,
                "max": 2.0,
                "default": 0.7
            },
        }

    @route("/chat", methods=['POST'])
    def chat():
        """
        Handle multimodal chat conversation.
        Accepts Conversation format with messages containing Input objects.
        """
        data = request.get_json()
        conversation = data.get("conversation", {})
        session_id = data.pop("session_id", None)
        action_id = data.pop("action_id", 0)

        pusher = websocket_pusher(app, action_id)

        # Extract messages from conversation
        messages = conversation.get("messages", [])
        if not messages:
            return {"error": "No messages in conversation"}, 400

        # Get the last user message
        last_message = messages[-1]
        if last_message.get("role") != "user":
            return {"error": "Last message must be from user"}, 400

        # Extract content (Input object)
        content_input = last_message.get("content", {})
        input_kind = content_input.get("kind", "text")
        input_data = content_input.get("data", "")

        with capture_progress_thread(pusher, action_id):
            print(f"[Multimodal] Processing {input_kind} input", flush=True)
            sys.stdout.flush()

            # Handle different input types
            if input_kind == "text":
                # For now, use text2text logic
                # TODO: Integrate with actual multimodal model
                response_text = f"Received text: {input_data[:50]}..."
                response_input = text_input(response_text)
            elif input_kind == "image":
                # TODO: Process image with vision model
                response_text = "I received an image. Image processing not yet implemented."
                response_input = text_input(response_text)
            elif input_kind == "audio":
                # TODO: Process audio with audio model
                response_text = "I received audio. Audio processing not yet implemented."
                response_input = text_input(response_text)
            elif input_kind == "video":
                # TODO: Process video with video model
                response_text = "I received video. Video processing not yet implemented."
                response_input = text_input(response_text)
            else:
                response_text = f"Unknown input kind: {input_kind}"
                response_input = text_input(response_text)

            print("[Multimodal] Processing complete", flush=True)
            sys.stdout.flush()

        # Return response in Message format
        response_message: Message = {
            "role": "assistant",
            "content": response_input
        }

        return {
            "message": response_message,
            "conversation_id": session_id or f"conv_{int(time.time() * 1000)}"
        }

    @route("/model/run", methods=['POST'])
    @route("/model/run/<string:model>", methods=['POST'])
    def run_multimodal(model=default_model):
        """
        Execute the multimodal model from the provided input.
        This is a compatibility endpoint that accepts the same format as other models.
        """
        data = request.get_json()
        prompt = data.pop("prompt", "")
        session_id = data.pop("session_id", None)
        action_id = data.pop("action_id", 0)
        conversation_history = data.pop("conversation_history", [])

        pusher = websocket_pusher(app, action_id)

        @cached("multimodal")
        def load():
            with capture_progress_thread(pusher, action_id):
                print(f"[Multimodal] Loading model: {model}", flush=True)
                sys.stdout.flush()
                device = 0 if accelerator.device_type == "cuda" else -1
                print(f"[Multimodal] Using device: {device}", flush=True)
                sys.stdout.flush()
                # TODO: Load actual multimodal model
                # For now, return placeholder
                print("[Multimodal] Model loaded successfully", flush=True)
                sys.stdout.flush()
                return None

        pipe = load()

        with capture_progress_thread(pusher, action_id):
            print(f"[Multimodal] Processing prompt: {prompt[:50]}...", flush=True)
            sys.stdout.flush()

            # TODO: Process with actual multimodal model
            # For now, return placeholder response
            response_text = f"Multimodal processing for: {prompt}"

            print("[Multimodal] Processing complete", flush=True)
            sys.stdout.flush()

        return {"text": response_text}


if __name__ == "__main__":
    routes(None)

