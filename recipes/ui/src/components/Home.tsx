import { Link } from 'react-router-dom';
import { Box, VStack, Text, Button, HStack, Heading } from '@chakra-ui/react';
import { recipeAPI } from '../services/api';

const Home = () => {
  const isStatic = recipeAPI.isStaticMode();

  return (
    <Box py={10}>
      <VStack gap={8} align="center" maxW="4xl" mx="auto">
        <Box textAlign="center">
          <Heading size="2xl" mb={4}>
            Welcome to RecipeBook
          </Heading>
          <Text fontSize="xl" color="gray.600" mb={8}>
            {isStatic 
              ? 'Browse this curated collection of recipes - your static recipe reference'
              : 'Your digital cookbook for organizing, creating, and sharing recipes'
            }
          </Text>
        </Box>

        {/* Static Mode Notice */}
        {isStatic && (
          <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400" maxW="2xl">
            <Text fontWeight="medium" color="blue.800" mb={2} textAlign="center">
              📖 Static Recipe Collection
            </Text>
            <Text fontSize="sm" color="blue.700" textAlign="center">
              This is a read-only version of RecipeBook. You can browse recipes, scale quantities, 
              and convert units, but creating or editing recipes is not available.
            </Text>
          </Box>
        )}

        <HStack gap={6} flexWrap="wrap" justify="center">
          <Link to="/recipes">
            <Button colorScheme="blue" size="lg">
              Browse All Recipes
            </Button>
          </Link>
          {!isStatic && (
            <Link to="/create">
              <Button colorScheme="green" variant="outline" size="lg">
                Create New Recipe
              </Button>
            </Link>
          )}
          <Link to="/ingredients">
            <Button colorScheme="purple" variant="outline" size="lg">
              View Ingredients
            </Button>
          </Link>
        </HStack>

        {/* Feature highlights */}
        <VStack gap={4} mt={8} maxW="2xl" textAlign="center">
          <Heading size="md" color="gray.700">
            {isStatic ? 'Available Features:' : 'Features:'}
          </Heading>
          <VStack gap={2} fontSize="sm" color="gray.600">
            <Text>📖 Browse and view detailed recipes</Text>
            <Text>🔢 Scale recipe quantities with custom multipliers</Text>
            <Text>⚖️ Convert between different measurement units</Text>
            <Text>🏷️ Explore recipes by categories and ingredients</Text>
            {!isStatic && (
              <>
                <Text>✏️ Create and edit your own recipes</Text>
                <Text>📷 Add images to recipes and cooking steps</Text>
                <Text>📊 Manage ingredient database and unit conversions</Text>
              </>
            )}
          </VStack>
        </VStack>
      </VStack>
    </Box>
  );
};

export default Home; 