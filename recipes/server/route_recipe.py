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


def recipes_routes(app, db):
    @app.route('/recipes', methods=['GET'])
    def get_recipes() -> Dict[str, Any]:
        recipes = db.session.query(Recipe).all()
        return jsonify([recipe.to_json() for recipe in recipes])
    
    @app.route('/recipes/<int:start>/<int:end>', methods=['GET'])
    def get_recipes_range(start: int, end: int) -> Dict[str, Any]:
        recipes = db.session.query(Recipe).offset(start).limit(end - start).all()
        return jsonify([recipe.to_json() for recipe in recipes])

    @app.route('/recipes', methods=['POST'])
    def create_recipe() -> Dict[str, Any]:
        try:
            data = request.get_json()

            # Create new recipe
            recipe = Recipe(
                title=data.get('title'),
                description=data.get('description'),
                instructions=data.get('instructions', []),
                prep_time=data.get('prep_time'),
                cook_time=data.get('cook_time'),
                servings=data.get('servings'),
                images=data.get('images', []),
                author_id=data.get('author_id', 1)  # Default author for now
            )

            db.session.add(recipe)
            db.session.flush()  # Get the ID

            # Handle ingredients if provided
            if 'ingredients' in data:
                for ing_data in data['ingredients']:
                    # Find or create ingredient
                    ingredient = db.session.query(Ingredient).filter_by(name=ing_data['name']).first()
                    if not ingredient:
                        ingredient = Ingredient(name=ing_data['name'])
                        db.session.add(ingredient)
                        db.session.flush()

                    # Create RecipeIngredient with quantity and unit
                    recipe_ingredient = RecipeIngredient(
                        recipe_id=recipe._id,
                        ingredient_id=ingredient._id,
                        quantity=ing_data.get('quantity', 1.0),
                        unit=ing_data.get('unit', 'piece')
                    )
                    db.session.add(recipe_ingredient)

            # Handle categories if provided
            if 'categories' in data:
                for cat_data in data['categories']:
                    # Skip categories with negative IDs (temporary frontend IDs)
                    if cat_data.get('id', 0) < 0:
                        # Find or create category by name
                        category = db.session.query(Category).filter_by(name=cat_data['name']).first()
                        if not category:
                            category = Category(
                                name=cat_data['name'],
                                description=cat_data.get('description', '')
                            )
                            db.session.add(category)
                            db.session.flush()

                        recipe.categories.append(category)
                    else:
                        # Existing category with real ID
                        category = db.session.get(Category, cat_data['id'])
                        if category:
                            recipe.categories.append(category)

            db.session.commit()
            return jsonify(recipe.to_json()), 201

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

    @app.route('/recipes/<int:recipe_id>', methods=['GET'])
    def get_recipe(recipe_id: recipe_ids) -> Dict[str, Any]:
        recipe = db.session.get(Recipe, recipe_id)
        if not recipe:
            return jsonify({"error": "Recipe not found"}), 404
        return jsonify(recipe.to_json())

    @app.route('/recipes/<string:recipe_name>', methods=['GET'])
    def get_recipe_by_name(recipe_name: str) -> Dict[str, Any]:
        # Replace hyphens with spaces for URL-friendly names
        formatted_name = recipe_name.replace('-', ' ')
        recipe = db.session.query(Recipe).filter(Recipe.title.ilike(f"%{formatted_name}%")).first()
        if not recipe:
            return jsonify({"error": "Recipe not found"}), 404
        return jsonify(recipe.to_json())

    @app.route('/recipes/<int:recipe_id>', methods=['PUT'])
    def update_recipe(recipe_id: int) -> Dict[str, Any]:
        try:
            recipe = db.session.get(Recipe, recipe_id)
            if not recipe:
                return jsonify({"error": "Recipe not found"}), 404

            data = request.get_json()

            # Update recipe fields
            recipe.title = data.get('title', recipe.title)
            recipe.description = data.get('description', recipe.description)
            recipe.instructions = data.get('instructions', recipe.instructions)
            recipe.prep_time = data.get('prep_time', recipe.prep_time)
            recipe.cook_time = data.get('cook_time', recipe.cook_time)
            recipe.servings = data.get('servings', recipe.servings)
            recipe.images = data.get('images', recipe.images)

            # Handle ingredients update
            if 'ingredients' in data:
                # Clear existing recipe ingredients
                for recipe_ingredient in recipe.recipe_ingredients:
                    db.session.delete(recipe_ingredient)

                for ing_data in data['ingredients']:
                    # Find or create ingredient
                    ingredient = db.session.query(Ingredient).filter_by(name=ing_data['name']).first()
                    if not ingredient:
                        ingredient = Ingredient(name=ing_data['name'])
                        db.session.add(ingredient)
                        db.session.flush()

                    # Create new RecipeIngredient with quantity and unit
                    recipe_ingredient = RecipeIngredient(
                        recipe_id=recipe._id,
                        ingredient_id=ingredient._id,
                        quantity=ing_data.get('quantity', 1.0),
                        unit=ing_data.get('unit', 'piece')
                    )
                    db.session.add(recipe_ingredient)

            # Handle categories update
            if 'categories' in data:
                recipe.categories.clear()
                for cat_data in data['categories']:
                    # Skip categories with negative IDs (temporary frontend IDs)
                    if cat_data.get('id', 0) < 0:
                        # Find or create category by name
                        category = db.session.query(Category).filter_by(name=cat_data['name']).first()
                        if not category:
                            category = Category(
                                name=cat_data['name'],
                                description=cat_data.get('description', '')
                            )
                            db.session.add(category)
                            db.session.flush()

                        recipe.categories.append(category)
                    else:
                        # Existing category with real ID
                        category = db.session.get(Category, cat_data['id'])
                        if category:
                            recipe.categories.append(category)

            db.session.commit()
            return jsonify(recipe.to_json())

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

    @app.route('/recipes/<int:recipe_id>', methods=['DELETE'])
    def delete_recipe(recipe_id: int) -> Dict[str, Any]:
        try:
            recipe = db.session.get(Recipe, recipe_id)
            if not recipe:
                return jsonify({"error": "Recipe not found"}), 404

            db.session.delete(recipe)
            db.session.commit()
            return jsonify({"message": "Recipe deleted successfully"})

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400