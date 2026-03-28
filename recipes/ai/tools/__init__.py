from __future__ import annotations

import os
import sys
import time
import base64
from io import BytesIO
from threading import Lock, RLock
import threading
from collections import defaultdict
from dataclasses import dataclass, field
import gc
from contextlib import contextmanager
import json
from pathlib import Path
import pkgutil
import importlib
import importlib_resources

import torch
from diffusers import FluxPipeline
from flask import request
import torchcompat.core as accelerator
from PIL import Image
from cantilever.core.statstream import StatStream


class ModelModule:
    def __init__(self, model_module, default):
        self.model_module = model_module
        self.default = default

    def __getattr__(self, attr):
        try:
            return getattr(self.model_module, attr)
        except AttributeError:
            return getattr(self.default, attr)


class ModelModules:
    def __init__(self, plugins, default):
        self.plugins = plugins
        self.default = default

    def __getitem__(self, item):
        return ModelModule(self.plugins.get(item, self.default), self.default) 

    def __call__(self, model_id):
        return ModelModule(self.plugins.get(model_id, self.default), self.default)

    def keys(self):
        return self.plugins.keys()


def load_model_override(module, default) -> ModelModules:
    path = module.__path__
    name = module.__name__

    plugins = {}

    for _, module_name, _ in pkgutil.iter_modules(path, name + "."):
        mod = importlib.import_module(module_name)

        if hasattr(mod, "model_id"):
            for model_id in mod.model_id:
                plugins[model_id] = mod
    
    return ModelModules(plugins, default)


def namespaced_route(app, namespace):
    if not namespace.startswith("/"):
        namespace = "/" + namespace

    # Handle both ASSAI instance and Flask app
    flask_app = app.app if hasattr(app, 'app') else app

    def route(url_pat, *args, **kwargs):
        if not url_pat.startswith("/"):
            url_pat = "/" + url_pat
        return flask_app.route(namespace + url_pat, *args, **kwargs)
    return route


def pil_to_base64_png(img: Image):
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def video_to_base64(video):
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_file:
        temp_video_path = tmp_file.name

        export_to_video(video_frames, temp_video_path, fps=24)

        # Read the video file and convert to base64
        with open(temp_video_path, "rb") as fp:
            video_data = fp.read()

        # Encode to base64
        return base64.b64encode(video_data).decode('ascii')


_observe_util = None


@dataclass
class SystemMetric:
    time: float

    @dataclass
    class CPUMetric:
        load: float
        memory: list

    @dataclass
    class GPUMetric:
        @dataclass
        class GPUItem:
            load: float
            memory: list
            power: float
            temperature: float
    
        gpus: dict[str, GPUItem]
        
    @dataclass
    class NetworkMetric:
        bytes_sent: int
        bytes_recv: int  
        packets_sent: int
        packets_recv: int  
        errin: int
        errout: int  
        dropin: int
        dropout: int  

    cpu: CPUMetric
    gpu: GPUMetric
    netowrk: NetworkMetric


def system_monitor():
    global _observe_util
    if _observe_util is not None:
        return _observe_util

    import multiprocessing as mp

    from voir.instruments.cpu import cpu_monitor
    from voir.instruments.network import network_monitor
    from voir.instruments.gpu import select_backend, gpu_monitor
    from voir.instruments.io import io_monitor

    cpu_fn = cpu_monitor()
    select_backend()
    gpu_fn = gpu_monitor()
    n_cpu = mp.cpu_count()
    network_fn = network_monitor()
    io_fn = io_monitor()

    def observe() -> SystemMetric:
        cpu = cpu_fn()
        cpu["load"] = cpu["load"] / n_cpu
        return {"cpu": cpu, "gpu": gpu_fn(), "time": time.time(), "network": network_fn(), "disk": io_fn()}
 
    _observe_util = observe
    return observe


