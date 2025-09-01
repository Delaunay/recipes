from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, Text, UniqueConstraint, JSON, create_engine, select, Boolean
from sqlalchemy.orm import relationship, sessionmaker, declarative_base

Base = declarative_base()


#
# Calendar
#
#
#   How tp handle recuring events ?
#       We can generate events as the time passes
#
#   Generate Task list based on Events ?
#   Prioritized ?
#
#
# Template Day/week ?
#       Winter / Summer / Spring / Fall
#
#   Event is time based, blocks the time
#       they can have task attached to it
#
#   Tasks are things to do but they are not necessarily attached to
#   time to do it
#


#
#   The TODO list is a combination of Event and tasks
#

class Event(Base):
    __tablename__ = 'events'

    # To display a calaender
    # Column Week Days
    # Rows Time + Week Count

    _id = Column(Integer, primary_key=True)

    kind = Column(Integer)
    color = Column(String(7))  # Hex color code like #FF0000
    datetime_start = Column(DateTime, nullable=False)
    datetime_end = Column(DateTime, nullable=False)
    location = Column(String(200))
    title = Column(String(100), nullable=False)
    description = Column(Text)
    guests = Column(JSON)  # List of guest names or IDs

    # Scheduled Task ?
    task = Column(Integer, ForeignKey('tasks._id'), nullable=True)
    done = Column(Boolean, default=False)

    # Budgeting
    price_budget = Column(Float)
    price_real = Column(Float)
    people_count = Column(Integer)

    # Template Event
    template = Column(Boolean, default=False)
    recuring = Column(Boolean, default=False)
    active = Column(Boolean, default=True)

    extension = Column(JSON)

    # Relationships
    # task = relationship('Task', back_populates='events')

    def __repr__(self):
        return f'<Event {self.title}>'

    def to_json(self):
        return {
            'id': self._id,
            'kind': self.kind,
            'color': self.color,
            'datetime_start': self.datetime_start.isoformat() + 'Z' if self.datetime_start else None,
            'datetime_end': self.datetime_end.isoformat() + 'Z' if self.datetime_end else None,
            'location': self.location,
            'title': self.title,
            'description': self.description,
            'guests': self.guests,
            'task': self.task,
            'done': self.done,
            'price_budget': self.price_budget,
            'price_real': self.price_real,
            'people_count': self.people_count,
            'template': self.template,
            'recuring': self.recuring,
            'active': self.active
        }


class Task(Base):
    __tablename__ = 'tasks'

    _id = Column(Integer, primary_key=True)

    title = Column(String(100), nullable=False)
    description = Column(Text)
    datetime_deadline = Column(DateTime)
    datetime_done = Column(DateTime)
    done = Column(Boolean, default=False)
    priority = Column(Integer, default=0)

    # Budgeting
    price_budget = Column(Float)
    price_real = Column(Float)
    people_count = Column(Integer)

    # Template Task
    template = Column(Boolean, default=False)
    recuring = Column(Boolean, default=False)
    active = Column(Boolean, default=True)

    #
    extension = Column(JSON)

    # Relationships
    parent_subtasks = relationship('SubTask', foreign_keys='SubTask.parent_id', back_populates='parent')
    child_subtasks = relationship('SubTask', foreign_keys='SubTask.child_id', back_populates='child')

    def __repr__(self):
        return f'<Task {self.title}>'

    def to_json(self):
        return {
            'id': self._id,
            'title': self.title,
            'description': self.description,
            'datetime_deadline': self.datetime_deadline.isoformat() if self.datetime_deadline else None,
            'done': self.done,
            'price_budget': self.price_budget,
            'price_real': self.price_real,
            'people_count': self.people_count,
            'template': self.template,
            'recuring': self.recuring,
            'active': self.active,
            'extension': self.extension,
            "priority": self.priority if self.priority is not None else 0
        }



