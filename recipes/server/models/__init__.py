from .calendar import Event, Base

from .keyvalue import KeyValueStore

# Product is the bridge between Receipt and Pantry management
# IngredientProduct is the bridge between Pantry and recipes
from .pantry import Product, ProductInventory, IngredientProduct

from .recipe import (
    Recipe,                 # Recipe 
    RecipeIngredient,       # Ingredient + Quantity + unit
    Ingredient,             # Ingerdient Data (Price, density etc...)
    # Recipe Categorization
    Category,           
    recipe_categories,
    # Allgergies / Life Style replacement
    IngredientSubstitution,
    # Unit Conversion
    UnitConversion,
    # Nutrition
    USDAFood,               # USDA Cache
    IngredientComposition,  # Ingredient Composition
)

from .task import Task

from .user import User


if False:
    from .encryption import EncryptedStorage, PasswordManager

    from .article import Article, ArticleBlock

    from .budget import Receipt, ReceiptItem, Expense