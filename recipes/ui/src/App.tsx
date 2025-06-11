import React, { useState, useEffect } from 'react';
import { 
  ChakraProvider, 
  Box, 
  VStack, 
  Text,
  Button,
  HStack,
  createSystem,
  defaultConfig,
  Spinner
} from '@chakra-ui/react';
import Layout from './layout/Layout';
import Recipe from './components/Recipe';
import { recipeAPI, RecipeData } from './services/api';
import './App.css';

// Create the theme system for Chakra UI v3
const system = createSystem(defaultConfig);

type ViewMode = 'view' | 'create' | 'list';

function App() {
  const [recipes, setRecipes] = useState<RecipeData[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeData | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(true); // Simulating authorization
  const [activeView, setActiveView] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recipes on component mount
  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedRecipes = await recipeAPI.getRecipes();
      setRecipes(fetchedRecipes);
      
      // If we have recipes and no selected recipe, select the first one
      if (fetchedRecipes.length > 0 && !selectedRecipe) {
        setSelectedRecipe(fetchedRecipes[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recipes');
      console.error('Failed to fetch recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async (recipe: RecipeData) => {
    try {
      setLoading(true);
      setError(null);
      
      let savedRecipe: RecipeData;
      
      if (recipe.id) {
        // Update existing recipe
        savedRecipe = await recipeAPI.updateRecipe(recipe.id, recipe);
        setRecipes(prev => prev.map(r => r.id === recipe.id ? savedRecipe : r));
        
        // Update selected recipe if it's the one being edited
        if (selectedRecipe?.id === recipe.id) {
          setSelectedRecipe(savedRecipe);
        }
      } else {
        // Create new recipe
        savedRecipe = await recipeAPI.createRecipe(recipe);
        setRecipes(prev => [...prev, savedRecipe]);
        setSelectedRecipe(savedRecipe);
        
        // Switch to view mode to show the newly created recipe
        setActiveView('view');
      }
      
      console.log('Recipe saved successfully:', savedRecipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
      console.error('Failed to save recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await recipeAPI.deleteRecipe(recipeId);
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
      
      // If we deleted the selected recipe, select another one or clear selection
      if (selectedRecipe?.id === recipeId) {
        const remainingRecipes = recipes.filter(r => r.id !== recipeId);
        setSelectedRecipe(remainingRecipes.length > 0 ? remainingRecipes[0] : null);
        
        // If no recipes left, switch to create mode
        if (remainingRecipes.length === 0) {
          setActiveView('create');
        }
      }
      
      console.log('Recipe deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
      console.error('Failed to delete recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecipe = (recipe: RecipeData) => {
    setSelectedRecipe(recipe);
    setActiveView('view');
  };

  const renderContent = () => {
    if (loading && recipes.length === 0) {
      return (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" />
          <Text mt={4}>Loading recipes...</Text>
        </Box>
      );
    }

    switch (activeView) {
      case 'view':
        if (!selectedRecipe) {
          return (
            <Box textAlign="center" py={10}>
              <Text fontSize="lg" color="gray.600">
                No recipe selected. Choose one from the list or create a new one.
              </Text>
            </Box>
          );
        }
        return (
          <Recipe
            recipe={selectedRecipe}
            isAuthorized={isAuthorized}
            onSave={handleSaveRecipe}
            onDelete={handleDeleteRecipe}
          />
        );
      case 'create':
        return (
          <Recipe
            isAuthorized={isAuthorized}
            onSave={handleSaveRecipe}
          />
        );
      case 'list':
        if (recipes.length === 0) {
          return (
            <Box textAlign="center" py={10}>
              <Text fontSize="lg" color="gray.600" mb={4}>
                No recipes found. Create your first recipe!
              </Text>
              <Button colorScheme="blue" onClick={() => setActiveView('create')}>
                Create Recipe
              </Button>
            </Box>
          );
        }
        return (
          <VStack gap={6} align="stretch">
            {recipes.map((recipe) => (
              <Box key={recipe.id} position="relative">
                <Recipe
                  recipe={recipe}
                  isAuthorized={isAuthorized}
                  onSave={handleSaveRecipe}
                  onDelete={handleDeleteRecipe}
                />
                <Button
                  position="absolute"
                  top={4}
                  right={4}
                  size="sm"
                  onClick={() => handleViewRecipe(recipe)}
                  colorScheme="blue"
                  variant="outline"
                >
                  View Details
                </Button>
              </Box>
            ))}
          </VStack>
        );
      default:
        return null;
    }
  };

  return (
    <ChakraProvider value={system}>
      <Layout>
        <Box p={6}>
          <VStack gap={6} align="stretch">
            <Box>
              <Text fontSize="3xl" fontWeight="bold" mb={2}>
                Recipe Management
              </Text>
              <Text fontSize="lg" color="gray.600">
                View, edit, and create recipes with inline editing capabilities
              </Text>
            </Box>

            {/* Error Display */}
            {error && (
              <Box p={4} bg="red.50" borderRadius="md" borderLeft="4px solid" borderColor="red.400">
                <Text fontWeight="medium" color="red.800" mb={1}>Error</Text>
                <Text fontSize="sm" color="red.700">{error}</Text>
              </Box>
            )}

            {/* Navigation Buttons */}
            <HStack gap={4} justify="center">
              <Button
                variant={activeView === 'view' ? 'solid' : 'outline'}
                colorScheme="blue"
                onClick={() => setActiveView('view')}
                disabled={!selectedRecipe}
              >
                View Recipe ({selectedRecipe?.title || 'None Selected'})
              </Button>
              <Button
                variant={activeView === 'create' ? 'solid' : 'outline'}
                colorScheme="blue"
                onClick={() => setActiveView('create')}
              >
                Create New Recipe
              </Button>
              <Button
                variant={activeView === 'list' ? 'solid' : 'outline'}
                colorScheme="blue"
                onClick={() => setActiveView('list')}
              >
                Recipe List ({recipes.length})
              </Button>
              <Button
                variant="outline"
                onClick={fetchRecipes}
                loading={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </HStack>

            {/* Content */}
            <Box>
              {renderContent()}
            </Box>

            {/* Instructions */}
            <Box mt={8} p={4} bg="gray.50" borderRadius="md">
              <Text fontSize="lg" fontWeight="semibold" mb={2}>
                How to use:
              </Text>
              <VStack align="start" gap={1}>
                <Text>• <strong>View Recipe:</strong> See an existing recipe with inline editing capabilities</Text>
                <Text>• <strong>Create New Recipe:</strong> Start with a blank recipe template</Text>
                <Text>• <strong>Edit Mode:</strong> Toggle the switch to enable/disable editing</Text>
                <Text>• <strong>Inline Editing:</strong> Click on any text field to edit directly</Text>
                <Text>• <strong>Add/Remove:</strong> Use the + and - buttons to manage ingredients and steps</Text>
                <Text>• <strong>Save/Cancel:</strong> Use the action buttons to save changes or cancel edits</Text>
                <Text>• <strong>Refresh:</strong> Click refresh to sync with the server</Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </Layout>
    </ChakraProvider>
  );
}

export default App;
