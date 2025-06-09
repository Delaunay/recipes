from typing import Dict, Any


from flask import Flask, jsonify, request
from sqlalchemy.orm import sessionmaker, scoped_session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

from .models import Base, Recipe, Ingredient, Category, UnitConversion



class RecipeApp:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.config['JSON_SORT_KEYS'] = False
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"

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
            self._seed_data()

        # users = db.session.execute(db.select(User).order_by(User.username)).scalars()
        self.setup_routes()
    
    def _seed_data(self):
        """Add some initial data if the database is empty"""
        if self.db.session.query(Category).count() == 0:
            categories = [
                Category(name="Italian", description="Italian cuisine"),
                Category(name="Main Course", description="Main dishes"),
                Category(name="Dessert", description="Sweet treats"),
                Category(name="Vegetarian", description="Vegetarian dishes"),
                Category(name="Quick & Easy", description="Fast recipes"),
            ]
            for category in categories:
                self.db.session.add(category)

        if self.db.session.query(Ingredient).count() == 0:
            ingredients = [
                Ingredient(name="Pizza dough", description="Fresh pizza dough", calories=266, density=0.8),
                Ingredient(name="Tomato sauce", description="Fresh tomato sauce", calories=35, density=1.0),
                Ingredient(name="Mozzarella cheese", description="Fresh mozzarella", calories=280, density=0.9),
                Ingredient(name="Fresh basil", description="Fresh basil leaves", calories=22, density=0.6),
                Ingredient(name="Olive oil", description="Extra virgin olive oil", calories=884, density=0.92),
            ]
            for ingredient in ingredients:
                self.db.session.add(ingredient)

        self.db.session.commit()
    
    def setup_routes(self):
        @self.app.route('/')
        def home() -> Dict[str, str]:
            return jsonify({"message": "Welcome to the Recipe API"})

        @self.app.route('/health')
        def health_check() -> Dict[str, str]:
            return jsonify({"status": "healthy"})

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
                        
                        recipe.ingredients.append(ingredient)
                
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
                    recipe.ingredients.clear()
                    for ing_data in data['ingredients']:
                        ingredient = self.db.session.query(Ingredient).filter_by(name=ing_data['name']).first()
                        if not ingredient:
                            ingredient = Ingredient(name=ing_data['name'])
                            self.db.session.add(ingredient)
                            self.db.session.flush()
                        
                        recipe.ingredients.append(ingredient)
                
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

        @self.app.route('/unit-conversions', methods=['GET'])
        def get_unit_conversions() -> Dict[str, Any]:
            conversions = self.db.session.query(UnitConversion).all()
            return jsonify([conversion.to_json() for conversion in conversions])

    def run(self, host: str = '0.0.0.0', port: int = 5000, debug: bool = True) -> None:
        self.app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    app = RecipeApp()
    app.run()
