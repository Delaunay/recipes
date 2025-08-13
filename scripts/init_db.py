#!/usr/bin/env python3
from recipes.server.models import insert_common_ingredients, insert_common_conversions, UnitConversion
from recipes.server.server import RecipeApp
import os

def init_db():
    """Initialize the database with common ingredients and unit conversions"""
    app = RecipeApp()

    with app.app.app_context():
        try:
            # Only seed if tables are empty
            if not app.db.session.query(UnitConversion).first():
                insert_common_ingredients(app.db.session)
                insert_common_conversions(app.db.session)
                print("Database seeded with common ingredients and unit conversions")
            else:
                print("Database already contains unit conversions, skipping seeding")
        except Exception as e:
            print(f"Error seeding database: {e}")
            app.db.session.rollback()

if __name__ == '__main__':
    init_db()