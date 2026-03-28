from __future__ import annotations

import os
import sys
import time
import base64
from io import BytesIO
from threading import Lock
import threading

import torch
from flask import request
from contextlib import contextmanager
import torchcompat.core as accelerator
from diffusers import DiffusionPipeline
from datetime import datetime

from assai.tools import namespaced_route, capture_progress_thread, cached, websocket_pusher
from assai.tools.input import Input, Message, Conversation, text as text_input

import assai.models.text2video.hunyuan as hunyuan
import assai.models.text2video.wan2 as wan2

# pip install "huggingface_hub[cli]"

# python generate.py  --task t2v-A14B --size 1280*720 --ckpt_dir ./Wan2.2-T2V-A14B --offload_model True --convert_model_dtype --prompt "Two anthropomorphic cats in comfy boxing gear and bright gloves fight intensely on a spotlighted stage."


#  --no-build-isolation --no-deps -v --force-reinstall




def routes(app: ASSAI, db):
    #
    # We need something to handle keeping models in VRAM/RAM
    # to reduce latency but also a way to move them if we need more VRAM/RAM
    #
    route = namespaced_route(app, '/text2video')
    default_model = "tencent/HunyuanVideo-1.5"

    @route("/model/download")
    @route("/model/download/<string:name>")
    def download_model_t2v(name=default_model):
        """Download a new model"""
        # Need to spawn a long term running process
        # to start the download and have a way to measure progress as well
        # and resume previous downloads

        # huggingface-cli download Wan-AI/Wan2.2-T2V-A14B

    @route("/model/delete/<string:name>")
    def delete_model_t2v(name):
        """Delete a local model"""

    @route("/model/list")
    def list_model_t2v():
        """List local models the user can choose from"""
        return [
            default_model,
            "Wan-AI/Wan2.2-T2V-A14B-Diffusers"
        ]

    @route("/model/settings")
    @route("/model/settings/<string:name>")
    def model_settings_t2v(name=default_model):
        return {
            "height": {
                "type": int,
                "min": 32,
                "max": None,
                "default": 512
            },
            "width": {
                "type": int,
                "min": 32,
                "max": None,
                "default": 512
            },
            "num_frames": {
                "type": int,
                "min": 1,
                "max": None,
                "default": 49
            },
            "num_inference_steps": {
                "type": int,
                "min": 1,
                "max": None,
                "default": 50
            },
            "generator": {
                "type": int,
                "min": None,
                "max": None,
                "default": 256
            }
        }

    @route("/model/run", methods=['POST'])
    @route("/model/run/<string:model>", methods=['POST'])
    def run_t2v(model=default_model):
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
            return {"error": "Text2Video expects text input"}, 400

        prompt = content_input.get("data", "")

        pusher = websocket_pusher(app, action_id)

        @cached("t2v", name=model)
        def load():
            with capture_progress_thread(pusher, action_id):
                return wan2.load()
                # return hunyuan.load()

        def seed():
            if seed := data.pop("seed", None):
                return seed
            return int(time.time() * 1000)

        generation_args = {
            "height": 512,
            "width": 512,
            "num_frames": 49,
            "num_inference_steps": 50,
            "generator": torch.Generator(accelerator.device_type).manual_seed(seed())
        }

        generation_args.update(data)

        pipe = load()

        with capture_progress_thread(pusher, action_id):
            from diffusers import attention_backend

            # with attention_backend("flash_hub"):
            output = pipe(prompt, **generation_args)


        video = output.frames[0]

        # Export video frames to MP4 file
        from diffusers.utils import export_to_video
        import tempfile

        # Use a temporary file to avoid conflicts
        with tempfile.NamedTemporaryFile(suffix='.mp4') as tmp_file:
            temp_video_path = tmp_file.name
            # temp_video_path = "/home/delaunao/workspace/assai/assai/data/video.mp4"

            export_to_video(video, temp_video_path, fps=24)

            # Read the video file and convert to base64
            with open(temp_video_path, "rb") as fp:
                video_data = fp.read()

        # Encode to base64
        video_base64 = base64.b64encode(video_data).decode('ascii')
        video_data_url = f"data:video/mp4;base64,{video_base64}"

        # Return Message format with video content
        response_input: Input = {
            "kind": "video",
            "encoding": "data_url",
            "data": video_data_url
        }

        response_message: Message = {
            "id": int(time.time() * 1000),
            "action_id": action_id,
            "role": "assistant",
            "content": response_input,
            "timestamp": datetime.now().isoformat()
        }

        return {
            "message": response_message
        }


if __name__ == "__main__":
    routes(None)

