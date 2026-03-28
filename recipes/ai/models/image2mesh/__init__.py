from __future__ import annotations

import os
import sys
import time
import base64
from io import BytesIO
from threading import Lock
import threading
import tempfile

import torch
from flask import request
from contextlib import contextmanager
import torchcompat.core as accelerator
from datetime import datetime

from assai.tools import namespaced_route, capture_progress_thread, cached, websocket_pusher
from assai.tools.input import Input, Message, Conversation, text as text_input
from PIL import Image


def routes(app: ASSAI, db):
    #
    # We need something to handle keeping models in VRAM/RAM
    # to reduce latency but also a way to move them if we need more VRAM/RAM
    #
    route = namespaced_route(app, '/image2mesh')
    default_model = "tencent/Hunyuan3D-2"

    @route("/model/download")
    @route("/model/download/<string:name>")
    def download_model_i2m(name=default_model):
        """Download a new model"""
        # Need to spawn a long term running process
        # to start the download and have a way to measure progress as well
        # and resume previous downloads

    @route("/model/delete/<string:name>")
    def delete_model_i2m(name):
        """Delete a local model"""

    @route("/model/list")
    def list_model_i2m():
        """List local models the user can choose from"""
        return [
            default_model,
            "tencent/Hunyuan3D-2mini",
            "tencent/Hunyuan3D-2mv",
        ]

    @route("/model/settings")
    @route("/model/settings/<string:name>")
    def model_settings_i2m(name=default_model):
        return {
            "guidance_scale": {
                "type": float,
                "min": 1.0,
                "max": 10.0,
                "default": 3.0
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
    def run_i2m(model=default_model):
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
        if content_input.get("kind") != "image":
            return {"error": "Image2Mesh expects image input"}, 400

        # Extract image from data URL
        image_data_url = content_input.get("data", "")
        if not image_data_url.startswith("data:image"):
            return {"error": "Invalid image data URL"}, 400

        # Convert data URL to PIL Image
        header, b64 = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(b64)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")

        pusher = websocket_pusher(app, action_id)

        @cached("i2m", name=model)
        def load():
            from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
            from hy3dgen.texgen import Hunyuan3DPaintPipeline

            with capture_progress_thread(pusher, action_id):
                pipe_1 = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
                    model,
                    torch_dtype=torch.bfloat16
                )
                pipe_2 = Hunyuan3DPaintPipeline.from_pretrained('tencent/Hunyuan3D-2')

                def pipe(*args, pipe_1_kwargs, **kwargs):
                    mesh = pipe_1(*args, **pipe_1_kwargs, **kwargs)[0]
                    # mesh = pipe_2(mesh, *args, **kwargs)
                    return mesh

                return pipe

        def seed():
            if seed := data.pop("seed", None):
                return seed
            return int(time.time() * 1000)

        generation_args = {
            "guidance_scale": 3.0,
            "num_inference_steps": 50,
            "generator": torch.Generator(accelerator.device_type).manual_seed(seed())
        }

        generation_args.update(data)

        pipe = load()

        with capture_progress_thread(pusher, action_id):
            # Generate mesh from image
            # Hunyuan3D-DiT accepts image parameter for image-to-3D generation
            mesh = pipe(image=image, pipe_1_kwargs=generation_args)

        # Convert mesh to GLTF format
        with tempfile.NamedTemporaryFile(suffix='.glb', delete=False) as tmp_file:
            temp_glb_path = tmp_file.name

        try:
            # Export mesh to GLB (binary GLTF)
            mesh.export(temp_glb_path, file_type='glb')

            # Read the GLB file and convert to base64
            with open(temp_glb_path, "rb") as fp:
                glb_data = fp.read()

            # Encode to base64
            glb_base64 = base64.b64encode(glb_data).decode('ascii')
            # Use application/octet-stream for GLB files (browsers handle this better)
            glb_data_url = f"data:application/octet-stream;base64,{glb_base64}"

        finally:
            # Clean up temporary file
            if os.path.exists(temp_glb_path):
                try:
                    os.remove(temp_glb_path)
                except:
                    pass

        # Return Message format with mesh content
        response_input: Input = {
            "kind": "mesh",
            "encoding": "data_url",
            "data": glb_data_url
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

