import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  VStack,
  Text,
  Button,
  Spinner,
  HStack,
  Heading,
  SimpleGrid,
  Image,
  Badge,
} from '@chakra-ui/react';
import { recipeAPI, RecipeData, imagePath } from '../services/api';

const RecipeList = () => {
  const [recipes, setRecipes] = useState<RecipeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const isStatic = recipeAPI.isStaticMode();

  useEffect(() => {
    fetchRecipes();
    document.title = 'All Recipes';
  }, []);

  useEffect(() => {
    if (!loading && recipes.length > 0) {
      restoreScrollPosition()
    }
  },
    [loading, recipes.length]
  )

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

  const saveScrollPosition = () => {
    sessionStorage.setItem("scroll_recipe", JSON.stringify({ x: window.pageXOffset, y: window.pageYOffset }))
  }

  const restoreScrollPosition = () => {
    const saved = sessionStorage.getItem(`scroll_recipe`);
    let coord = { x: 0, y: 0 };

    if (saved) {
      coord = JSON.parse(saved)
    }
    window.scrollTo(coord.x, coord.y);
  }



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

        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6 }} gap={4}>
          {recipes.map((recipe) => (
            <RouterLink to={`/recipes/${recipe.id}`}>
              <Box
                key={recipe.id}
                borderWidth="1px"
                borderRadius="lg"
                overflow="hidden"
                bg="white"
                shadow="sm"
                _hover={{
                  shadow: "lg",
                  transform: "translateY(-2px)",
                  transition: "all 0.2s"
                }}
                cursor="pointer"
                transition="all 0.2s"
                maxW="100%"
                h="100%"
              >
                {/* Recipe Image - Square */}
                <Box position="relative" width="100%" paddingBottom="100%" overflow="hidden">
                  {recipe.images && recipe.images.length > 0 ? (
                    <Image
                      src={imagePath(recipe.images[0])}
                      alt={recipe.title}
                      position="absolute"
                      top="0"
                      left="0"
                      width="100%"
                      height="100%"
                      objectFit="cover"
                    />
                  ) : (
                    <Box
                      position="absolute"
                      top="0"
                      left="0"
                      width="100%"
                      height="100%"
                      bg="gray.100"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text color="gray.500" fontSize="sm" textAlign="center">
                        No image
                      </Text>
                    </Box>
                  )}
                </Box>

                {/* Recipe Details */}
                <Box p={4}>
                  <VStack align="stretch" gap={3}>
                    {/* Recipe Title */}
                    <Heading size="md">
                      {recipe.title}
                    </Heading>

                    {/* Recipe Description */}
                    {recipe.description && (
                      <Text fontSize="sm" color="gray.600" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                        {recipe.description}
                      </Text>
                    )}

                    {/* Recipe Stats */}
                    <HStack gap={3} fontSize="sm" color="gray.500" flexWrap="wrap">
                      {recipe.prep_time && (
                        <Badge colorScheme="blue" variant="subtle">
                          Prep: {recipe.prep_time}min
                        </Badge>
                      )}
                      {recipe.cook_time && (
                        <Badge colorScheme="green" variant="subtle">
                          Cook: {recipe.cook_time}min
                        </Badge>
                      )}
                      {recipe.servings && (
                        <Badge colorScheme="purple" variant="subtle">
                          Serves: {recipe.servings}
                        </Badge>
                      )}
                    </HStack>

                    {/* Categories */}
                    {recipe.categories && recipe.categories.length > 0 && (
                      <HStack gap={2} flexWrap="wrap">
                        {recipe.categories.slice(0, 3).map((category) => (
                          <Badge key={category.id} colorScheme="gray" variant="outline" fontSize="xs">
                            {category.name}
                          </Badge>
                        ))}
                        {recipe.categories.length > 3 && (
                          <Badge colorScheme="gray" variant="outline" fontSize="xs">
                            +{recipe.categories.length - 3} more
                          </Badge>
                        )}
                      </HStack>
                    )}
                  </VStack>
                </Box>
              </Box>
            </RouterLink>
          ))}
        </SimpleGrid>
      </VStack>
    </Box>
  );
};

export default RecipeList;