class SubTask(Base):
    __tablename__ = 'substasks'

    _id = Column(Integer, primary_key=True)
    parent_id = Column(Integer, ForeignKey('tasks._id'), nullable=False)
    child_id = Column(Integer, ForeignKey('tasks._id'), nullable=False)

    # Relationships
    parent = relationship('Task', foreign_keys=[parent_id], back_populates='child_subtasks')
    child = relationship('Task', foreign_keys=[child_id], back_populates='parent_subtasks')

    def __repr__(self):
        return f'<SubTask parent={self.parent_id} child={self.child_id}>'

    def to_json(self):
        return {
            'id': self._id,
            'parent_id': self.parent_id,
            'child_id': self.child_id
        }

#
# Recipe
#


# Recipe ingredients association model
class RecipeIngredient(Base):
    __tablename__ = 'recipe_ingredients'

    _id = Column(Integer, primary_key=True)
    recipe_id = Column(Integer, ForeignKey('recipes._id'), nullable=False)
    ingredient_id = Column(Integer, ForeignKey('ingredients._id'), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)

    # Relationships
    recipe = relationship('Recipe', back_populates='recipe_ingredients')
    ingredient = relationship('Ingredient', back_populates='recipe_ingredients')

    def __repr__(self):
        return f'<RecipeIngredient {self.quantity} {self.unit} of ingredient {self.ingredient_id} in recipe {self.recipe_id}>'

    def to_json(self):
        return {
            # 'id': self._id,
            'recipe_id': self.recipe_id,
            'ingredient_id': self.ingredient_id,
            'quantity': self.quantity,
            'unit': self.unit,
            'name': self.ingredient.name if self.ingredient else None,
            'id': self._id
        }

recipe_categories = Table(
    'recipe_categories',
    Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes._id')),
    Column('category_id', Integer, ForeignKey('categories._id'))
)

composed_recipe_recipes = Table(
    'composed_recipe_recipes',
    Base.metadata,
    Column('composed_recipe_id', Integer, ForeignKey('composed._id')),
    Column('recipe_id', Integer, ForeignKey('recipes._id'))
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


class ComposedRecipe(Base):
    __tablename__ = 'composed'


    _id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(Text)

    # [image, image, image]
    images = Column(JSON)

    prep_time = Column(Integer)  # in minutes
    cook_time = Column(Integer)  # in minutes
    servings = Column(Integer)
    created_at = Column(DateTime, default=datetime.now())
    updated_at = Column(DateTime, default=datetime.now(), onupdate=datetime.now())
    author_id = Column(Integer, ForeignKey('users._id'))

    extension = Column(JSON)

    # steps = relationship('Recipe', back_populates='author')

# Composed recipe map to multiple Recipe
# add a many to many relationship table


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
    recipe_ingredients = relationship('RecipeIngredient', back_populates='recipe')
    categories = relationship('Category', secondary=recipe_categories, back_populates='recipes')

    def __repr__(self):
        return f'<Recipe {self.title}>'

    def to_json(self):
        return {
            'id': self._id,
            'title': self.title,
            'description': self.description,
            'images': self.images if self.images else [],
            'instructions': self.instructions,
            'prep_time': self.prep_time,
            'cook_time': self.cook_time,
            'servings': self.servings,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'author_id': self.author_id,
            'extension': self.extension,

            'ingredients': [ri.to_json() for ri in self.recipe_ingredients] if self.recipe_ingredients else [],
            'categories': [category.to_json() for category in self.categories] if self.categories else []
        }


class IngredientComposition(Base):
    __tablename__ = 'ingredient_compositions'

    _id = Column(Integer, primary_key=True)
    ingredient_id = Column(Integer, ForeignKey('ingredients._id'), nullable=False)

    name = Column(String(50), unique=True, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)

    extension = Column(JSON)

    ingredient = relationship('Ingredient')

    def __repr__(self):
        return f'<IngredientComposition {self.name}>'

    def to_json(self):
        return {
            'id': self._id,
            'ingredient_id': self.ingredient_id,
            'name': self.name,
            'quantity': self.quantity,
            'unit': self.unit,
            'extension': self.extension
        }

class Ingredient(Base):
    __tablename__ = 'ingredients'

    _id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)

    price_high = Column(Float)
    price_low = Column(Float)
    price_medium = Column(Float)
    calories = Column(Float)    # Calories per 100g or per unit
    density = Column(Float)     # Density in g/ml  | Used for conversions

    composition = Column(JSON)
    extension = Column(JSON)    # Additional info as JSON

    # preferred_unit = Column(String(50))
    # unit = Column(String(50))

    # Relationships
    recipe_ingredients = relationship('RecipeIngredient', back_populates='ingredient')
    compositions = relationship('IngredientComposition', back_populates='ingredient')

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


