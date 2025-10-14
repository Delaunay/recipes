from __future__ import annotations

from typing import Dict, Any
import os
import sys
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from dataclasses import asdict
import traceback
import time

from PIL import Image
from flask import Flask, jsonify, request, send_from_directory
from sqlalchemy.orm import sessionmaker, scoped_session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.utils import secure_filename

from ..tools.images import centercrop_resize_image
from .models import Base, Recipe, Ingredient, Category, UnitConversion, RecipeIngredient, Event, Task, SubTask, IngredientComposition
from .usda.usda_reader import USDAReader


HERE = os.path.dirname(__file__)

USDA_FOLDER = os.path.join(HERE, "..", "data", "usda")


def usda_routes(app, *args):
    from usda_fdc.client import FdcClient
    from usda_fdc.analysis.recipe import parse_ingredient
    from usda_fdc.analysis import analyze_food, DriType, Gender
    from usda_fdc.analysis.recipe import create_recipe, analyze_recipe

    class RateLimitedClient(FdcClient):
        def __init__(self, api_key, requests_per_minute=10, **kwargs):
            super().__init__(api_key, **kwargs)
            self.requests_per_minute = requests_per_minute
            self.interval = 60 / requests_per_minute
            self.last_request_time = 0

        def _make_request(self, endpoint, method="GET", params=None, data=None):
            # Wait if needed
            current_time = time.time()
            time_since_last = current_time - self.last_request_time

            if time_since_last < self.interval:
                time.sleep(self.interval - time_since_last)

            # Make the request
            result = super()._make_request(endpoint, method, params, data)

            # Update last request time
            self.last_request_time = time.time()

            return result
 
    api_key = os.getenv("FDC_API_KEY")
    # client = RateLimitedClient(api_key, requests_per_minute=1000/60)
    client = RateLimitedClient(api_key)

    @app.route('/api/usda/search/<string:name>', methods=['GET'])
    def search_usda_foods(name):
        # page_number
        # page_size
        print("1")
        rows: SearchResult = client.search(name, data_type="Foundation")
        print("2")
    
        results = []
        for row in rows.foods:
            results.append(asdict(row)) 

        return results

    @app.route('/api/usda/food/<int:fdc_id>', methods=['GET'])
    def get_food(fdc_id):
        # page_number
        # page_size
        food: Food = client.get_food(fdc_id, nutrients=None)
        return asdict(food)

    @app.route('/api/usda/parse/<string:name>', methods=['GET'])
    def parse_ingredient(name):
        # this is just a regex
        ingredient = parse_ingredient("1 cup flour", client)

        print(f"Food: {ingredient.food.description}")
        print(f"Weight: {ingredient.weight_g:.1f}g")

        food_id = search_results.foods[0].fdc_id
        food = client.get_food(food_id)

        weight_g = estimate_weight(food, quantity, unit)

        Ingredient(
            food=food,
            weight_g=weight_g,
            description=text
        )
    

    @app.route('/api/usda/analyze/<fdc_id>', methods=['GET'])
    def analyze_ingredient(fdc_id):
        food = client.get_food(fdc_id)

        # Dietary Reference Intakes
        #   DriType.RDA: Recommended Dietary Allowance
        #   DriType.AI: Adequate Intake
        #   DriType.UL: Tolerable Upper Intake Level
        #   DriType.EAR: Estimated Average Requirement
        #   DriType.AMDR: Acceptable Macronutrient Distribution Range

        analysis = analyze_food(
            food,
            dri_type=DriType.RDA, 
            gender=Gender.MALE,
            serving_size=100.0
        )

        return results

    @app.route('/api/usda/recipe/<recipe_id>', methods=['GET'])
    def analyze_recipe(recipe_id):
        # Create a recipe
        recipe = create_recipe(
            name="Fruit Salad",
            ingredient_texts=[
                "1 apple",
                "1 banana",
                "100g strawberries"
            ],
            client=client,
            servings=2
        )

        # Analyze the recipe
        analysis = analyze_recipe(recipe)

        # Access the analysis results
        per_serving = analysis.per_serving_analysis

        return results