@dataclass
class ModelCacheEntry:
    model: any
    lock: threading.Lock
    before: any = None
    after: any = None
    last_used: float = None
    model_info: any = None
    last_inference_time: float = 0

    load_time_stat: StatStream = field(default_factory=lambda: StatStream(drop_first_obs=0))
    mem_stat: StatStream = field(default_factory=lambda: StatStream(drop_first_obs=0))
    inference_stat: StatStream = field(default_factory=lambda: StatStream(drop_first_obs=0))

    def load_state_dict(self, state):
        self.model_info = state["model_info"]
        self.load_time_stat = StatStream.from_dict(state["load_time_stat"])
        self.mem_stat = StatStream.from_dict(state["mem_stat"])
        self.inference_stat =StatStream.from_dict( state["inference_stat"])

    def state_dict(self):
        return {
            "load_time_stat": self.load_time_stat.state_dict(),
            "mem_stat": self.mem_stat.state_dict(),
            "inference_stat": self.inference_stat.state_dict(),
            "model_info": self.model_info
        } 

    def memory(self):
        mem = -1

        if self.after and self.before:
            mem = 0

            for idx, before in self.before["gpu"].items():
                after = self.after["gpu"][idx]

                bused = before["memory"][0]
                aused = after["memory"][0]

                mem += aused - bused
        
        return mem

    @contextmanager
    def inference(self):
        s = time.time()
        yield
        e = time.time()

        elapsed = e - s
        self.last_inference_time = elapsed
        self.inference_stat.update(elapsed)

    def load_time(self):
        if self.after and self.before:
            return (self.after["time"] - self.before["time"])
        return -1

    def __json__(self):
        return {
            "memory_usage": self.memory(),
            "load_time":  self.load_time(),
            "last_used": self.last_used,  
            "last_inference_time": self.last_inference_time
        }


class ThreadSafeModel:
    def __init__(self, cached_entry: ModelCacheEntry, cb):
        self.entry = cached_entry
        self.cb = cb

    def __call__(self, *args, **kwargs):
        with self.entry.lock:
            self.entry.last_used = time.time()
            with self.entry.inference():
                results = self.entry.model(*args, **kwargs)

        self.cb()
        return results



data_path = importlib_resources.files("assai.data")


class ModelCache:
    """Model are loaded once and kept alive until later"""

    def __init__(self):
        self.cache = dict()
        self.lock = threading.Lock()
        self.observe = system_monitor()
        self.file = data_path / "models.json"
        self.primaries = dict()
        self.stats = {}

        if self.file.exists():
            with open(self.file, "r", encoding="utf-8") as file:
                self.stats = json.load(file)

    def save(self):
        tmp = str(self.file) + ".tmp"

        self.stats.update(self.state_dict())

        with open(tmp, "w") as file:
            json.dump(self.stats, file, indent=2)

        Path(tmp).replace(self.file)

    def load_model(self, key, fun, *args, model_info=None, **kwargs):
        cache_entry = self.cache.setdefault(key, ModelCacheEntry(None, threading.Lock()))
        cache_entry.model_info = model_info

        if key in self.stats:
            cache_entry.load_state_dict(self.stats[key])

        with cache_entry.lock:
            if cache_entry.model is None:
                # Force loading one model at a time
                with self.lock:
                    cache_entry.last_used = 0
                    cache_entry.before = self.observe()
                    cache_entry.model = fun(*args, **kwargs)
                    cache_entry.after = self.observe()
                    cache_entry.load_time_stat.update(cache_entry.load_time())
                    cache_entry.mem_stat.update(cache_entry.memory())

        self.save()
        return ThreadSafeModel(cache_entry, self.save)

    def remove(self, item):
        self.cache.pop(item)
        gc.collect()
        torch.cuda.empty_cache()

    def __json__(self):
        return {
            name: entry.__json__() for name, entry in self.cache.items()
        }

    def state_dict(self):
        return {
            name: entry.state_dict() for name, entry in self.cache.items()
        }


live_models = ModelCache()