class IngredientSubstitution(Base):
    """Common substitution to handle intolerance of allergies"""
    __tablename__ = 'substitutions'

    _id = Column(Integer, primary_key=True)
    reason = Column(String(50))                             # Reason of the replacement (nut alergy, lactose intolerance)
    original = Column(String(50), nullable=False)           # Original ingredient we want to replace
    replacement = Column(String(50), nullable=False)        # New ingredient replacing it
    ratio = Column(Float, default=1)                        # replacement ratio if not =

    def to_json(self):
        return {
            'id': self._id,
            'reason': self.reason,
            'original': self.original,
            'replacement': self.replacement,
            'ratio': self.ratio,
        }

class Product(Base):
    """Grocery list + prices"""
    __tablename__ = 'products'

    _id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)               # Name of the product
    quantity = Column(Float)                                # Quantity in the package
    unit = Column(String(50))                               # unit of quantity
    price = Column(Float)                                   # price
    organic = Column(Boolean)                               # Organic or not
    created_at = Column(DateTime, default=datetime.utcnow)  # Date of purchase

    def to_json(self):
        return {
            'id': self._id,
            'name': self.name,
            'quantity': self.quantity,
            'unit': self.unit,
            'price': self.price,
            'organic': self.organic,
        }


class ProductInventory(Base):
    """Food currently in inventory, buying things increase the quantity, cooking lowers it"""
    __tablename__ = 'product_inventory'

    _id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)               # Name of the product
    quantity = Column(Float)                                # Current amount in inventory

    # price = Column(Float) += price / qty 

    def to_json(self):
        return {
            'id': self._id,
            'name': self.name,
            'quantity': self.quantity
        }

class IngredientProduct(Base):
    """Match an ingredient to a product"""
    __tablename__ = 'ingredient_product_mapping'

    _id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products._id'), nullable=False)
    ingredient_id = Column(Integer, ForeignKey('ingredients._id'), nullable=False)


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

    def __repr__(self):
        return f'<UnitConversion {self.from_unit}->{self.to_unit} {self.conversion_factor}>'


def common_conversions():
    return {
        # Density
        # Mass/Volume

        # Mass
        # 1g/this = that
        'g': {
            'g': 1,
            'kg': 1000,
            'mg': 0.001,
            'lb': 453.592,
            'oz': 28.3495
        },

        # Volume
        'ml': {
            'ml': 1,
            'cl': 10,
            'l': 1000,
            "cm3": 1,
            'fl oz': 29.5735,
            'tbsp': 14.7868,
            'tsp': 4.92892,
            # 'wineglass': 236.588 / 4,
            # 'teacup': 236.588 / 2,
            'cup': 236.588,
            "pint": 473.176,
            "quart": 946.353,
            "gallon": 3785.
        },
    }


