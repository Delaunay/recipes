// ... existing code ...
        @self.app.route('/units/available/<int:ingredient_id>/<string:from_unit>', methods=['GET'])
        def available_units(ingredient_id: int, from_unit: str) -> Dict[str, Any]:
            # Query for both ingredient-specific and common conversions
            conversions = self.db.session.query(UnitConversion).filter(
                UnitConversion.from_unit == from_unit,
                (UnitConversion.ingredient_id == ingredient_id) | (UnitConversion.ingredient_id.is_(None))
            ).all()
            return jsonify([conversion.to_unit for conversion in conversions])
// ... existing code ...