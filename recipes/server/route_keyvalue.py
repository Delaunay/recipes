from typing import List, Dict, Any
from flask import jsonify, request
from sqlalchemy.dialects.sqlite import insert
from .models import KeyValueStore


def key_value_routes(app, db):
    @app.route('/kv', methods=['GET'])
    def list_topics() -> List[str]:
        # select topic from key_value_store UNIQUE
        try:
            topics = db.session.query(KeyValueStore.topic).distinct().all()
            list_of_topics = [topic[0] for topic in topics]
            return jsonify(list_of_topics)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/kv/<string:topic>', methods=['GET'])
    def list_keys(topic) -> List[str]:
        # select key from key_value_store where topic = topic
        try:
            keys = db.session.query(KeyValueStore.key).filter(KeyValueStore.topic == topic).all()
            list_of_keys = [key[0] for key in keys]
            return jsonify(list_of_keys)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/kv/<string:topic>/<string:key>', methods=['GET'])
    def get_keyvalue(topic, key) -> Dict[str, Any]:
        # select value from key_value_store where topic = topic and key = key
        try:
            kv_entry = db.session.query(KeyValueStore).filter(
                KeyValueStore.topic == topic,
                KeyValueStore.key == key
            ).first()
            
            if kv_entry:
                return jsonify(kv_entry.to_json())
            else:
                return jsonify({"error": "Key not found"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/kv/<string:topic>/<string:key>', methods=['POST'])
    def put_value(topic, key):
        # True single-query upsert using composite primary key
        try:
            data = request.get_json()
            if not data or 'value' not in data:
                return jsonify({"error": "Value is required in request body"}), 400
            
            value = data['value']
            
            # Single upsert query using SQLite's INSERT OR REPLACE with COALESCE to preserve created_at
            stmt = insert(KeyValueStore).values(
                topic=topic,
                key=key,
                value=value,
                created_at=db.func.COALESCE(
                    db.session.query(KeyValueStore.created_at)
                    .filter(KeyValueStore.topic == topic, KeyValueStore.key == key)
                    .scalar_subquery(),
                    db.func.datetime('now')
                ),
                updated_at=db.func.datetime('now')
            )
            
            # Use ON CONFLICT to handle the upsert (works because we have composite primary key)
            stmt = stmt.on_conflict_do_update(
                index_elements=['topic', 'key'],
                set_=dict(
                    value=stmt.excluded.value,
                    updated_at=stmt.excluded.updated_at
                )
            )
            
            db.session.execute(stmt)
            db.session.commit()
            return jsonify({"message": "Value stored successfully"})
            
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    