from __future__ import annotations

import os
import sys
import time
import base64
from io import BytesIO
from threading import Lock
import threading
import tempfile
import numpy as np

import torch
from flask import request
from contextlib import contextmanager
import torchcompat.core as accelerator
from datetime import datetime

from assai.tools import namespaced_route, capture_progress_thread, pil_to_base64_png, cached, websocket_pusher
from assai.tools.input import Input, Message, Conversation, text as text_input
from PIL import Image

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from assai.server.run import ASSAI


def routes(app: 'ASSAI', db):
    #
    # We need something to handle keeping models in VRAM/RAM
    # to reduce latency but also a way to move them if we need more VRAM/RAM
    #
    route = namespaced_route(app, '/depth_estimation')
    default_model = "depth-anything/DA3NESTED-GIANT-LARGE-1.1"

    @route("/model/download")
    @route("/model/download/<string:name>")
    def download_model_de(name=default_model):
        """Download a new model"""
        # Need to spawn a long term running process
        # to start the download and have a way to measure progress as well
        # and resume previous downloads

    @route("/model/delete/<string:name>")
    def delete_model_de(name):
        """Delete a local model"""

    @route("/model/list")
    def list_model_de():
        """List local models the user can choose from"""
        return [
            default_model,
            "depth-anything/da3nested-giant-large",
            "depth-anything/da3nested-base",
            "depth-anything/da3nested-small",
        ]

    @route("/model/settings")
    @route("/model/settings/<string:name>")
    def model_settings_de(name=default_model):
        return {
            "colormap": {
                "type": str,
                "default": "jet",
                "options": ["jet", "viridis", "plasma", "inferno", "magma", "turbo"]
            }
        }

    @route("/model/run", methods=['POST'])
    @route("/model/run/<string:model>", methods=['POST'])
    def run_de(model=default_model):
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
            return {"error": "DepthEstimation expects image input"}, 400

        # Extract image from data URL
        image_data_url = content_input.get("data", "")
        if not image_data_url.startswith("data:image"):
            return {"error": "Invalid image data URL"}, 400

        # Convert data URL to PIL Image
        header, b64 = image_data_url.split(",", 1)
        image_bytes = base64.b64decode(b64)
        input_image = Image.open(BytesIO(image_bytes)).convert("RGB")

        pusher = websocket_pusher(app, action_id)

        @cached("depth", name=model)
        def load():
            from depth_anything_3.api import DepthAnything3

            with capture_progress_thread(pusher, action_id):
                device = torch.device(accelerator.device_type if accelerator.device_type == "cuda" else "cpu")
                model_instance = DepthAnything3.from_pretrained(model)
                model_instance = model_instance.to(device=device)
                return model_instance.inference

        # Get colormap from data or use default
        colormap_name = data.pop("colormap", "jet")

        model_instance = load()

        with capture_progress_thread(pusher, action_id):
            # Run inference on the image
            # Use a temporary directory for export (even though we won't use the files)
            with tempfile.TemporaryDirectory() as tmpdir:
                prediction = model_instance(
                    [input_image],
                    export_dir=tmpdir,
                    export_format="npz"  # Use npz format but we'll use the prediction object directly
                )

                # Get depth map (shape: [N, H, W])
                depth_map = prediction.depth[0]  # Get first image's depth map
                depth_array = depth_map.cpu().numpy() if isinstance(depth_map, torch.Tensor) else depth_map

                # Normalize depth map to 0-255 range
                depth_min = depth_array.min()
                depth_max = depth_array.max()
                if depth_max > depth_min:
                    depth_normalized = ((depth_array - depth_min) / (depth_max - depth_min) * 255).astype(np.uint8)
                else:
                    depth_normalized = np.zeros_like(depth_array, dtype=np.uint8)

                # Apply colormap to depth map
                depth_colored = apply_colormap(depth_normalized, colormap_name)

                # Convert to PIL Image
                depth_image = Image.fromarray(depth_colored)

        # Convert depth image to base64 data URL
        depth_data_url = f"data:image/png;base64,{pil_to_base64_png(depth_image)}"

        # Return Message format with depth image
        response_input: Input = {
            "kind": "image",
            "encoding": "data_url",
            "data": depth_data_url
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


def apply_colormap(depth_map: np.ndarray, colormap_name: str = "jet") -> np.ndarray:
    """
    Apply a colormap to a depth map.

    Args:
        depth_map: Grayscale depth map (H, W) with values 0-255
        colormap_name: Name of the colormap to apply

    Returns:
        Colored depth map as RGB image (H, W, 3)
    """
    try:
        import matplotlib.pyplot as plt
        import matplotlib.cm as cm
    except ImportError:
        # Fallback: use simple colormap if matplotlib not available
        return np.stack([depth_map, depth_map, depth_map], axis=-1)

    # Normalize to 0-1 range for matplotlib
    depth_normalized = depth_map.astype(np.float32) / 255.0

    # Get colormap
    colormap_map = {
        "jet": cm.jet,
        "viridis": cm.viridis,
        "plasma": cm.plasma,
        "inferno": cm.inferno,
        "magma": cm.magma,
        "turbo": cm.turbo,
    }

    cmap = colormap_map.get(colormap_name.lower(), cm.jet)

    # Apply colormap
    colored = cmap(depth_normalized)

    # Convert to uint8 RGB (remove alpha channel if present)
    colored_rgb = (colored[:, :, :3] * 255).astype(np.uint8)

    return colored_rgb


if __name__ == "__main__":
    routes(None)