def insert_common_ingredients(session):
    # Drop all existing ingredients
    session.query(Ingredient).delete()
    session.commit()

    ingredients = [
        Ingredient(
            name="Salt",
            description="Salt",
            calories=0,
            density=2.16,
        ),
        Ingredient(
            name="Sugar",
            description="Sugar",
            calories=0,
            density=1.59,
        ),
        Ingredient(
            name="Flour",
            description="Flour",
            calories=0,
            density=0.59,
        ),
        Ingredient(
            name="Butter",
            description="Butter",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Egg",
            description="Egg",
            calories=0,
            density=1.03,
        ),
        Ingredient(
            name="Milk",
            description="Milk",
            calories=0,
            density=1.03,
        ),
        Ingredient(
            name="Water",
            description="Water",
            calories=0,
            density=1.00,
        ),
        Ingredient(
            name="Oil",
            description="Oil",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Pepper",
            description="Pepper",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Garlic",
            description="Garlic",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Onion",
            description="Onion",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Tomato",
            description="Tomato",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Cheese",
            description="Cheese",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Chicken",
            description="Chicken",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Beef",
            description="Beef",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Pork",
            description="Pork",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Fish",
            description="Fish",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Rice",
            description="Rice",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Bread",
            description="Bread",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Potato",
            description="Potato",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Carrot",
            description="Carrot",
            calories=0,
            density=0.92,
        ),
        Ingredient(
            name="Lettuce",
            description="Lettuce",
            calories=0,
            density=0.92,
        )
    ]


    for ingredient in ingredients:
        session.add(ingredient)
        session.commit()


def insert_common_conversions(session):
    session.query(UnitConversion).delete()
    session.commit()

    for unit, conversions in common_conversions().items():
        for to_unit, conversion_factor in conversions.items():
            conv = UnitConversion(
                ingredient_id=None,
                from_unit=unit,
                to_unit=to_unit,
                conversion_factor=1/conversion_factor,
                category="1",
            )
            session.add(conv)
            # print(conv)
            conv = UnitConversion(
                ingredient_id=None,
                from_unit=to_unit,
                to_unit=unit,
                conversion_factor=conversion_factor,
                category="1",
            )
            session.add(conv)
            # print(conv)

    mass = common_conversions()["g"]
    volume = common_conversions()["ml"]

    for ingredient in session.query(Ingredient).all():
        for vol_unit, vol_factor in volume.items():
            for mass_unit, mass_factor in mass.items():

                # ml/vol_unit: conversions
                # g/mass_unit: conversions
                # density = g/ml

                # vol_unit -> mass_unit = (ml/vol) (g/ml) / (g/mass)
                # vol_unit -> mass_unit = (g/vol) * (mass/g)
                # vol_unit -> mass_unit = mass/vol
                conversion = vol_factor * ingredient.density / mass_factor

                conv = UnitConversion(
                    ingredient_id=ingredient._id,
                    from_unit=vol_unit,
                    to_unit=mass_unit,
                    conversion_factor=conversion,
                    category="1",
                )
                session.add(conv)
                # print(conv)

                conv = UnitConversion(
                    ingredient_id=ingredient._id,
                    from_unit=mass_unit,
                    to_unit=vol_unit,
                    conversion_factor=1/conversion,
                    category="1",
                )

                session.add(conv)
                # print(conv)

    session.commit()
            # conv.save()


def available_units(ingredient_id: int, from_unit: str):
    from sqlalchemy import select, or_

    return select(UnitConversion.to_unit).where(
        UnitConversion.from_unit == from_unit,
        or_(
            UnitConversion.ingredient_id == ingredient_id,
            UnitConversion.ingredient_id.is_(None)
        )
    )


#
# conversion logic should be done in the front end
#

def is_volume(unit: str):
    return unit in [
        "ml", "cl", "l", "cm3", "fl oz", "tbsp",
        "tsp", "cup", "pint", "quart", "gallon"
    ]


def make_unit_from_input(sesh, recipe_ingredient: RecipeIngredient):

    if is_volume(recipe_ingredient.unit):
        qty = convert_mass(sesh, recipe_ingredient, "g")

    else:
        qty = convert(sesh, recipe_ingredient, "g")

    return RecipeIngredient(
        recipe_id=recipe_ingredient.recipe_id,
        ingredient_id=recipe_ingredient.ingredient_id,
        quantity=qty,
        unit="g"
    )

