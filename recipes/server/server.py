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
from .models import Base, Recipe, Ingredient, Category, UnitConversion, convert, RecipeIngredient, Event, Task, SubTask

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

STATIC_FOLDER_DEFAULT = os.path.join(ROOT, 'static')
STATIC_FOLDER = os.path.abspath(os.getenv("FLASK_STATIC", STATIC_FOLDER_DEFAULT))
STATIC_UPLOAD_FOLDER = os.path.join(STATIC_FOLDER, 'uploads')


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

        # Allowed file extensions
        self.ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

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

        # Tasks endpoints
        @self.app.route('/tasks', methods=['GET'])
        def get_tasks() -> Dict[str, Any]:
            try:
                tasks = self.db.session.query(Task).order_by(Task.priority.desc(), Task._id).all()
                return jsonify([task.to_json() for task in tasks])
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/tasks', methods=['POST'])
        def create_task() -> Dict[str, Any]:
            try:
                data = request.get_json()

                task = Task(
                    title=data.get('title'),
                    description=data.get('description'),
                    datetime_deadline=datetime.fromisoformat(data.get('datetime_deadline').replace('Z', '+00:00')) if data.get('datetime_deadline') else None,
                    done=data.get('done', False),
                    price_budget=data.get('price_budget'),
                    price_real=data.get('price_real'),
                    people_count=data.get('people_count'),
                    template=data.get('template', False),
                    recuring=data.get('recuring', False),
                    active=data.get('active', True)
                )

                self.db.session.add(task)
                self.db.session.commit()

                return jsonify(task.to_json()), 201
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/tasks/<int:task_id>', methods=['GET'])
        def get_task(task_id: int) -> Dict[str, Any]:
            try:
                task = self.db.session.query(Task).get(task_id)
                if task:
                    return jsonify(task.to_json())
                else:
                    return jsonify({"error": "Task not found"}), 404
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/tasks/<int:task_id>', methods=['PUT'])
        def update_task(task_id: int) -> Dict[str, Any]:
            try:
                task = self.db.session.query(Task).get(task_id)
                if not task:
                    return jsonify({"error": "Task not found"}), 404

                data = request.get_json()

                task.title = data.get('title', task.title)
                task.description = data.get('description', task.description)
                if data.get('datetime_deadline'):
                    task.datetime_deadline = datetime.fromisoformat(data.get('datetime_deadline').replace('Z', '+00:00'))
                task.done = data.get('done', task.done)
                task.priority = data.get('priority', task.priority)
                task.price_budget = data.get('price_budget', task.price_budget)
                task.price_real = data.get('price_real', task.price_real)
                task.people_count = data.get('people_count', task.people_count)
                task.template = data.get('template', task.template)
                task.recuring = data.get('recuring', task.recuring)
                task.active = data.get('active', task.active)

                self.db.session.commit()
                return jsonify({})
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/tasks/<int:task_id>', methods=['DELETE'])
        def delete_task(task_id: int) -> Dict[str, Any]:
            try:
                task = self.db.session.query(Task).get(task_id)
                if not task:
                    return jsonify({"error": "Task not found"}), 404

                self.db.session.delete(task)
                self.db.session.commit()

                return jsonify({"message": "Task deleted successfully"})
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        # Subtasks endpoints
        @self.app.route('/subtasks', methods=['GET'])
        def get_subtasks() -> Dict[str, Any]:
            try:
                subtasks = self.db.session.query(SubTask).all()
                return jsonify([subtask.to_json() for subtask in subtasks])
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/subtasks', methods=['POST'])
        def create_subtask() -> Dict[str, Any]:
            try:
                data = request.get_json()

                subtask = SubTask(
                    parent_id=data.get('parent_id'),
                    child_id=data.get('child_id')
                )

                self.db.session.add(subtask)
                self.db.session.commit()

                return jsonify(subtask.to_json()), 201
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        # Events endpoints
        @self.app.route('/events', methods=['GET'])
        def get_events() -> Dict[str, Any]:
            try:
                start_date = request.args.get('start')
                end_date = request.args.get('end')

                query = self.db.session.query(Event)

                # If no dates provided, default to current week
                if not start_date and not end_date:
                    today = datetime.now()
                    # Get Monday of current week
                    days_since_monday = today.weekday()
                    monday = today - timedelta(days=days_since_monday)
                    start_date = monday.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
                    # Get Sunday of current week
                    sunday = monday + timedelta(days=6)
                    end_date = sunday.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()

                if start_date and end_date:
                    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    query = query.filter(
                        Event.datetime_start >= start_dt,
                        Event.datetime_end <= end_dt
                    )

                events = query.all()
                return jsonify([event.to_json() for event in events])
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/events', methods=['POST'])
        def create_event() -> Dict[str, Any]:
            try:
                data = request.get_json()

                event = Event(
                    title=data.get('title'),
                    description=data.get('description'),
                    datetime_start=datetime.fromisoformat(data.get('datetime_start').replace('Z', '+00:00')),
                    datetime_end=datetime.fromisoformat(data.get('datetime_end').replace('Z', '+00:00')),
                    location=data.get('location'),
                    color=data.get('color', '#3182CE'),
                    kind=data.get('kind', 1),
                    done=data.get('done', False),
                    price_budget=data.get('price_budget'),
                    price_real=data.get('price_real'),
                    people_count=data.get('people_count'),
                    active=data.get('active', True)
                )

                self.db.session.add(event)
                self.db.session.commit()

                return jsonify(event.to_json()), 201
            except Exception as e:
                traceback.print_exc()
                return jsonify({"error": str(e)}), 500

        @self.app.route('/events/<int:event_id>', methods=['GET'])
        def get_event(event_id: int) -> Dict[str, Any]:
            try:
                event = self.db.session.query(Event).get(event_id)
                if event:
                    return jsonify(event.to_json())
                else:
                    return jsonify({"error": "Event not found"}), 404
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/events/<int:event_id>', methods=['PUT'])
        def update_event(event_id: int) -> Dict[str, Any]:
            try:
                event = self.db.session.query(Event).get(event_id)
                if not event:
                    return jsonify({"error": "Event not found"}), 404

                data = request.get_json()

                event.title = data.get('title', event.title)
                event.description = data.get('description', event.description)
                if data.get('datetime_start'):
                    event.datetime_start = datetime.fromisoformat(data.get('datetime_start').replace('Z', '+00:00'))
                if data.get('datetime_end'):
                    event.datetime_end = datetime.fromisoformat(data.get('datetime_end').replace('Z', '+00:00'))
                event.location = data.get('location', event.location)
                event.color = data.get('color', event.color)
                event.kind = data.get('kind', event.kind)
                event.done = data.get('done', event.done)
                event.price_budget = data.get('price_budget', event.price_budget)
                event.price_real = data.get('price_real', event.price_real)
                event.people_count = data.get('people_count', event.people_count)
                event.active = data.get('active', event.active)

                self.db.session.commit()

                return jsonify(event.to_json())
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/events/<int:event_id>', methods=['DELETE'])
        def delete_event(event_id: int) -> Dict[str, Any]:
            try:
                event = self.db.session.query(Event).get(event_id)
                if not event:
                    return jsonify({"error": "Event not found"}), 404

                self.db.session.delete(event)
                self.db.session.commit()

                return jsonify({"message": "Event deleted successfully"})
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/recipes', methods=['GET'])
        def get_recipes() -> Dict[str, Any]:
            recipes = self.db.session.query(Recipe).all()
            return jsonify([recipe.to_json() for recipe in recipes])

        @self.app.route('/recipes', methods=['POST'])
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

                self.db.session.add(recipe)
                self.db.session.flush()  # Get the ID

                # Handle ingredients if provided
                if 'ingredients' in data:
                    for ing_data in data['ingredients']:
                        # Find or create ingredient
                        ingredient = self.db.session.query(Ingredient).filter_by(name=ing_data['name']).first()
                        if not ingredient:
                            ingredient = Ingredient(name=ing_data['name'])
                            self.db.session.add(ingredient)
                            self.db.session.flush()

                        # Create RecipeIngredient with quantity and unit
                        recipe_ingredient = RecipeIngredient(
                            recipe_id=recipe._id,
                            ingredient_id=ingredient._id,
                            quantity=ing_data.get('quantity', 1.0),
                            unit=ing_data.get('unit', 'piece')
                        )
                        self.db.session.add(recipe_ingredient)

                # Handle categories if provided
                if 'categories' in data:
                    for cat_data in data['categories']:
                        # Skip categories with negative IDs (temporary frontend IDs)
                        if cat_data.get('id', 0) < 0:
                            # Find or create category by name
                            category = self.db.session.query(Category).filter_by(name=cat_data['name']).first()
                            if not category:
                                category = Category(
                                    name=cat_data['name'],
                                    description=cat_data.get('description', '')
                                )
                                self.db.session.add(category)
                                self.db.session.flush()

                            recipe.categories.append(category)
                        else:
                            # Existing category with real ID
                            category = self.db.session.get(Category, cat_data['id'])
                            if category:
                                recipe.categories.append(category)

                self.db.session.commit()
                return jsonify(recipe.to_json()), 201

            except Exception as e:
                self.db.session.rollback()
                return jsonify({"error": str(e)}), 400

        @self.app.route('/recipes/<int:recipe_id>', methods=['GET'])
        def get_recipe(recipe_id: int) -> Dict[str, Any]:
            recipe = self.db.session.get(Recipe, recipe_id)
            if not recipe:
                return jsonify({"error": "Recipe not found"}), 404
            return jsonify(recipe.to_json())

        @self.app.route('/recipes/<string:recipe_name>', methods=['GET'])
        def get_recipe_by_name(recipe_name: str) -> Dict[str, Any]:
            # Replace hyphens with spaces for URL-friendly names
            formatted_name = recipe_name.replace('-', ' ')
            recipe = self.db.session.query(Recipe).filter(Recipe.title.ilike(f"%{formatted_name}%")).first()
            if not recipe:
                return jsonify({"error": "Recipe not found"}), 404
            return jsonify(recipe.to_json())

        @self.app.route('/recipes/<int:recipe_id>', methods=['PUT'])
        def update_recipe(recipe_id: int) -> Dict[str, Any]:
            try:
                recipe = self.db.session.get(Recipe, recipe_id)
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
                        self.db.session.delete(recipe_ingredient)

                    for ing_data in data['ingredients']:
                        # Find or create ingredient
                        ingredient = self.db.session.query(Ingredient).filter_by(name=ing_data['name']).first()
                        if not ingredient:
                            ingredient = Ingredient(name=ing_data['name'])
                            self.db.session.add(ingredient)
                            self.db.session.flush()

                        # Create new RecipeIngredient with quantity and unit
                        recipe_ingredient = RecipeIngredient(
                            recipe_id=recipe._id,
                            ingredient_id=ingredient._id,
                            quantity=ing_data.get('quantity', 1.0),
                            unit=ing_data.get('unit', 'piece')
                        )
                        self.db.session.add(recipe_ingredient)

                # Handle categories update
                if 'categories' in data:
                    recipe.categories.clear()
                    for cat_data in data['categories']:
                        # Skip categories with negative IDs (temporary frontend IDs)
                        if cat_data.get('id', 0) < 0:
                            # Find or create category by name
                            category = self.db.session.query(Category).filter_by(name=cat_data['name']).first()
                            if not category:
                                category = Category(
                                    name=cat_data['name'],
                                    description=cat_data.get('description', '')
                                )
                                self.db.session.add(category)
                                self.db.session.flush()

                            recipe.categories.append(category)
                        else:
                            # Existing category with real ID
                            category = self.db.session.get(Category, cat_data['id'])
                            if category:
                                recipe.categories.append(category)

                self.db.session.commit()
                return jsonify(recipe.to_json())

            except Exception as e:
                self.db.session.rollback()
                return jsonify({"error": str(e)}), 400

        @self.app.route('/recipes/<int:recipe_id>', methods=['DELETE'])
        def delete_recipe(recipe_id: int) -> Dict[str, Any]:
            try:
                recipe = self.db.session.get(Recipe, recipe_id)
                if not recipe:
                    return jsonify({"error": "Recipe not found"}), 404

                self.db.session.delete(recipe)
                self.db.session.commit()
                return jsonify({"message": "Recipe deleted successfully"})

            except Exception as e:
                self.db.session.rollback()
                return jsonify({"error": str(e)}), 400

        @self.app.route('/ingredients', methods=['GET'])
        def get_ingredients() -> Dict[str, Any]:
            ingredients = self.db.session.query(Ingredient).all()
            return jsonify([ingredient.to_json() for ingredient in ingredients])

        @self.app.route('/ingredients', methods=['POST'])
        def create_ingredient() -> Dict[str, Any]:
            try:
                data = request.get_json()
                ingredient = Ingredient(**data)
                self.db.session.add(ingredient)
                self.db.session.commit()
                return jsonify(ingredient.to_json()), 201
            except Exception as e:
                self.db.session.rollback()
                return jsonify({"error": str(e)}), 400

        @self.app.route('/ingredients/<int:ingredient_id>', methods=['GET'])
        def get_ingredient(ingredient_id: int) -> Dict[str, Any]:
            ingredient = self.db.session.get(Ingredient, ingredient_id)
            if not ingredient:
                return jsonify({"error": "Ingredient not found"}), 404
            return jsonify(ingredient.to_json())

        @self.app.route('/ingredients/<string:ingredient_name>', methods=['GET'])
        def get_ingredient_by_name(ingredient_name: str) -> Dict[str, Any]:
            # Replace hyphens with spaces for URL-friendly names
            formatted_name = ingredient_name.replace('-', ' ')
            ingredient = self.db.session.query(Ingredient).filter(Ingredient.name.ilike(f"%{formatted_name}%")).first()
            if not ingredient:
                return jsonify({"error": "Ingredient not found"}), 404
            return jsonify(ingredient.to_json())

        @self.app.route('/ingredients/<int:ingredient_id>', methods=['PUT'])
        def update_ingredient(ingredient_id: int) -> Dict[str, Any]:
            try:
                ingredient = self.db.session.get(Ingredient, ingredient_id)
                if not ingredient:
                    return jsonify({"error": "Ingredient not found"}), 404

                data = request.get_json()

                # Update ingredient fields
                ingredient.name = data.get('name', ingredient.name)
                ingredient.description = data.get('description', ingredient.description)
                ingredient.calories = data.get('calories', ingredient.calories)
                ingredient.density = data.get('density', ingredient.density)
                ingredient.extension = data.get('extension', ingredient.extension)

                self.db.session.commit()
                return jsonify(ingredient.to_json())

            except Exception as e:
                self.db.session.rollback()
                return jsonify({"error": str(e)}), 400

        @self.app.route('/ingredients/<int:ingredient_id>', methods=['DELETE'])
        def delete_ingredient(ingredient_id: int) -> Dict[str, Any]:
            try:
                ingredient = self.db.session.get(Ingredient, ingredient_id)
                if not ingredient:
                    return jsonify({"error": "Ingredient not found"}), 404

                # Check if ingredient is used in any recipes
                recipe_count = self.db.session.query(RecipeIngredient).filter_by(ingredient_id=ingredient_id).count()
                if recipe_count > 0:
                    return jsonify({"error": f"Cannot delete ingredient. It is used in {recipe_count} recipe(s)."}), 400

                self.db.session.delete(ingredient)
                self.db.session.commit()
                return jsonify({"message": "Ingredient deleted successfully"})

            except Exception as e:
                self.db.session.rollback()
                return jsonify({"error": str(e)}), 400

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

        @self.app.route('/unit/conversions', methods=['GET'])
        def get_unit_conversions() -> Dict[str, Any]:
            conversions = self.db.session.query(UnitConversion).all()
            return jsonify([conversion.to_json() for conversion in conversions])

        @self.app.route('/unit/conversions', methods=['POST'])
        def create_unit_conversion() -> Dict[str, Any]:
            try:
                data = request.get_json()
                conversion = UnitConversion(
                    from_unit=data.get('from_unit'),
                    to_unit=data.get('to_unit'),
                    conversion_factor=data.get('conversion_factor'),
                    category=data.get('category', 'custom'),
                    ingredient_id=data.get('ingredient_id') if data.get('ingredient_id') else None
                )
                self.db.session.add(conversion)
                self.db.session.commit()
                return jsonify(conversion.to_json()), 201
            except Exception as e:
                self.db.session.rollback()
                return jsonify({"error": str(e)}), 400

        @self.app.route('/unit/conversions/<int:conversion_id>', methods=['GET'])
        def get_unit_conversion(conversion_id: int) -> Dict[str, Any]:
            conversion = self.db.session.get(UnitConversion, conversion_id)
            if not conversion:
                return jsonify({"error": "Unit conversion not found"}), 404
            return jsonify(conversion.to_json())

        @self.app.route('/unit/conversions/<int:conversion_id>', methods=['PUT'])
        def update_unit_conversion(conversion_id: int) -> Dict[str, Any]:
            try:
                conversion = self.db.session.get(UnitConversion, conversion_id)
                if not conversion:
                    return jsonify({"error": "Unit conversion not found"}), 404

                data = request.get_json()

                # Update conversion fields
                conversion.from_unit = data.get('from_unit', conversion.from_unit)
                conversion.to_unit = data.get('to_unit', conversion.to_unit)
                conversion.conversion_factor = data.get('conversion_factor', conversion.conversion_factor)
                conversion.category = data.get('category', conversion.category)
                conversion.ingredient_id = data.get('ingredient_id') if data.get('ingredient_id') else None

                self.db.session.commit()
                return jsonify(conversion.to_json())

            except Exception as e:
                self.db.session.rollback()
                return jsonify({"error": str(e)}), 400

        @self.app.route('/unit/conversions/<int:conversion_id>', methods=['DELETE'])
        def delete_unit_conversion(conversion_id: int) -> Dict[str, Any]:
            try:
                conversion = self.db.session.get(UnitConversion, conversion_id)
                if not conversion:
                    return jsonify({"error": "Unit conversion not found"}), 404

                self.db.session.delete(conversion)
                self.db.session.commit()
                return jsonify({"message": "Unit conversion deleted successfully"})

            except Exception as e:
                self.db.session.rollback()
                return jsonify({"error": str(e)}), 400

        @self.app.route('/units/available/<int:ingredient_id>/<string:from_unit>', methods=['GET'])
        def available_units(ingredient_id: int, from_unit: str) -> Dict[str, Any]:
            conversions = self.db.session.query(UnitConversion).filter(
                UnitConversion.ingredient_id == ingredient_id,
                UnitConversion.from_unit == from_unit
            ).all()
            conv = [conversion.to_unit for conversion in conversions]
            return jsonify(conv)

        @self.app.route('/unit/conversions/<int:ingredient_id>/<string:from_unit>/<string:to_unit>')
        def convert_unit(ingredient_id: int, from_unit: str, to_unit: str) -> Dict[str, Any]:
            # Get quantity from query parameters, default to 1.0
            quantity = float(request.args.get('quantity', 1.0))

            conversion = convert(
                self.db.session,
                RecipeIngredient(
                    ingredient_id=ingredient_id,
                    quantity=quantity,
                    unit=from_unit
                ),
                to_unit
            )
            return jsonify({
                "quantity": conversion,
                "unit": to_unit,
                "ingredient_id": ingredient_id,
                "original_quantity": quantity,
                "original_unit": from_unit
            })

        @self.app.route('/ingredients/<int:ingredient_id>/conversion-matrix', methods=['GET'])
        def get_conversion_matrix(ingredient_id: int) -> Dict[str, Any]:
            """Get conversion matrix for an ingredient with volume units as rows and weight units as columns"""
            try:
                # Check if ingredient exists
                ingredient = self.db.session.get(Ingredient, ingredient_id)
                if not ingredient:
                    return jsonify({"error": "Ingredient not found"}), 404

                # Define unit categories
                volume_units = ['ml', 'cl', 'l', 'cm3', 'fl oz', 'tbsp', 'tsp', 'cup', 'pint', 'quart', 'gallon']
                weight_units = ['g', 'kg', 'mg', 'lb', 'oz']

                # Build conversion matrix
                matrix = {
                    'ingredient': ingredient.to_json(),
                    'volume_units': volume_units,
                    'weight_units': weight_units,
                    'conversions': {}
                }

                # For each volume unit (rows)
                for vol_unit in volume_units:
                    matrix['conversions'][vol_unit] = {}

                    # For each weight unit (columns)
                    for weight_unit in weight_units:
                        try:
                            # Create a temporary RecipeIngredient to use conversion function
                            temp_ingredient = RecipeIngredient(
                                ingredient_id=ingredient_id,
                                quantity=1.0,  # Use 1 unit as base
                                unit=vol_unit
                            )

                            # Try to convert from volume to weight
                            converted_quantity = convert(self.db.session, temp_ingredient, weight_unit)

                            if converted_quantity is not None:
                                matrix['conversions'][vol_unit][weight_unit] = round(converted_quantity, 6)
                            else:
                                matrix['conversions'][vol_unit][weight_unit] = None

                        except Exception as e:
                            matrix['conversions'][vol_unit][weight_unit] = None

                return jsonify(matrix)

            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/ingredients/<int:ingredient_id>/units-used', methods=['GET'])
        def get_ingredient_units_used(ingredient_id: int) -> Dict[str, Any]:
            """Get all units used for a specific ingredient across recipes"""
            try:
                # Check if ingredient exists
                ingredient = self.db.session.get(Ingredient, ingredient_id)
                if not ingredient:
                    return jsonify({"error": "Ingredient not found"}), 404

                # Get all units used for this ingredient in recipes
                recipe_ingredients = self.db.session.query(RecipeIngredient).filter_by(ingredient_id=ingredient_id).all()

                # Count usage of each unit
                unit_usage = {}
                recipe_names = {}

                for recipe_ingredient in recipe_ingredients:
                    unit = recipe_ingredient.unit
                    if unit:
                        if unit not in unit_usage:
                            unit_usage[unit] = 0
                            recipe_names[unit] = []
                        unit_usage[unit] += 1

                        # Get recipe name for this usage
                        if recipe_ingredient.recipe:
                            recipe_names[unit].append(recipe_ingredient.recipe.title)

                # Get all available units from conversions for reference
                conversion_units_from = self.db.session.query(UnitConversion.from_unit).distinct().all()
                conversion_units_to = self.db.session.query(UnitConversion.to_unit).distinct().all()

                all_conversion_units = set()
                for unit in conversion_units_from:
                    if unit[0]:
                        all_conversion_units.add(unit[0])
                for unit in conversion_units_to:
                    if unit[0]:
                        all_conversion_units.add(unit[0])

                # For each unit used, check which conversions already exist
                existing_conversions = {}
                for unit in unit_usage.keys():
                    conversions_from_unit = self.db.session.query(UnitConversion).filter(
                        UnitConversion.from_unit == unit,
                        UnitConversion.ingredient_id == ingredient_id
                    ).all()

                    existing_conversions[unit] = [conv.to_unit for conv in conversions_from_unit]

                return jsonify({
                    'ingredient': ingredient.to_json(),
                    'units_used': sorted(unit_usage.keys()),
                    'unit_usage_count': unit_usage,
                    'recipe_names': recipe_names,
                    'existing_conversions': existing_conversions,
                    'all_available_units': sorted(list(all_conversion_units)),
                    'total_uses': sum(unit_usage.values())
                })

            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/units/used-in-recipes', methods=['GET'])
        def get_units_used_in_recipes() -> Dict[str, Any]:
            """Get all units currently used in recipe ingredients"""
            try:
                # Query all unique units from recipe ingredients
                recipe_units = self.db.session.query(RecipeIngredient.unit).distinct().all()
                units_from_recipes = [unit[0] for unit in recipe_units if unit[0]]

                # Get all available units from unit conversions for reference
                conversion_units_from = self.db.session.query(UnitConversion.from_unit).distinct().all()
                conversion_units_to = self.db.session.query(UnitConversion.to_unit).distinct().all()

                all_conversion_units = set()
                for unit in conversion_units_from:
                    if unit[0]:
                        all_conversion_units.add(unit[0])
                for unit in conversion_units_to:
                    if unit[0]:
                        all_conversion_units.add(unit[0])

                # Get units used in recipes with their usage count
                unit_usage = {}
                for unit in units_from_recipes:
                    count = self.db.session.query(RecipeIngredient).filter_by(unit=unit).count()
                    unit_usage[unit] = count

                return jsonify({
                    'units_in_recipes': sorted(units_from_recipes),
                    'unit_usage_count': unit_usage,
                    'all_available_units': sorted(list(all_conversion_units)),
                    'total_recipe_ingredients': self.db.session.query(RecipeIngredient).count()
                })

            except Exception as e:
                return jsonify({"error": str(e)}), 500

        def save_original_image(file, filename):
            # Save the original image without modification
            if os.path.exists(self.app.config["ORIGINALS_FOLDER"]):
                original_path = os.path.join(self.app.config["ORIGINALS_FOLDER"], filename)
                folder_path = os.path.dirname(original_path)
                os.makedirs(folder_path, exist_ok=True)

                if os.path.exists(original_path):
                    os.rename(original_path, original_path + '.old')

                file.save(original_path)
            # ---

        def save_production_image(file, namespace, extension):
            try:
                image = Image.open(file.stream)

                path = centercrop_resize_image(
                    self.app.config['UPLOAD_FOLDER'],
                    image,
                    namespace,
                    extension
                )

                return path

            except Exception as err:
                print(err)

        @self.app.route('/upload', methods=['POST'])
        def upload_file() -> Dict[str, Any]:
            """Upload a single image file"""
            # Github file limit
            #    * Soft limit
            #       * With Git:  50 MiB
            #       * With the Browser: 25 MiB
            #    * Hard limit: 100 MiB
            #       * With the Browser: 100 MiB
            try:
                if 'file' not in request.files:
                    return jsonify({"error": "No file provided"}), 400

                file = request.files['file']
                if file.filename == '':
                    return jsonify({"error": "No file selected"}), 400

                if not self.allowed_file(file.filename):
                    return jsonify({"error": "File type not allowed. Please use: png, jpg, jpeg, gif, webp"}), 400

                # Get namespace from form data
                namespace = request.form.get('namespace')

                # Get file extension
                file_extension = file.filename.rsplit('.', 1)[1].lower()

                if namespace:
                    # Use namespace directly as filename with extension
                    filename = f"{namespace}.{file_extension}"

                    save_original_image(file, filename)

                    filename = save_production_image(file, namespace, file_extension)

                    # Return the file URL
                    file_url = f"/uploads/{filename}"

                    return jsonify({
                        "url": file_url,
                        "filename": filename,
                        "folder": ""
                    }), 201
                
                return jsonify({"error": "missing namespace"}), 500
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @self.app.route('/uploads/<path:filepath>')
        def uploaded_file(filepath):
            """Serve uploaded files from recipe-specific folders or direct files"""
            # Split the filepath to get folder and filename
            if '/' in filepath:
                folder, filename = filepath.split('/', 1)
                folder_path = os.path.join(self.app.config['UPLOAD_FOLDER'], folder)
                return send_from_directory(folder_path, filename)
            else:
                # Files saved directly in upload folder (when namespace is used)
                return send_from_directory(self.app.config['UPLOAD_FOLDER'], filepath)

    def allowed_file(self, filename):
        """Check if the file extension is allowed"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.ALLOWED_EXTENSIONS

    def run(self, host: str = '0.0.0.0', port: int = 5000, debug: bool = True) -> None:
        self.app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    app = RecipeApp()
    app.run()
