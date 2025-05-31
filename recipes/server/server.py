from flask import Flask, jsonify, request
from typing import Dict, Any

class RecipeApp:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.config['JSON_SORT_KEYS'] = False
        self.setup_routes()

    def setup_routes(self):
        @self.app.route('/')
        def home() -> Dict[str, str]:
            return jsonify({"message": "Welcome to the Recipe API"})

        @self.app.route('/health')
        def health_check() -> Dict[str, str]:
            return jsonify({"status": "healthy"})

    def run(self, host: str = '0.0.0.0', port: int = 5000, debug: bool = True) -> None:
        self.app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    app = RecipeApp()
    app.run()