def convert_volume(sesh, recipe_ingredient: RecipeIngredient, to_unit: str):
    from sqlalchemy import select, or_

    ingredient = sesh.query(Ingredient).get(recipe_ingredient.ingredient_id)

    vals = select(UnitConversion).where(
        UnitConversion.from_unit == "ml",
        UnitConversion.to_unit == to_unit,
        or_(
            UnitConversion.ingredient_id == recipe_ingredient.ingredient_id,
            UnitConversion.ingredient_id.is_(None)
        )
    )

    vals = sesh.execute(vals)
    vals = vals.all()

    if len(vals) == 0:
        return None

    volume = recipe_ingredient.quantity / ingredient.density
    return volume / vals[0][0].conversion_factor


def convert_mass(sesh, recipe_ingredient: RecipeIngredient, to_unit: str):
    from sqlalchemy import select, or_

    ingredient = sesh.query(Ingredient).get(recipe_ingredient.ingredient_id)

    # 1. Convert volume to ml
    vals = select(UnitConversion).where(
        UnitConversion.from_unit == recipe_ingredient.unit,
        UnitConversion.to_unit == "ml",
        or_(
            UnitConversion.ingredient_id == recipe_ingredient.ingredient_id,
            UnitConversion.ingredient_id.is_(None)
        )
    )

    # 2. Convert ml to mass
    vals = sesh.execute(vals)
    vals = vals.all()

    if len(vals) == 0:
        return None

    volume_ml = recipe_ingredient.quantity / vals[0][0].conversion_factor
    return volume_ml * ingredient.density


def convert(sesh, recipe_ingredient: RecipeIngredient, to_unit: str):
    from sqlalchemy import select, or_

    vals = select(UnitConversion).where(
        UnitConversion.from_unit == recipe_ingredient.unit,
        UnitConversion.to_unit == to_unit,
        or_(
            UnitConversion.ingredient_id == recipe_ingredient.ingredient_id,
            # UnitConversion.ingredient_id.is_(None)
        )
    )

    vals = sesh.execute(vals)
    vals = vals.all()

    if len(vals) == 0:
        return None

    return recipe_ingredient.quantity * vals[0][0].conversion_factor


def main():
    from sqlalchemy.orm import sessionmaker, scoped_session

    # open the instance/project.db with SQLAlchemy and insert the common conversions
    engine = create_engine('sqlite:///instance/project.db')
    Session = sessionmaker(bind=engine)

    with Session() as session:
        insert_common_ingredients(session)
        insert_common_conversions(session)


    # with Session() as session:
    #     result = session.query(UnitConversion).all()
    #     print(result)


    # if we always save by mass we can convert to volume using the density

    with Session() as session:

        smt = select(Ingredient).where(Ingredient.name == "Flour")
        ingredient_id = session.execute(smt).scalar()._id

        stmt = available_units(ingredient_id, "g")
        result = session.execute(stmt)

        data = []
        for result in result.all():
            result = result[0]
            data.append(result)

        print(data)

        # for u in data:
            # print(convert(
            #     session,
            #     RecipeIngredient(
            #         recipe_id=None,
            #         ingredient_id=None,
            #         quantity=1,
            #         unit="g",
            #     ),
            #     u
            # ), u)

            # print("Volume")
            # print(convert_volume(
            #     session,
            #     RecipeIngredient(
            #         recipe_id=None,
            #         ingredient_id=1,
            #         quantity=1,
            #         unit="g",
            #     ),
            #     "ml"
            # ), "ml")


        ingredient = RecipeIngredient(
            recipe_id=None,
            ingredient_id=ingredient_id,
            quantity=120,
            unit="g",
        )

        for u in data:
            print(convert(session, ingredient, u), u)
        print(convert(session, ingredient, "ml"), "ml")
        print(convert(session, ingredient, "g"), "g")
        print(convert(session, ingredient, "cup"), "cup")
        # print(convert(session, ingredient, "ml"), "ml")


if __name__ == '__main__':
    main()

