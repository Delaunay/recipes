from recipes.server.models import make_unit_from_input, Ingredient, RecipeIngredient, convert_volume


def test_unit_conversion():
    
    # 1 Cup of flour = 120g
    # 1 Cup of flour = 236,588 ml
    # Density: 120/236.588 = 0.50721084754
    
    # always convert to gram on insertion
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import sessionmaker

    # open the instance/project.db with SQLAlchemy and insert the common conversions
    engine = create_engine('sqlite:///instance/project.db')
    Session = sessionmaker(bind=engine)
    
    with Session() as sesh:
        smt = select(Ingredient).where(Ingredient.name == "Flour")
        
        ingredient_id = sesh.execute(smt).scalar()._id
        print(ingredient_id)
        
        ingredient = make_unit_from_input(
            sesh,
            RecipeIngredient(quantity=1, unit="cup", ingredient_id=ingredient_id)
        )
        
        assert ingredient.unit == "g"
        assert abs(ingredient.quantity - 139.58691999999996) < 0.0001
        
        vol = convert_volume(sesh, ingredient, "cup")
        assert abs(vol - 1) < 0.0001
    
    