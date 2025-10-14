from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, Text, UniqueConstraint, JSON, create_engine, select, Boolean, Index
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

class KeyValueStore(Base):
    __tablename__ = 'key_value_store'

    topic = Column(String(100), primary_key=True, nullable=False)
    key = Column(String(100), primary_key=True, nullable=False)
    value = Column(JSON)
    created_at = Column(DateTime, default=datetime.now())
    updated_at = Column(DateTime, default=datetime.now(), onupdate=datetime.now())

    # Composite primary key constraint on (topic, key)
    __table_args__ = (
        # Additional index for topic-only queries (primary key already indexes topic+key)
        Index('idx_keyvalue_topic', 'topic'),
        Index('idx_keyvalue_key', 'key'),
    )

    def __repr__(self):
        return f'<KeyValueStore topic={self.topic} key={self.key}>'

    def to_json(self):
        return {
            'topic': self.topic,
            'key': self.key,
            'value': self.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
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
    ingredient_id = Column(Integer, ForeignKey('ingredients._id'), nullable=True)  # Make nullable since we can have recipe instead
    ingredient_recipe_id = Column(Integer, ForeignKey('recipes._id'), nullable=True)  # Reference to another recipe used as ingredient
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)

    #
    fdc_id = Column(Integer)

    # Product usually used for this ingredient
    # used to fetch the price
    product = Column(String(50))

    # Relationships
    recipe = relationship('Recipe', back_populates='recipe_ingredients', foreign_keys=[recipe_id])
    ingredient = relationship('Ingredient', back_populates='recipe_ingredients')
    ingredient_recipe = relationship('Recipe', foreign_keys=[ingredient_recipe_id])  # Recipe used as ingredient

    def __repr__(self):
        if self.ingredient_id:
            return f'<RecipeIngredient {self.quantity} {self.unit} of ingredient {self.ingredient_id} in recipe {self.recipe_id}>'
        elif self.ingredient_recipe_id:
            return f'<RecipeIngredient {self.quantity} {self.unit} of recipe {self.ingredient_recipe_id} in recipe {self.recipe_id}>'
        else:
            return f'<RecipeIngredient {self.quantity} {self.unit} (no ingredient/recipe specified) in recipe {self.recipe_id}>'

    def to_json(self):
        # Determine the name based on whether it's an ingredient or recipe
        name = None
        recipe = {}

        if self.ingredient_recipe_id == self.recipe_id:
            print("infinite recursion")
            return {
                "name": "recursion"
            }

        if self.ingredient_id and self.ingredient:
            name = self.ingredient.name

        elif self.ingredient_recipe_id and self.ingredient_recipe:

            name = self.ingredient_recipe.title
            recipe = self.ingredient_recipe.to_json()

        return {
            # 'id': self._id,
            'recipe_id': self.recipe_id,
            'ingredient_id': self.ingredient_id,
            'ingredient_recipe_id': self.ingredient_recipe_id,  # Add the new field
            "recipe": recipe,
            'quantity': self.quantity,
            'unit': self.unit,
            'name': name,
            'id': self._id,
            'fdc_id': self.fdc_id,
        }

recipe_categories = Table(
    'recipe_categories',
    Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes._id')),
    Column('category_id', Integer, ForeignKey('categories._id'))
)


class USDAFood(Base):
    __tablename__ = 'usda_foods'

    fdc_id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)


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

    component = Column(Boolean, default=False)
    extension = Column(JSON)

    # Relationships
    author = relationship('User', back_populates='recipes')
    recipe_ingredients = relationship('RecipeIngredient', back_populates='recipe', foreign_keys="RecipeIngredient.recipe_id")
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
            "component": self.component,

            'ingredients': [ri.to_json() for ri in self.recipe_ingredients] if self.recipe_ingredients else [],
            'categories': [category.to_json() for category in self.categories] if self.categories else []
        }


class IngredientComposition(Base):
    __tablename__ = 'ingredient_compositions'

    _id = Column(Integer, primary_key=True)
    ingredient_id = Column(Integer, ForeignKey('ingredients._id'), nullable=True)
    recipe_id = Column(Integer, ForeignKey('recipes._id'), nullable=True)

    kind = Column(String(50))
    name = Column(String(50))
    quantity = Column(Float)
    unit = Column(String(50))
    daily_value = Column(Float, default=0)
    source = Column(String(50))

    extension = Column(JSON)
    # fdc_id = Column(Integer)

    ingredient = relationship('Ingredient')

    def __repr__(self):
        return f'<IngredientComposition {self.name}>'

    def to_json(self):
        return {
            'id': self._id,
            'ingredient_id': self.ingredient_id,
            'recipe_id': self.recipe_id,
            'kind': self.kind,
            'name': self.name,
            'quantity': self.quantity,
            'unit': self.unit,
            'extension': self.extension,
            'daily_value': self.daily_value,
            'source': self.source,
            # 'fdc_id': self.fdc_id
        }