def usda_csv_routes(app, db):
    """USDA routes are only available during edit mode.
    They are here to auto complete annoying data for us

    Source: https://fdc.nal.usda.gov/download-datasets

    Workflow:
    1. User searches for USDA foods: GET /api/usda/search?q=chicken
    2. User selects a food and views details: GET /api/usda/food/<fdc_id>
    3. User applies USDA data to their ingredient: POST /api/usda/apply
    """

    usda_reader = USDAReader(USDA_FOLDER)

    @app.route('/api/usda/search', methods=['GET'])
    def search_usda_foods():
        """
        Search USDA foods by description

        Query params:
            q: Search query (required)
            limit: Max results (default: 20)
            data_type: Filter by data type (optional)

        Returns:
            List of matching foods with basic info
        """
        query = request.args.get('q', '')

        if not query:
            return jsonify({"error": "Query parameter 'q' is required"}), 400

        limit = request.args.get('limit', 20, type=int)
        data_type = request.args.get('data_type', 'foundation_food')

        # Limit to reasonable bounds
        limit = min(max(1, limit), 100)

        try:
            results = usda_reader.search_foods(query, limit=limit, data_type=data_type)
            return jsonify({
                "query": query,
                "count": len(results),
                "results": results
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/api/usda/food/<fdc_id>', methods=['GET'])
    def get_usda_food_details(fdc_id: str):
        """
        Get detailed information about a specific USDA food including all nutrients

        Path params:
            fdc_id: The FDC ID of the food

        Returns:
            Complete food information with nutrients
        """
        print("WTF")
        try:
            food_details = usda_reader.get_food_details(fdc_id)

            if not food_details:
                return jsonify({"error": f"Food with FDC ID {fdc_id} not found"}), 404

            # Optionally add category info
            category_id = food_details.get('food_category_id')
            if category_id:
                category = usda_reader.get_food_category(category_id)
                if category:
                    food_details['category'] = category

            return jsonify(food_details)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/api/usda/food/<fdc_id>/nutrients', methods=['GET'])
    def get_usda_food_nutrients(fdc_id: str):
        """
        Get list of nutrients for a specific USDA food

        Path params:
            fdc_id: The FDC ID of the food

        Returns:
            List of nutrients with their amounts, units, and daily values
        """
        try:
            nutrients = usda_reader.get_food_nutrients(fdc_id)

            if not nutrients:
                # Check if the food exists at all
                food_details = usda_reader.get_food_details(fdc_id)
                if not food_details:
                    return jsonify({"error": f"Food with FDC ID {fdc_id} not found"}), 404

                # Food exists but has no nutrients
                return jsonify({
                    "fdc_id": fdc_id,
                    "count": 0,
                    "nutrients": []
                })

            return jsonify({
                "fdc_id": fdc_id,
                "count": len(nutrients),
                "nutrients": nutrients
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/api/usda/apply', methods=['POST'])
    def apply_usda_to_ingredient():
        """
        Apply USDA nutrition data to an existing ingredient

        Body params:
            ingredient_id: ID of the ingredient to update (required)
            fdc_id: USDA FDC ID to pull data from (required)
            overwrite: Whether to overwrite existing compositions (default: false)

        Returns:
            Updated ingredient with new compositions
        """
        try:
            data = request.get_json()

            if not data:
                return jsonify({"error": "Request body is required"}), 400

            ingredient_id = data.get('ingredient_id')
            fdc_id = data.get('fdc_id')
            overwrite = data.get('overwrite', False)

            if not ingredient_id:
                return jsonify({"error": "ingredient_id is required"}), 400

            if not fdc_id:
                return jsonify({"error": "fdc_id is required"}), 400

            # Get the ingredient
            ingredient = db.session.query(Ingredient).filter_by(_id=ingredient_id).first()
            if not ingredient:
                return jsonify({"error": f"Ingredient with ID {ingredient_id} not found"}), 404

            # Get USDA food details
            food_details = usda_reader.get_food_details(fdc_id)
            if not food_details:
                return jsonify({"error": f"USDA food with FDC ID {fdc_id} not found"}), 404

            # If overwrite is True, delete existing USDA-sourced compositions
            if overwrite:
                db.session.query(IngredientComposition).filter_by(
                    ingredient_id=ingredient_id,
                    source='USDA'
                ).delete()

            # Add new compositions from USDA data
            nutrients = food_details.get('nutrients', [])
            added_count = 0

            for nutrient in nutrients:
                # Skip nutrients with no amount
                if not nutrient['amount'] or nutrient['amount'] == 0:
                    continue

                # Check if this nutrient already exists (if not overwriting)
                if not overwrite:
                    existing = db.session.query(IngredientComposition).filter_by(
                        ingredient_id=ingredient_id,
                        name=nutrient['name'],
                        source='USDA'
                    ).first()

                    if existing:
                        continue

                # Create new composition entry
                composition = IngredientComposition(
                    ingredient_id=ingredient_id,
                    kind='nutrient',
                    name=nutrient['name'],
                    quantity=nutrient['amount'],
                    unit=nutrient['unit'],
                    daily_value=nutrient.get('percent_daily_value', 0.0),
                    source='USDA',
                    extension={
                        'fdc_id': fdc_id,
                        'usda_description': food_details['description'],
                        'nutrient_id': nutrient['nutrient_id']
                    }
                )

                db.session.add(composition)
                added_count += 1

            db.session.commit()

            # Return updated ingredient
            updated_ingredient = db.session.query(Ingredient).filter_by(_id=ingredient_id).first()

            return jsonify({
                "success": True,
                "ingredient": updated_ingredient.to_json(),
                "added_compositions": added_count,
                "usda_food": food_details['description'],
                "fdc_id": fdc_id
            })

        except Exception as e:
            db.session.rollback()
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route('/api/usda/nutrient-list', methods=['GET'])
    def get_usda_nutrient_list():
        """
        Get list of all available nutrients in USDA database

        Returns:
            List of nutrients with their IDs, names, and units
        """
        try:
            nutrients = []
            with open(usda_reader.nutrient_csv, 'r', encoding='utf-8') as f:
                import csv
                reader = csv.DictReader(f)
                for row in reader:
                    nutrients.append({
                        'id': row['id'],
                        'name': row['name'],
                        'unit': row['unit_name'],
                        'nutrient_nbr': row.get('nutrient_nbr', '')
                    })

            return jsonify({
                "count": len(nutrients),
                "nutrients": nutrients
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
