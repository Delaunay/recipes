from typing import List, Dict, Any

from flask import jsonify

# from .models import Product, ProductIngredient, Ingredient


DEFAULT_MASS_UNIT = "g"
DEFAULT_VOLUME_UNIT = "ml"

# Hard coded defaults
MASS_UNITS = {
    'g': 1,
    'kg': 1000,
    'mg': 0.001,
    'lb': 453.592,
    'oz': 28.3495
}

VOLUME_UNITS = {
    'ml': 1,
    'cl': 10,
    'l': 1000,
    "cm3": 1,
    'fl oz': 29.5735,
    'tbsp': 14.7868,
    'tsp': 4.92892,
    'cup': 236.588,
    "pint": 473.176,
    "quart": 946.353,
    "gallon": 3785.
}

def hc_mass_units():
    return MASS_UNITS

def hc_volume_units():
    return VOLUME_UNITS

def hc_common_conversions():
    return {
        # Density
        # Mass/Volume

        # Mass
        # 1g/this = that
        'g': mass_units(),

        # Volume
        'ml': volume_units(),
    }


def hc_is_volume(unit):
    return unit in volume_units()

def hc_is_mass(unit):
    return unit in mass_units()

def hc_get_unit_type(unit):
    if is_volume(unit):
        return "V", DEFAULT_VOLUME_UNIT, VOLUME_UNITS
    
    if is_mass(unit):
        return "M", DEFAULT_MASS_UNIT, MASS_UNITS
    
    raise RuntimeError(f"Unknown unit {unit}")


def hc_convert(qty, from_unit, to_unit, get_density):
    if from_unit == to_unit:
        return qty

    from_type, default_unit_from, cvt_from = hc_get_unit_type(from_unit)
    to_type, default_unit_to, cvt_to = hc_get_unit_type(to_unit)

    # Get Standard unit (ml or g)
    from_unit_std = hc_convert(qty, from_unit, default_unit_from)

    # density is g/ml
    match (from_type, to_type):
        case ("V", "M"):
            density = hc_get_density()

            # from_unit_std is ml: ml * (g / ml) => g
            return hc_convert(from_unit_std * density, "g", to_unit)

        case ("M", "V"):
            density = hc_get_density()

            # from_unit_std is g: g / (g / ml) = g * ml / g => ml
            return hc_convert(from_unit_std / density, "ml", to_unit)
    
        case _:
            # from_unit_std is (g or ml) and gets converted 
            factor = cvt_from[to_unit]
            return from_unit_std / factor


def get_unit(unit):
    return select(UnitConversion).where(
        UnitConversion.from_unit == from_unit,
        UnitConversion.to_unit == unit
    )

def get_unit_type(unit):
    if get_unit(unit).is_volume:
        return "V", DEFAULT_VOLUME_UNIT

    return "M", DEFAULT_MASS_UNIT


def get_density_conversion(from_unit, to_unit, ingredient_id)
    def get_density():
        ingredient = select(Ingredient).where(Ingredient._id == ingredient_id)
        return ingredient.density

    match (from_type, to_type):
        case ("V", "M"):
            return get_density(), 'g'

        case ("M", "V"):
            return 1 / get_density(), 'ml'
    
        case _:
            return 1, NONE


def convert(qty, from_unit, to_unit, ingredient_id)
    if from_unit == to_unit:
        return qty

    from_unit_type, from_default = get_unit_type(from_unit)
    to_unit_type, to_default = get_unit_type(to_unit)

    # ml OR g
    std_qty = convert(qty, from_unit, from_default)

    # shortcut for ml/g
    if from_default == to_unit:
        return std_qty

    # Conversion factor to ml or to g
    density_cvt, new_unit = get_density_conversion(from_unit, to_unit, ingredient_id)

    # Change to VOLUME or MASS
    if new_unit is not None:
        return convert(qty * density_cvt, new_unit, to_unit)

    cvt = select(UnitConversion).where(
        UnitConversion.from_unit == from_unit, 
        UnitConversion.to_unit == to_unit,
        UnitConversion.ingredient_id.is_(None)
    )

    return cvt.conversion_factor * qty



def units_routes(app):
    """Handle ingredient unit"""


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