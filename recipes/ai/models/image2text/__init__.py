from __future__ import annotations

import os

import torch
from diffusers import FluxPipeline

from assai.tools import namespaced_route


def routes(app: ASSAI, db):
    #
    # We need something to handle keeping models in VRAM/RAM
    # to reduce latency but also a way to move them if we need more VRAM/RAM
    #
    route = namespaced_route(app, '/image2text')

    @route("/model/download/<string:name>")
    def download_model_i2t(name):
        """Download a new model"""
        # Neeed to spawn a long term running process
        # to start the download and have a way to measure progress as well
        # and resume previous downloads

    @route("/model/delete/<string:name>")
    def delete_model_i2t(name):
        """Delete a local model"""

    @route("/model/list>")
    def list_model_i2t(name):
        """List local models the user can choose from"""
        return []

    @route("/model/run/<string:model>", methods=['POST'])
    def run_i2t(model):
        """Execute the model from the provided input"""
        pass


if __name__ == "__main__":
    routes(None)