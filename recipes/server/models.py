from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, Text, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Association tables for many-to-many relationships
recipe_ingredients = Table(
    'recipe_ingredients',
    Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes._id')),
    Column('ingredient_id', Integer, ForeignKey('ingredients._id')),
    Column('quantity', Float),
    Column('unit', String(50))
)

recipe_categories = Table(
    'recipe_categories',
    Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes._id')),
    Column('category_id', Integer, ForeignKey('categories._id'))
)

class User(Base):
    __tablename__ = 'users'

    _id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    recipes = relationship('Recipe', back_populates='author')

    def __repr__(self):
        return f'<User {self.username}>'

    def to_json(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            # 'recipes': [recipe.to_json() for recipe in self.recipes] if self.recipes else []
        }

class Recipe(Base):
    __tablename__ = 'recipes'

    _id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(Text)
    
    # [image, image, image]
    images = Column(JSON)

    # [{"step": "string", "description": "string", "duration": "string", "image": "string"}]
    instructions = Column(JSON, nullable=False)

    prep_time = Column(Integer)  # in minutes
    cook_time = Column(Integer)  # in minutes
    servings = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    author_id = Column(Integer, ForeignKey('users._id'))

    extension = Column(JSON)

    # Relationships
    author = relationship('User', back_populates='recipes')
    ingredients = relationship('Ingredient', secondary=recipe_ingredients, back_populates='recipes')
    categories = relationship('Category', secondary=recipe_categories, back_populates='recipes')

    def __repr__(self):
        return f'<Recipe {self.title}>'

    def to_json(self):
        return {
            'id': self._id,
            'title': self.title,
            'description': self.description,
            'instructions': self.instructions,
            'prep_time': self.prep_time,
            'cook_time': self.cook_time,
            'servings': self.servings,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'author_id': self.author_id,
            'extension': self.extension,

            'ingredients': [ingredient.to_json() for ingredient in self.ingredients] if self.ingredients else [],
            'categories': [category.to_json() for category in self.categories] if self.categories else []
        }

class Ingredient(Base):
    __tablename__ = 'ingredients'

    _id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)

    calories = Column(Float)    # Calories per 100g or per unit
    density = Column(Float)     # Density in g/ml  | Used for conversions

    extension = Column(JSON)    # Additional info as JSON

    # Relationships
    recipes = relationship('Recipe', 
                           secondary=recipe_ingredients, back_populates='ingredients')

    def __repr__(self):
        return f'<Ingredient {self.name}>'

    def to_json(self):
        return {
            'id': self._id,
            'name': self.name,
            'description': self.description,
            'calories': self.calories,
            'density': self.density,
            'extension': self.extension
        }

class Category(Base):
    __tablename__ = 'categories'

    _id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    extension = Column(JSON)

    # Relationships
    recipes = relationship('Recipe', secondary=recipe_categories, back_populates='categories')

    def __repr__(self):
        return f'<Category {self.name}>'

    def to_json(self):
        return {
            'id': self._id,
            'name': self.name,
            'description': self.description,
            'extension': self.extension
        }




# Table for unit conversions
class UnitConversion(Base):
    __tablename__ = 'unit_conversions'

    _id = Column(Integer, primary_key=True)
    from_unit = Column(String(50), nullable=False)
    to_unit = Column(String(50), nullable=False)
    conversion_factor = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    ingredient_id = Column(Integer, ForeignKey('ingredients._id'), nullable=True)

    extension = Column(JSON)

    ingredient = relationship('Ingredient')

    def to_json(self):
        return {
            'id': self._id,
            'from_unit': self.from_unit,
            'to_unit': self.to_unit,
            'conversion_factor': self.conversion_factor,
            'category': self.category,
            'ingredient_id': self.ingredient_id,
            'extension': self.extension
        }
