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


def ingredient_routes(app, db):
    @app.route('/ingredients/<int:start>/<int:end>', methods=['GET'])
    def get_ingredients_range(start: int, end: int) -> Dict[str, Any]:
        ingredients = db.session.query(Ingredient).offset(start).limit(end - start).all()
        return jsonify([ingredient.to_json() for ingredient in ingredients])

    @app.route('/ingredients', methods=['GET'])
    def get_ingredients() -> Dict[str, Any]:
        ingredients = db.session.query(Ingredient).all()
        return jsonify([ingredient.to_json() for ingredient in ingredients])

    @app.route('/ingredients', methods=['POST'])
    def create_ingredient() -> Dict[str, Any]:
        try:
            data = request.get_json()
            ingredient = Ingredient(**data)
            db.session.add(ingredient)
            db.session.commit()
            return jsonify(ingredient.to_json()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

    @app.route('/ingredients/<int:ingredient_id>', methods=['GET'])
    def get_ingredient(ingredient_id: int) -> Dict[str, Any]:
        ingredient = db.session.get(Ingredient, ingredient_id)
        if not ingredient:
            return jsonify({"error": "Ingredient not found"}), 404
        return jsonify(ingredient.to_json())

    @app.route('/ingredients/<string:ingredient_name>', methods=['GET'])
    def get_ingredient_by_name(ingredient_name: str) -> Dict[str, Any]:
        # Replace hyphens with spaces for URL-friendly names
        formatted_name = ingredient_name.replace('-', ' ')
        ingredient = db.session.query(Ingredient).filter(Ingredient.name.ilike(f"%{formatted_name}%")).first()
        if not ingredient:
            return jsonify({"error": "Ingredient not found"}), 404
        return jsonify(ingredient.to_json())

    @app.route('/ingredients/<int:ingredient_id>', methods=['PUT'])
    def update_ingredient(ingredient_id: int) -> Dict[str, Any]:
        try:
            ingredient = db.session.get(Ingredient, ingredient_id)
            if not ingredient:
                return jsonify({"error": "Ingredient not found"}), 404

            data = request.get_json()

            # Update ingredient fields
            ingredient.name = data.get('name', ingredient.name)
            ingredient.description = data.get('description', ingredient.description)
            ingredient.calories = data.get('calories', ingredient.calories)
            ingredient.density = data.get('density', ingredient.density)
            ingredient.extension = data.get('extension', ingredient.extension)

            db.session.commit()
            return jsonify(ingredient.to_json())

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

    @app.route('/ingredients/<int:ingredient_id>', methods=['DELETE'])
    def delete_ingredient(ingredient_id: int) -> Dict[str, Any]:
        try:
            ingredient = db.session.get(Ingredient, ingredient_id)
            if not ingredient:
                return jsonify({"error": "Ingredient not found"}), 404

            # Check if ingredient is used in any recipes
            recipe_count = db.session.query(RecipeIngredient).filter_by(ingredient_id=ingredient_id).count()
            if recipe_count > 0:
                return jsonify({"error": f"Cannot delete ingredient. It is used in {recipe_count} recipe(s)."}), 400

            db.session.delete(ingredient)
            db.session.commit()
            return jsonify({"message": "Ingredient deleted successfully"})

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400