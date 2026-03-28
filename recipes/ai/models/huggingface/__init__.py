from __future__ import annotations

import os
import sys
import time
import base64
from io import BytesIO
from threading import Lock
import threading
from dataclasses import asdict

import torch
from diffusers import FluxPipeline
from flask import request
from contextlib import contextmanager
import torchcompat.core as accelerator

from huggingface_hub import scan_cache_dir
from huggingface_hub import HfApi

from assai.tools import namespaced_route, capture_progress_thread, pil_to_base64_png, cached, websocket_pusher
from assai.tools import live_models, system_monitor


def routes(app: ASSAI, db):

    route = namespaced_route(app, '/huggingface')
    api = HfApi()
    observe = system_monitor()

    @route("/search/<string:name>")
    @route("/search/<string:name>/<string:filter>")
    def search_model(name, filter=None):
        return api.list_models(search=name, filter=filter, limit=20)

    @route("/info/<string:name>")
    def model_info(name):
        card = api.model_info(repo_id=name)
        d = asdict(card)
        return d

    @route("/list")
    def available():
        cache_info: HFCacheInfo = scan_cache_dir()
        repos = []

        for repo in cache_info.repos:
            if repo.repo_type == "model":
                model_card = api.model_info(repo_id=repo.repo_id)
                repo = asdict(repo)
                repo['card'] = model_card
                repos.append(repo)
            else:
                repos.append(repo)

        return {"repos": repos}

    @route("/loaded/models/list")
    def loaded():
        return {
            "system": observe(),
            "torch": {
                "allocated": torch.cuda.memory_allocated() / 1024 / 1024,
                "reserved": torch.cuda.memory_reserved() / 1024 / 1024,
            },
            "models": live_models.__json__(),
        }

    @route("/loaded/models/remove/<string:name>", methods=['DELETE'])
    def remove_model(name):
        live_models.remove(name)
        return {"success": True, "message": f"Model {name} removed"}

