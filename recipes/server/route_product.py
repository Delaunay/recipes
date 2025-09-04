from typing import List, Dict, Any

from flask import jsonify

from .models import Product, ProductIngredient, Ingredient


def produt_routes(app):
    """Routes to manage products (actual ingredients bought in stores)"""

    @app.route('/kv', methods=['GET'])
    def list_topics() -> List[str]:
        # select topic from key_value_store UNIQUE
        try:
            topics = db.session.query(KeyValueStore.topic).distinct().all()
            list_of_topics = [topic[0] for topic in topics]
            return jsonify(list_of_topics)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