def cached(*keys, **model_info):
    global live_models

    key = "_".join(keys)

    # 
    #  Support eviction of previous model
    # 
    if item := live_models.primaries.get(keys[0]):
        print(f"Eviction of model {item}")
        live_models.remove(item)
  
    live_models.primaries[key[0]] = key
    
    def decorator(fun):
        def _(*args, **kwargs):
            return live_models.load_model(key, fun, *args, model_info=model_info, **kwargs)
        return _
    return decorator


original_stdout = sys.stdout


class SocketIOBuffer:
    def __init__(self, push, stdout=None):
        self.prev = []
        self.push = push

    def write(self, msg):
        msg = msg.replace("\x1b[A", "\n").replace("\r", "\n")

        if "\n" not in msg:
            self.prev.append(msg)
        else:
            head, _, tail = msg.partition("\n")
            self.prev.append(head)
            line = "".join(self.prev)

            if line != "":
                self.push(line)

            self.prev = []
            self.write(tail)
            
    def flush(self):
        pass


class StreamRouter:
    def __init__(self, push):
        self.route = push
        self._local = threading.local()

    @property
    def prev(self):
        if not hasattr(self._local, "prev"):
            self._local.prev = []   # each thread gets its own list object
        return self._local.prev

    def write(self, msg):
        thread_id = threading.get_ident()
        msg = msg.replace("\x1b[A", "\n").replace("\r", "\n")

        if "\n" not in msg:
            self.prev.append(msg)
        else:
            while msg:
                head, _, msg = msg.partition("\n")
                self.prev.append(head)
                line = "".join(self.prev)

                if line != "":
                    self.route(thread_id, line)

                self.prev.clear()
            
    def flush(self):
        pass

socket_io_lock = Lock()


@contextmanager
def capture_progress(app, action_id=0):
    global socket_io_lock

    old_out = sys.stdout
    old_err = sys.stderr 
    was_replaced = False

    with socket_io_lock:
        if not isinstance(sys.stdout, SocketIOBuffer):
            sys.stdout = SocketIOBuffer(push=lambda line: app.message("stdout", {"id": action_id, "line": line}))
            sys.stderr = SocketIOBuffer(push=lambda line: app.message("stderr", {"id": action_id, "line": line}))
            was_replaced = True

    yield

    if was_replaced:
        with socket_io_lock:
            sys.stdout = old_out
            sys.stderr = old_err


def websocket_pusher(app, action_id):
    def channel_push(chanel):
        def push(thread_id, line):
            app.message(chanel, {"id": action_id, "thread_id": thread_id, "line": line})
        return push
    return channel_push

def stdout_pusher(file, action_id):
    def channel_push(chanel):
        def push(thread_id, line):
            print(chanel, {"id": action_id, "thread_id": thread_id, "line": line}, file=file)
        return push
    return channel_push


@contextmanager
def websocket_log_capture(app, action_id):
    pusher_fatory = websocket_pusher(app, action_id)

    with capture_progress_thread(pusher_factory, action_id):
        yield


@contextmanager
def capture_progress_thread(pusher_factory, action_id=0):
    global socket_io_lock

    old_out = sys.stdout
    old_err = sys.stderr 
    was_replaced = False


    with socket_io_lock:
        if not isinstance(sys.stdout, SocketIOBuffer):
            sys.stdout = StreamRouter(push=pusher_factory("stdout"))
            sys.stderr = StreamRouter(push=pusher_factory("stderr"))
            was_replaced = True

    try:
        yield

    except:
        import traceback
        traceback.print_exc()
        raise
    finally:
        if was_replaced:
            with socket_io_lock:
                sys.stdout = old_out
                sys.stderr = old_err


def test_routing_stream():
    from concurrent.futures import ThreadPoolExecutor, wait, ALL_COMPLETED

    def worker_sim(i):
        for j in range(10):
            print(f"Worker {i}")

    pusher = stdout_pusher(sys.stdout, 1)

    with capture_progress_thread(pusher):
        with ThreadPoolExecutor(max_workers=4) as ex:
            futures = []
            for i in range(10):
                futures.append(ex.submit(worker_sim, i))
            wait(futures, return_when=ALL_COMPLETED, timeout=10)


if __name__ == "__main__":
    test_routing_stream()
