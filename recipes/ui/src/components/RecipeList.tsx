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
  const isStatic = recipeAPI.isStaticMode();

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
          {isStatic ? 'No recipes available in this static version.' : 'No recipes found. Create your first recipe!'}
        </Text>
        {!isStatic && (
          <Button colorScheme="blue" onClick={() => navigate('/create')}>
            Create Recipe
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box py={6}>
      <VStack gap={6} align="stretch">
        {/* Static Mode Notice */}
        {isStatic && (
          <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400">
            <Text fontWeight="medium" color="blue.800" mb={1}>
              📖 Static Recipe Collection
            </Text>
            <Text fontSize="sm" color="blue.700">
              You're viewing a read-only collection of recipes. Creating new recipes is not available in this version.
            </Text>
          </Box>
        )}

        <Box>
          <Text fontSize="3xl" fontWeight="bold" mb={2}>
            All Recipes
          </Text>
          <HStack justify="space-between">
            <Text fontSize="lg" color="gray.600">
              {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} found
            </Text>
            {!isStatic && (
              <Button colorScheme="blue" onClick={() => navigate('/create')}>
                Create New Recipe
              </Button>
            )}
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
              
              {recipe.description && (
                <Text fontSize="sm" color="gray.600" mb={3}>
                  {recipe.description}
                </Text>
              )}
              
              <HStack gap={4} fontSize="sm" color="gray.500" mb={3}>
                {recipe.prep_time && (
                  <Text>Prep: {recipe.prep_time}min</Text>
                )}
                {recipe.cook_time && (
                  <Text>Cook: {recipe.cook_time}min</Text>
                )}
                {recipe.servings && (
                  <Text>Serves: {recipe.servings}</Text>
                )}
              </HStack>
              
              <VStack gap={2} align="stretch">
                <Button 
                  size="sm" 
                  colorScheme="blue" 
                  variant="solid"
                  onClick={() => navigate(`/recipes/${recipe.id}`)}
                >
                  View Recipe
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/recipes/${formatRecipeName(recipe.title)}`)}
                >
                  View by Name
                </Button>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    </Box>
  );
};

export default RecipeList; 