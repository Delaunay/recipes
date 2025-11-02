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
from .models import Base, Recipe, Ingredient, Category, UnitConversion, RecipeIngredient, Event, Task, IngredientComposition


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
            ingredient.fdc_id = data.get('fdc_id', ingredient.fdc_id)
            ingredient.price_high = data.get('price_high', ingredient.price_high)
            ingredient.price_low = data.get('price_low', ingredient.price_low)
            ingredient.price_medium = data.get('price_medium', ingredient.price_medium)
            ingredient.calories = data.get('calories', ingredient.calories)
            ingredient.density = data.get('density', ingredient.density)
            ingredient.composition = data.get('composition', ingredient.composition)
            ingredient.extension = data.get('extension', ingredient.extension)
            ingredient.item_avg_weight = data.get('item_avg_weight', ingredient.item_avg_weight)

            # Update unit fields
            unit_data = data.get('unit', {})
            if unit_data:
                ingredient.unit_metric = unit_data.get('metric', ingredient.unit_metric)
                ingredient.unit_us_customary = unit_data.get('us_customary', ingredient.unit_us_customary)
                ingredient.unit_us_legal = unit_data.get('us_legal', ingredient.unit_us_legal)
                ingredient.unit_canada = unit_data.get('canada', ingredient.unit_canada)
                ingredient.unit_australia = unit_data.get('australia', ingredient.unit_australia)
                ingredient.unit_uk = unit_data.get('uk', ingredient.unit_uk)

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

    # Ingredient Composition routes
    @app.route('/ingredients/<int:ingredient_id>/compositions', methods=['GET'])
    @app.route('/ingredients/<int:ingredient_id>/compositions/<string:source>', methods=['GET'])
    def get_ingredient_compositions(ingredient_id: int, source: str = None) -> Dict[str, Any]:
        """Get all compositions for a specific ingredient"""
        if source is None:
            compositions = db.session.query(IngredientComposition).filter_by(
                ingredient_id=ingredient_id).all()
        else:
            compositions = db.session.query(IngredientComposition).filter_by(
                ingredient_id=ingredient_id, source=source).all()

        return jsonify([comp.to_json() for comp in compositions])


    @app.route('/ingredients/<int:ingredient_id>/compositions/source', methods=['GET'])
    def get_ingredient_composition_sources(ingredient_id: int) -> Dict[str, Any]:
        """Get all unique sources for a specific ingredient's compositions"""
        sources = db.session.query(IngredientComposition.source).filter_by(ingredient_id=ingredient_id).distinct().all()
        # Extract source values from tuples and filter out None
        source_list = [source[0] for source in sources if source[0] is not None]
        return jsonify(source_list)

    @app.route('/ingredients/<int:ingredient_id>/compositions', methods=['POST'])
    def create_ingredient_composition(ingredient_id: int) -> Dict[str, Any]:
        """Create a new composition for an ingredient"""
        try:
            ingredient = db.session.get(Ingredient, ingredient_id)
            if not ingredient:
                return jsonify({"error": "Ingredient not found"}), 404

            data = request.get_json()
            composition = IngredientComposition(
                ingredient_id=ingredient_id,
                name=data.get('name'),
                kind=data.get('kind'),
                quantity=data.get('quantity'),
                unit=data.get('unit'),
                daily_value=data.get('daily_value'),
                extension=data.get('extension'),
                source=data.get('source')
            )
            db.session.add(composition)
            db.session.commit()
            return jsonify(composition.to_json()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

    @app.route('/ingredients/compositions/<int:composition_id>', methods=['PUT'])
    def update_ingredient_composition(composition_id: int) -> Dict[str, Any]:
        """Update an existing composition"""
        try:
            composition = db.session.get(IngredientComposition, composition_id)
            if not composition:
                return jsonify({"error": "Composition not found"}), 404

            data = request.get_json()
            composition.name = data.get('name', composition.name)
            composition.kind = data.get('kind', composition.kind)
            composition.quantity = data.get('quantity', composition.quantity)
            composition.unit = data.get('unit', composition.unit)
            composition.daily_value = data.get('daily_value', composition.daily_value)
            composition.extension = data.get('extension', composition.extension)
            composition.source = data.get('source', composition.source)

            db.session.commit()
            return jsonify(composition.to_json())
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

    @app.route('/ingredients/compositions/<int:composition_id>', methods=['DELETE'])
    def delete_ingredient_composition(composition_id: int) -> Dict[str, Any]:
        """Delete a composition"""
        try:
            composition = db.session.get(IngredientComposition, composition_id)
            if not composition:
                return jsonify({"error": "Composition not found"}), 404

            db.session.delete(composition)
            db.session.commit()
            return jsonify({"message": "Composition deleted successfully"})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

