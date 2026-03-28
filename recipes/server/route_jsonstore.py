import os
import json
import re
from flask import jsonify, request, send_file


def safe_name(name: str) -> str:
    """Sanitize a name to be safe as a filename component."""
    return re.sub(r'[^a-zA-Z0-9_\-]', '_', name)


def jsonstore_routes(app):
    def store_dir():
        return os.path.join(app.config['UPLOAD_FOLDER'], 'data')

    @app.route('/store/<string:collection>', methods=['GET'])
    def jsonstore_list(collection: str):
        folder = os.path.join(store_dir(), safe_name(collection))
        if not os.path.isdir(folder):
            return jsonify([])
        names = sorted(
            os.path.splitext(f)[0]
            for f in os.listdir(folder)
            if f.endswith('.json')
        )
        return jsonify(names)

    @app.route('/store/<string:collection>/<string:key>', methods=['GET'])
    def jsonstore_get(collection: str, key: str):
        path = os.path.join(store_dir(), safe_name(collection), safe_name(key) + '.json')
        if not os.path.isfile(path):
            return jsonify({"error": "Not found"}), 404
        return send_file(path, mimetype='application/json')

    @app.route('/store/<string:collection>/<string:key>', methods=['PUT'])
    def jsonstore_put(collection: str, key: str):
        folder = os.path.join(store_dir(), safe_name(collection))
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, safe_name(key) + '.json')
        data = request.get_json(silent=True)
        if data is None:
            return jsonify({"error": "Invalid JSON body"}), 400
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        return jsonify({"message": "Saved", "path": f"data/{safe_name(collection)}/{safe_name(key)}.json"})

    @app.route('/store/<string:collection>/<string:key>', methods=['DELETE'])
    def jsonstore_delete(collection: str, key: str):
        path = os.path.join(store_dir(), safe_name(collection), safe_name(key) + '.json')
        if os.path.isfile(path):
            os.remove(path)
            return jsonify({"message": "Deleted"})
        return jsonify({"error": "Not found"}), 404
