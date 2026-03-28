import os
import pkgutil
import importlib
import traceback
from dataclasses import dataclass
from typing import Optional
import sys
# import importlib_resources

from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit
from flask.json.provider import DefaultJSONProvider
from assai.tools import system_monitor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

STATIC_FOLDER_DEFAULT = os.path.join(ROOT, 'static')
STATIC_FOLDER = os.path.abspath(os.getenv("FLASK_STATIC", STATIC_FOLDER_DEFAULT))
STATIC_UPLOAD_FOLDER = os.path.join(STATIC_FOLDER, 'uploads')

# os.environ["XDG_CACHE_HOME"] = os.path.join(STATIC_FOLDER, "cache")
# os.environ["HF_HOME"] = os.path.join(STATIC_FOLDER, "cache")


_out = sys.stdout

def logprint(*args, **kwargs):
    print(*args, **kwargs, file=_out)

if os.path.exists("/opt/milabench/"):
    os.environ["XDG_CACHE_HOME"] = "/opt/milabench/cache"
    os.environ["HF_HOME"] = "/opt/milabench"
    os.environ["HF_HUB_CACHE"] = "/opt/milabench/data/hub"
    os.environ["HF_DATASETS_CACHE"] = "/opt/milabench/data"
    os.environ["FLASHINFER_CACHE_DIR"] = "/opt/milabench/cache/flashinfer"


def discover_plugins(module):
    path = module.__path__
    name = module.__name__

    plugins = {}

    for _, name, _ in pkgutil.iter_modules(path, name + "."):
        try:
            plugins[name] = importlib.import_module(name)
            print(f" - Found plugin: {name}")
        except:
            traceback.print_exc()

    return plugins


@dataclass
class Layout:
    @dataclass
    class LayoutItem:
        name: str
        href: str

    title: str
    href: Optional[str]
    items: list[LayoutItem]


@dataclass
class Message:
    kind: str
    data: dict




@dataclass
class Telemetry:
    @dataclass
    class CPUInfo:
        memory: tuple[float, float]
        load: float

    @dataclass
    class GPUInfo:
        memory: tuple[float, float]
        load: float
        temp: float
        power: float

    cpu: CPUInfo
    gpu: dict[str, GPUInfo]



class CustomJSONProvider(DefaultJSONProvider):

    def default(self, o):
        if isinstance(o, frozenset):
            return list(o)

        try:
            return super().default(o)
        except TypeError:
            return str(o)

class ASSAI:
    def message(self, kind, message):
        self.socketio.emit(kind, message)
        # logprint(kind, message)

    def __init__(self):
        print(STATIC_FOLDER)
        self.app = Flask(__name__, static_folder=STATIC_FOLDER)
        self.app.json = CustomJSONProvider(self.app)
        self.socketio = SocketIO(self.app, cors_allowed_origins="*", async_mode="threading")
        # self.socketio.init_app(self.app)
        import assai.models

        models = discover_plugins(assai.models)

        for k, module in models.items():
            if hasattr(module, 'routes'):
                module.routes(self, None)

        self.observe_system = system_monitor()

        # WebSocket connection handler
        @self.socketio.on('connect')
        def handle_connect():
            print('Client connected')
            return True

        @self.socketio.on('disconnect')
        def handle_disconnect():
            print('Client disconnected')

        @self.socketio.on('join_session')
        def handle_join_session(data):
            session_id = data.get('session_id')
            if session_id:
                from flask_socketio import join_room
                join_room(session_id)
                print(f'Client joined session: {session_id}')
                return {'status': 'joined', 'session_id': session_id}

        @self.socketio.on('request_telemetry')
        def handle_request_telemetry():
            """Handle telemetry request via websocket"""
            try:
                telemetry_data = self.observe_system()
                emit('telemetry', telemetry_data)
            except Exception as e:
                print(f'Error fetching telemetry: {e}')
                emit('telemetry_error', {'error': str(e)})

        @self.app.route("/")
        def main():
            pass

        @self.app.route("/conversations")
        def convo():
            return []

        #
        # Utility routes
        #
        @self.app.route("/upload/video")
        def upload_vieo():
            pass

        @self.app.route("/upload/image")
        def upload_image():
            pass

        @self.app.route("/upload/audio")
        def upload_audio():
            pass

        @self.app.route("/stream/audio")
        def stream_audio():
            pass

        @self.app.route("/stream/video")
        def stream_video():
            pass

        @self.app.route("/layout")
        def layout() -> Layout:
            return {
                title: 'Tasks',
                items: [
                    { name: 'Recipes', href: '/recipes' },
                    { name: 'Meal Plan', href: '/planning' },
                    { name: 'Ingredients', href: '/ingredients' },
                    { name: 'Compare Recipes', href: '/compare' },
                ]
            },

        @self.app.route("/telemetry")
        def telemetry() -> Telemetry:
            """Use voir to fetch system usage (GPU & CPU & RAM)"""
            return self.observe_system()


def main():
    server = ASSAI()
    return server.app



if __name__ == "__main__":
    server = ASSAI()
    server.socketio.run(server.app, host="0.0.0.0", port=5001, debug=True)
