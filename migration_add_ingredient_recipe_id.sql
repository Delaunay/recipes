-- Migration to add ingredient_recipe_id column to recipe_ingredients table
-- This allows recipes to be used as ingredients in other recipes

-- Add the new column
ALTER TABLE recipe_ingredients
ADD COLUMN ingredient_recipe_id INTEGER;

-- Add foreign key constraint
ALTER TABLE recipe_ingredients
ADD CONSTRAINT fk_recipe_ingredients_ingredient_recipe_id
FOREIGN KEY (ingredient_recipe_id) REFERENCES recipes(_id);

-- Make ingredient_id nullable since we can now have either ingredient_id OR ingredient_recipe_id
ALTER TABLE recipe_ingredients
ALTER COLUMN ingredient_id DROP NOT NULL;

-- Add a check constraint to ensure at least one of ingredient_id or ingredient_recipe_id is set
ALTER TABLE recipe_ingredients
ADD CONSTRAINT chk_recipe_ingredients_has_ingredient_or_recipe
CHECK (
    (ingredient_id IS NOT NULL AND ingredient_recipe_id IS NULL) OR
    (ingredient_id IS NULL AND ingredient_recipe_id IS NOT NULL)
);