def article_schema():
    class Article(Base):
        """Full blog post to display"""
        __tablename__ = 'article'

        _id = Column(Integer, primary_key=True)
        title = Column(String, 50)
        namespace = Column(String, 255)
        tags = Column(JSON)
        extension = Column(JSON)


    class ArticleBlock(Base):
        """Renderable block of a blog post"""
        __tablename__ = 'article_block'

        _id = Column(Integer, primary_key=True)
        title = Column(String, 50)

        page_id = Column(Integer, ForeignKey('recipes._id'), nullable=True)
        kind = Column(String, 25)
        extension = Column(JSON)
        # SpreadSheet like info
        # Plots + Spreadsheet
        # Text | Article
        # Images
        # Layout that hold more blocks
        # list ? or this is part of a markdown display
        # code block
        # video
        # audio
        # file attachment
        # Latex
        # timeline
        # mermaid plot
        # widget
        # references
        # footnote
        # heading + paragraph

class Ingredient(Base):
    __tablename__ = 'ingredients'

    _id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)

    fdc_id = Column(Integer)
    price_high = Column(Float)
    price_low = Column(Float)
    price_medium = Column(Float)
    calories = Column(Float)    # Calories per 100g or per unit
    density = Column(Float)     # Density in g/ml  | Used for conversions

    composition = Column(JSON)
    extension = Column(JSON)    # Additional info as JSON

    # in grams
    item_avg_weight = Column(Float)

    # Imperial system is Bonkers
    unit_metric       = Column(String(50))
    unit_us_customary = Column(String(50))
    unit_us_legal     = Column(String(50))
    unit_canada       = Column(String(50))
    unit_australia    = Column(String(50))
    unit_uk           = Column(String(50))

    # preferred_unit = Column(String(50))
    # unit = Column(String(50))

    # Relationships
    recipe_ingredients = relationship('RecipeIngredient', back_populates='ingredient')
    compositions = relationship('IngredientComposition', back_populates='ingredient', foreign_keys='IngredientComposition.ingredient_id')
    # recipe = relationship('Recipe', back_populates='recipes')

    def __repr__(self):
        return f'<Ingredient {self.name}>'

    def to_json(self):
        return {
            'id': self._id,
            'name': self.name,
            'description': self.description,
            'price_high': self.price_high,
            'price_low': self.price_low,
            'price_medium': self.price_medium,
            'calories': self.calories,
            'density': self.density,
            'composition': self.composition,
            'extension': self.extension,
            'item_avg_weight': self.item_avg_weight,
            "fdc_id": self.fdc_id,
            "unit": {
                "metric": self.unit_metric,
                "us_customary": self.unit_us_customary,
                "us_legal": self.unit_us_legal,
                "canada": self.unit_canada,
                "australia": self.unit_australia,
                "uk": self.unit_uk,
            }
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
    brand = Column(String(50))
    quantity = Column(Float)                                # Quantity in the package
    unit = Column(String(50))                               # unit of quantity
    price = Column(Float)                                   # unitary price
    count = Column(Integer)                                 # Number of item purchase
    organic = Column(Boolean)                               # Organic or not
    created_at = Column(DateTime, default=datetime.utcnow)  # Date of purchase
    ingredient = Column(String(50))                         # Ingredient this is usually used for
    fdc_id = Column(Integer)

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


# class Unit(Base):
#     __tablename__ = 'units'

#     name = Column(String(50))
#     volume = Column(Boolean)
#     mass = Column(Boolean)
#     metric = Column(Boolean)


# Unit Profile ?

# Table for unit conversions
class UnitConversion(Base):
    __tablename__ = 'unit_conversions'

    _id = Column(Integer, primary_key=True)
    from_unit = Column(String(50), nullable=False)
    to_unit = Column(String(50), nullable=False)
    conversion_factor = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)

    is_volume = Column(Boolean)

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
            'extension': self.extension,
            'is_volume': self.is_volume,
        }

    def __repr__(self):
        return f'<UnitConversion {self.from_unit}->{self.to_unit} {self.conversion_factor}>'

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

