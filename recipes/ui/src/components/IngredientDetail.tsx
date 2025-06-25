import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Spinner, Text, Button, VStack, HStack, SimpleGrid } from '@chakra-ui/react';
import { recipeAPI, Ingredient } from '../services/api';

const IngredientDetail: React.FC = () => {
  const { identifier } = useParams<{ identifier?: string }>();
  const navigate = useNavigate();
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIngredient = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let fetchedIngredient: Ingredient;
        
        if (identifier && !isNaN(Number(identifier))) {
          // Fetch by ID if identifier is a number
          fetchedIngredient = await recipeAPI.getIngredient(Number(identifier));
        } else if (identifier) {
          // Fetch by name if identifier is a string
          fetchedIngredient = await recipeAPI.getIngredientByName(identifier);
        } else {
          throw new Error('Invalid ingredient identifier');
        }
        
        setIngredient(fetchedIngredient);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch ingredient');
        console.error('Failed to fetch ingredient:', err);
      } finally {
        setLoading(false);
      }
    };

    if (identifier) {
      fetchIngredient();
    }
  }, [identifier]);

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading ingredient...</Text>
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
        <Button onClick={() => navigate('/ingredients')} colorScheme="blue">
          Back to Ingredients
        </Button>
      </Box>
    );
  }

  if (!ingredient) {
    return (
      <Box textAlign="center" py={10}>
        <Text fontSize="lg" color="gray.600" mb={4}>
          Ingredient not found
        </Text>
        <Button onClick={() => navigate('/ingredients')} colorScheme="blue">
          Back to Ingredients
        </Button>
      </Box>
    );
  }

  return (
    <Box py={6}>
      <Button mb={4} onClick={() => navigate('/ingredients')} variant="outline">
        ← Back to Ingredients
      </Button>
      
      <VStack gap={6} align="stretch" maxW="4xl" mx="auto">
        {/* Header */}
        <Box>
          <Text fontSize="4xl" fontWeight="bold" mb={2}>
            {ingredient.name}
          </Text>
          <HStack gap={4} fontSize="sm" color="gray.500">
            <Text>ID: {ingredient.id}</Text>
            <Text>•</Text>
            <Text>Ingredient Details</Text>
          </HStack>
        </Box>

        {/* Description */}
        {ingredient.description && (
          <Box p={6} bg="blue.50" borderRadius="lg" borderLeft="4px solid" borderColor="blue.400">
            <Text fontSize="lg" fontWeight="semibold" mb={2} color="blue.800">
              Description
            </Text>
            <Text color="blue.700" lineHeight="1.6" fontSize="md">
              {ingredient.description}
            </Text>
          </Box>
        )}

        {/* Properties Grid */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
          {/* Nutritional Information */}
          <Box p={6} bg="green.50" borderRadius="lg" borderLeft="4px solid" borderColor="green.400">
            <Text fontSize="lg" fontWeight="semibold" mb={4} color="green.800">
              Nutritional Information
            </Text>
            <VStack align="stretch" gap={3}>
              <HStack justify="space-between">
                <Text fontSize="sm" color="green.700" fontWeight="medium">
                  Calories (per 100g):
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="green.800">
                  {ingredient.calories ? `${ingredient.calories} cal` : 'Not specified'}
                </Text>
              </HStack>
            </VStack>
          </Box>

          {/* Physical Properties */}
          <Box p={6} bg="purple.50" borderRadius="lg" borderLeft="4px solid" borderColor="purple.400">
            <Text fontSize="lg" fontWeight="semibold" mb={4} color="purple.800">
              Physical Properties
            </Text>
            <VStack align="stretch" gap={3}>
              <HStack justify="space-between">
                <Text fontSize="sm" color="purple.700" fontWeight="medium">
                  Density (g/ml):
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="purple.800">
                  {ingredient.density ? `${ingredient.density} g/ml` : 'Not specified'}
                </Text>
              </HStack>
              <Text fontSize="xs" color="purple.600" mt={2}>
                Used for unit conversions in recipes
              </Text>
            </VStack>
          </Box>
        </SimpleGrid>

        {/* Empty State */}
        {(!ingredient.calories && !ingredient.density && !ingredient.description) && (
          <Box textAlign="center" py={12} bg="gray.50" borderRadius="lg">
            <Text fontSize="lg" color="gray.500" mb={2}>
              No additional information available
            </Text>
            <Text fontSize="sm" color="gray.400">
              This ingredient doesn't have detailed nutritional or physical properties yet.
            </Text>
          </Box>
        )}

        {/* Actions */}
        <Box pt={4} borderTop="1px solid" borderColor="gray.200">
          <HStack gap={3}>
            <Button onClick={() => navigate('/ingredients')} variant="outline">
              Back to All Ingredients
            </Button>
            {ingredient.id && (
              <Button 
                onClick={() => navigate(`/conversions?ingredient=${ingredient.id}`)}
                colorScheme="orange"
                variant="outline"
              >
                View Unit Conversions
              </Button>
            )}
            <Button 
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              colorScheme="blue"
              variant="outline"
            >
              Copy Link
            </Button>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default IngredientDetail; 