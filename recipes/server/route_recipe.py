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
from .models import Base, Recipe, Ingredient, Category, UnitConversion, RecipeIngredient, Event, Task, SubTask, IngredientComposition


def recipes_routes(app, db):
    @app.route('/ingredient/search/<string:name>', methods=['GET'])
    def search_ingredient(name: str):
        # this the condition recipe_id is none
        ingredients = db.session.query(Ingredient).filter(Ingredient.name.like(f'%{name}%')).all()
        recipes = db.session.query(Recipe).filter(Recipe.title.like(f'%{name}%')).all()

        # Convert to JSON format and combine results
        result =  [] +\
            [{'id': ing._id, 'name': ing.name, 'type': "ingredient"} for ing in ingredients] +\
            [{'id': recipe._id, 'name': recipe.title, 'type': "recipe"} for recipe in recipes]

        return jsonify(result)

    @app.route('/recipes', methods=['GET'])
    def get_recipes() -> Dict[str, Any]:
        # recipes = db.session.query(Recipe).filter(Recipe.component == False).all()
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
                author_id=data.get('author_id', 1),  # Default author for now
                component=data.get('component', False)
            )

            db.session.add(recipe)
            db.session.flush()  # Get the ID

            # Handle ingredients if provided
            if 'ingredients' in data:
                for ing_data in data['ingredients']:
                    ingredient_id = None
                    ingredient_recipe_id = None

                    # Check if this is a recipe used as ingredient
                    if 'ingredient_recipe_id' in ing_data and ing_data['ingredient_recipe_id']:
                        # CRITICAL: Never allow a recipe to reference itself as an ingredient
                        if ing_data['ingredient_recipe_id'] == recipe._id:
                            return jsonify({"error": "A recipe cannot reference itself as an ingredient"}), 400
                        ingredient_recipe_id = ing_data['ingredient_recipe_id']

                    elif 'ingredient_id' in ing_data and ing_data['ingredient_id']:
                        ingredient_id = ing_data['ingredient_id']
                    else:
                        # Find or create ingredient by name
                        ingredient = db.session.query(Ingredient).filter_by(name=ing_data['name']).first()
                        if not ingredient:
                            ingredient = Ingredient(name=ing_data['name'])
                            db.session.add(ingredient)
                            db.session.flush()
                        ingredient_id = ingredient._id

                    # Create RecipeIngredient with quantity and unit
                    recipe_ingredient = RecipeIngredient(
                        recipe_id=recipe._id,
                        ingredient_id=ingredient_id,
                        ingredient_recipe_id=ingredient_recipe_id,
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
            recipe.component = data.get('component', recipe.component)

            # Handle ingredients update
            if 'ingredients' in data:
                # Clear existing recipe ingredients
                for recipe_ingredient in recipe.recipe_ingredients:
                    db.session.delete(recipe_ingredient)

                for ing_data in data['ingredients']:
                    ingredient_id = None
                    ingredient_recipe_id = None

                    # Check if this is a recipe used as ingredient
                    if 'ingredient_recipe_id' in ing_data and ing_data['ingredient_recipe_id']:
                        # CRITICAL: Never allow a recipe to reference itself as an ingredient
                        if ing_data['ingredient_recipe_id'] == recipe._id:
                            return jsonify({"error": "A recipe cannot reference itself as an ingredient"}), 400
                        ingredient_recipe_id = ing_data['ingredient_recipe_id']
                    elif 'ingredient_id' in ing_data and ing_data['ingredient_id']:
                        ingredient_id = ing_data['ingredient_id']
                    else:
                        # Find or create ingredient by name
                        ingredient = db.session.query(Ingredient).filter_by(name=ing_data['name']).first()
                        if not ingredient:
                            ingredient = Ingredient(name=ing_data['name'])
                            db.session.add(ingredient)
                            db.session.flush()
                        ingredient_id = ingredient._id

                    # Create new RecipeIngredient with quantity and unit
                    recipe_ingredient = RecipeIngredient(
                        recipe_id=recipe._id,
                        ingredient_id=ingredient_id,
                        ingredient_recipe_id=ingredient_recipe_id,
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


    @app.route('/recipes/nutrition/<int:recipe_id>', methods=['GET'])
    def get_recipe_nutrition(recipe_id: int):
        """
        Calculate total nutrition for a recipe by aggregating all ingredient nutrition.
        This should get scrapped by the static website generator as this is quite slow.
        """
        from .route_units import convert
        from collections import defaultdict

        try:
            # Fetch the recipe
            recipe = db.session.get(Recipe, recipe_id)
            if not recipe:
                return jsonify({"error": "Recipe not found"}), 404

            # Dictionary to aggregate nutrition by nutrient name
            # Structure: {nutrient_name: {quantity: float, unit: str, kind: str, daily_value: float}}
            nutrition_totals = defaultdict(lambda: {
                'quantity': 0.0,
                'unit': '',
                'kind': '',
                'daily_value': 0.0
            })

            # Helper function to add nutrition from an ingredient
            def add_ingredient_nutrition(ingredient_id, quantity_in_grams):
                # Get all nutrition compositions for this ingredient
                compositions = db.session.query(IngredientComposition).filter(
                    IngredientComposition.ingredient_id == ingredient_id
                ).all()

                for comp in compositions:
                    if not comp.name or comp.quantity is None:
                        continue

                    # Nutrition is typically per 100g, scale to actual quantity
                    # Assuming composition.quantity is the amount per 100g
                    scaling_factor = quantity_in_grams / 100.0
                    scaled_quantity = comp.quantity * scaling_factor

                    # Add to totals
                    nutrient = nutrition_totals[comp.name]
                    nutrient['quantity'] += scaled_quantity
                    nutrient['unit'] = comp.unit  # Assume all same nutrient use same unit
                    nutrient['kind'] = comp.kind
                    nutrient['daily_value'] += (comp.daily_value or 0) * scaling_factor

            # Process each recipe ingredient
            for recipe_ingredient in recipe.recipe_ingredients:
                try:
                    # Handle recipe used as ingredient (nested recipe)
                    if recipe_ingredient.ingredient_recipe_id:
                        # Recursively get nutrition from the nested recipe
                        nested_recipe = db.session.get(Recipe, recipe_ingredient.ingredient_recipe_id)
                        if nested_recipe:
                            # Get nutrition for nested recipe and scale by quantity
                            nested_nutrition = get_recipe_nutrition(nested_recipe._id)
                            if nested_nutrition and isinstance(nested_nutrition, dict):
                                # Scale nested recipe nutrition by the quantity used
                                multiplier = recipe_ingredient.quantity or 1.0
                                for nutrient_name, nutrient_data in nested_nutrition.get('nutrition', {}).items():
                                    nutrient = nutrition_totals[nutrient_name]
                                    nutrient['quantity'] += nutrient_data['quantity'] * multiplier
                                    nutrient['unit'] = nutrient_data.get('unit', '')
                                    nutrient['kind'] = nutrient_data.get('kind', '')
                                    nutrient['daily_value'] += nutrient_data.get('daily_value', 0) * multiplier
                        continue

                    # Handle regular ingredient
                    if not recipe_ingredient.ingredient_id:
                        continue

                    ingredient = db.session.get(Ingredient, recipe_ingredient.ingredient_id)
                    if not ingredient:
                        continue

                    # Convert ingredient quantity to grams
                    quantity = recipe_ingredient.quantity or 1.0
                    unit = recipe_ingredient.unit or 'g'

                    # If already in grams, no conversion needed
                    if unit == 'g':
                        quantity_in_grams = quantity
                    # If unit is "unit", "piece", "item", etc., use item_avg_weight
                    elif unit.lower() in ['unit', 'piece', 'item', 'each', 'whole']:
                        if ingredient.item_avg_weight:
                            quantity_in_grams = quantity * ingredient.item_avg_weight
                        else:
                            # No average weight defined, skip this ingredient
                            print(f"No item_avg_weight defined for ingredient {ingredient.name}, cannot convert {quantity} {unit}")
                            continue
                    else:
                        try:
                            # Convert to grams using the conversion function
                            quantity_in_grams = convert(
                                db,
                                quantity,
                                unit,
                                'g',
                                recipe_ingredient.ingredient_id
                            )
                        except Exception as conv_error:
                            # If conversion fails, skip this ingredient
                            print(f"Failed to convert {quantity} {unit} to grams for ingredient {ingredient.name}: {conv_error}")
                            continue

                    # Add nutrition from this ingredient
                    add_ingredient_nutrition(recipe_ingredient.ingredient_id, quantity_in_grams)

                except Exception as ingredient_error:
                    print(f"Error processing ingredient: {ingredient_error}")
                    continue

            # Format the response
            nutrition_dict = {}
            for nutrient_name, nutrient_data in nutrition_totals.items():
                nutrition_dict[nutrient_name] = {
                    'quantity': round(nutrient_data['quantity'], 2),
                    'unit': nutrient_data['unit'],
                    'kind': nutrient_data['kind'],
                    'daily_value': round(nutrient_data['daily_value'], 1)
                }

            return jsonify({
                'recipe_id': recipe_id,
                'recipe_name': recipe.title,
                'servings': recipe.servings,
                'nutrition': nutrition_dict
            })

        except Exception as e:
            print(f"Error calculating recipe nutrition: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500