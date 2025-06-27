import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  Text,
  Button,
  Spinner,
  HStack,
  Heading,
  SimpleGrid
} from '@chakra-ui/react';
import { recipeAPI, RecipeData } from '../services/api';

const RecipeList = () => {
  const [recipes, setRecipes] = useState<RecipeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedRecipes = await recipeAPI.getRecipes();
      setRecipes(fetchedRecipes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recipes');
      console.error('Failed to fetch recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRecipeName = (title: string): string => {
    return title.toLowerCase().replace(/\s+/g, '-');
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading recipes...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box py={6}>
        <Box p={4} bg="red.50" borderRadius="md" borderLeft="4px solid" borderColor="red.400" mb={4}>
          <Text fontWeight="medium" color="red.800" mb={1}>Error</Text>
          <Text fontSize="sm" color="red.700">{error}</Text>
        </Box>
        <Button onClick={fetchRecipes} colorScheme="blue">
          Try Again
        </Button>
      </Box>
    );
  }

  if (recipes.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Text fontSize="lg" color="gray.600" mb={4}>
          No recipes found. Create your first recipe!
        </Text>
        <Button colorScheme="blue" onClick={() => navigate('/create')}>
          Create Recipe
        </Button>
      </Box>
    );
  }

  return (
    <Box py={6}>
      <VStack gap={6} align="stretch">
        <Box>
          <Text fontSize="3xl" fontWeight="bold" mb={2}>
            All Recipes
          </Text>
          <HStack justify="space-between">
            <Text fontSize="lg" color="gray.600">
              {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} found
            </Text>
            <Button colorScheme="blue" onClick={() => navigate('/create')}>
              Create New Recipe
            </Button>
          </HStack>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
          {recipes.map((recipe) => (
            <Box key={recipe.id} p={4} borderWidth="1px" borderRadius="md" _hover={{ shadow: "md" }}>
              <Box pb={2}>
                <Heading size="md">
                  <Link
                    to={`/recipes/${recipe.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    {recipe.title}
                  </Link>
                </Heading>
              </Box>
              <Box pt={0}>
                {recipe.description && (
                  <Text color="gray.600" mb={3}>
                    {recipe.description.length > 100 
                      ? `${recipe.description.substring(0, 100)}...` 
                      : recipe.description}
                  </Text>
                )}
                <VStack align="start" gap={2}>
                  {(recipe.prep_time || recipe.cook_time) && (
                    <HStack gap={4}>
                      {recipe.prep_time && (
                        <Text fontSize="sm" color="gray.500">
                          Prep: {recipe.prep_time}min
                        </Text>
                      )}
                      {recipe.cook_time && (
                        <Text fontSize="sm" color="gray.500">
                          Cook: {recipe.cook_time}min
                        </Text>
                      )}
                    </HStack>
                  )}
                  {recipe.servings && (
                    <Text fontSize="sm" color="gray.500">
                      Serves: {recipe.servings}
                    </Text>
                  )}
                  <HStack gap={2} mt={3}>
                    <Link to={`/recipes/${recipe.id}`}>
                      <Button size="sm" colorScheme="blue" variant="solid">
                        View by ID
                      </Button>
                    </Link>
                    <Link to={`/recipes/${formatRecipeName(recipe.title)}`}>
                      <Button size="sm" colorScheme="green" variant="outline">
                        View by Name
                      </Button>
                    </Link>
                  </HStack>
                </VStack>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    </Box>
  );
};

export default RecipeList; 