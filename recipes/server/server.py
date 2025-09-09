from __future__ import annotations

from typing import Dict, Any
import os
import sys
import uuid
from pathlib import Path
from datetime import datetime, timedelta
import traceback

from PIL import Image
from flask import Flask, jsonify, request, send_from_directory
from sqlalchemy.orm import sessionmaker, scoped_session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.utils import secure_filename

from ..tools.images import centercrop_resize_image
from .models import Base, Recipe, Ingredient, Category, UnitConversion, RecipeIngredient, Event, Task, SubTask
from .route_keyvalue import key_value_routes
from .route_messaging import messaging_routes
from .route_calendar import calendar_routes
from .route_tasks import tasks_routes
from .route_units import units_routes
from .route_images import images_routes
from .route_recipe import recipes_routes
from .route_ingredient import ingredient_routes

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

STATIC_FOLDER_DEFAULT = os.path.join(ROOT, 'static')
STATIC_FOLDER = os.path.abspath(os.getenv("FLASK_STATIC", STATIC_FOLDER_DEFAULT))
STATIC_UPLOAD_FOLDER = os.path.join(STATIC_FOLDER, 'uploads')


__annotation_registry = {}

def annotation(fun):
    global __annotation_registry

    __annotation_registry[fun.__name__] = fun

    return fun

def annotation_registry():
    global __annotation_registry
    return __annotation_registry


__annotation_registry["recipe_ids"] = lambda sesh: sesh.query(Recipe._id).all()

    

class RecipeApp:
    def __init__(self):
        print(STATIC_FOLDER)
        self.app = Flask(__name__, static_folder=STATIC_FOLDER)
        self.app.config['JSON_SORT_KEYS'] = False
        self.app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{STATIC_FOLDER}/database.db"

        # Configure file uploads
        self.app.config['UPLOAD_FOLDER'] = STATIC_UPLOAD_FOLDER
        self.app.config['ORIGINALS_FOLDER'] = '/mnt/xshare/projects/recipes/originals'
        # No file size limit

        # Create uploads directory if it doesn't exist
        os.makedirs(self.app.config['UPLOAD_FOLDER'], exist_ok=True)

        # Enable CORS for React frontend
        CORS(self.app)

        # # Create engine and session
        # engine = create_engine('sqlite:///recipes.db')
        # session_factory = sessionmaker(bind=engine)
        # Session = scoped_session(session_factory)
        # # Create database tables
        # Base.metadata.create_all(engine)

        self.db = SQLAlchemy(model_class=Base)
        self.db.init_app(self.app)

        with self.app.app_context():
            self.db.create_all()
            # self._seed_data()

        # users = db.session.execute(db.select(User).order_by(User.username)).scalars()
        self.setup_routes()
        
        key_value_routes(self.app, self.db)
        messaging_routes(self.app)
        calendar_routes(self.app, self.db)
        tasks_routes(self.app, self.db)
        units_routes(self.app, self.db)
        images_routes(self.app)
        recipes_routes(self.app, self.db)
        ingredient_routes(self.app, self.db)

    def setup_routes(self):
        @self.app.route('/', defaults={'path': ''})
        @self.app.route('/<path:path>')
        def serve_frontend(path):
            if path != "" and os.path.exists(os.path.join(self.app.static_folder, path)):
                return send_from_directory(self.app.static_folder, path)
            else:
                return send_from_directory(self.app.static_folder, 'index.html')

        @self.app.route('/health')
        def health_check() -> Dict[str, str]:
            return jsonify({"status": "healthy"})

        @self.app.route('/categories', methods=['GET'])
        def get_categories() -> Dict[str, Any]:
            categories = self.db.session.query(Category).all()
            return jsonify([category.to_json() for category in categories])

        @self.app.route('/categories', methods=['POST'])
        def create_category() -> Dict[str, Any]:
            try:
                data = request.get_json()
                category = Category(**data)
                self.db.session.add(category)
                self.db.session.commit()
                return jsonify(category.to_json()), 201
            except Exception as e:
                self.db.session.rollback()
                return jsonify({"error": str(e)}), 400


    def run(self, host: str = '0.0.0.0', port: int = 5000, debug: bool = True) -> None:
        self.app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    app = RecipeApp()
    app.run()
