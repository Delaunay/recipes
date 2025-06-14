import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Text } from '@chakra-ui/react';
import Recipe from './Recipe';
import { recipeAPI, RecipeData } from '../services/api';

const CreateRecipe: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveRecipe = async (recipe: RecipeData) => {
    try {
      setLoading(true);
      setError(null);
      
      const savedRecipe = await recipeAPI.createRecipe(recipe);
      
      // Navigate to the newly created recipe
      navigate(`/recipes/${savedRecipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recipe');
      console.error('Failed to create recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box py={6}>
      <Button mb={4} onClick={() => navigate('/recipes')} variant="outline">
        ← Back to Recipes
      </Button>
      
      <Box mb={4}>
        <Text fontSize="3xl" fontWeight="bold" mb={2}>
          Create New Recipe
        </Text>
        <Text fontSize="lg" color="gray.600">
          Fill in the details below to create your new recipe
        </Text>
      </Box>

      {error && (
        <Box p={4} bg="red.50" borderRadius="md" borderLeft="4px solid" borderColor="red.400" mb={4}>
          <Text fontWeight="medium" color="red.800" mb={1}>Error</Text>
          <Text fontSize="sm" color="red.700">{error}</Text>
        </Box>
      )}
      
      <Recipe
        isAuthorized={true}
        onSave={handleSaveRecipe}
      />
    </Box>
  );
};

export default CreateRecipe; 