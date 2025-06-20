import React from 'react';
import { Link } from 'react-router-dom';
import { Box, VStack, Text, Button, HStack, Heading } from '@chakra-ui/react';

const Home: React.FC = () => {
  return (
    <Box py={10}>
      <VStack gap={8} align="center" maxW="4xl" mx="auto">
        <Box textAlign="center">
          <Heading size="2xl" mb={4}>
            Welcome to RecipeBook
          </Heading>
          <Text fontSize="xl" color="gray.600" mb={8}>
            Your digital cookbook for organizing, creating, and sharing recipes
          </Text>
        </Box>

        <HStack gap={6} flexWrap="wrap" justify="center">
          <Link to="/recipes">
            <Button colorScheme="blue" size="lg">
              Browse All Recipes
            </Button>
          </Link>
          <Link to="/create">
            <Button colorScheme="green" variant="outline" size="lg">
              Create New Recipe
            </Button>
          </Link>
        </HStack>

        <Box mt={12} p={6} bg="gray.50" borderRadius="lg" maxW="3xl" w="full">
          <Heading size="lg" mb={4} textAlign="center">
            Features
          </Heading>
          <VStack gap={4} align="start">
            <Box>
              <Text fontWeight="semibold" mb={1}>📖 Recipe Management</Text>
              <Text color="gray.600">Create, edit, and organize your favorite recipes with detailed instructions and ingredients.</Text>
            </Box>
            <Box>
              <Text fontWeight="semibold" mb={1}>🔗 Flexible URLs</Text>
              <Text color="gray.600">Access recipes by ID (e.g., /recipes/1) or by name (e.g., /recipes/chicken-alfredo).</Text>
            </Box>
            <Box>
              <Text fontWeight="semibold" mb={1}>⚡ Live Editing</Text>
              <Text color="gray.600">Edit recipes inline with real-time updates and easy-to-use controls.</Text>
            </Box>
            <Box>
              <Text fontWeight="semibold" mb={1}>📱 Responsive Design</Text>
              <Text color="gray.600">Works seamlessly on desktop, tablet, and mobile devices.</Text>
            </Box>
          </VStack>
        </Box>

      </VStack>
    </Box>
  );
};

export default Home; 