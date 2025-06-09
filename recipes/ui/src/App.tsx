import React, { useState } from 'react';
import { 
  ChakraProvider, 
  Box, 
  VStack, 
  Text,
  Button,
  HStack,
  createSystem,
  defaultConfig
} from '@chakra-ui/react';
import Layout from './layout/Layout';
import Recipe from './components/Recipe';
import './App.css';

// Create the theme system for Chakra UI v3
const system = createSystem(defaultConfig);

// Sample recipe data matching the backend model structure
const sampleRecipe = {
  id: 1,
  title: 'Homemade Pizza',
  description: 'Delicious homemade pizza with fresh ingredients and crispy crust. Perfect for family dinner or weekend cooking.',
  prep_time: 30,
  cook_time: 15,
  servings: 4,
  ingredients: [
    { id: 1, name: 'Pizza dough', quantity: 1, unit: 'ball' },
    { id: 2, name: 'Tomato sauce', quantity: 0.5, unit: 'cup' },
    { id: 3, name: 'Mozzarella cheese', quantity: 200, unit: 'grams' },
    { id: 4, name: 'Fresh basil', quantity: 10, unit: 'leaves' },
    { id: 5, name: 'Olive oil', quantity: 2, unit: 'tbsp' }
  ],
  instructions: [
    {
      step: '1',
      description: 'Preheat your oven to 475°F (245°C). If you have a pizza stone, place it in the oven while preheating.',
      duration: '15 minutes'
    },
    {
      step: '2',
      description: 'Roll out the pizza dough on a floured surface to your desired thickness. Transfer to a pizza pan or parchment paper.',
      duration: '5 minutes'
    },
    {
      step: '3',
      description: 'Spread the tomato sauce evenly over the dough, leaving a border for the crust. Sprinkle the mozzarella cheese on top.',
      duration: '3 minutes'
    },
    {
      step: '4',
      description: 'Drizzle with olive oil and add any additional toppings. Bake for 12-15 minutes until the crust is golden and cheese is bubbly.',
      duration: '15 minutes'
    },
    {
      step: '5',
      description: 'Remove from oven, add fresh basil leaves, slice, and serve immediately.',
      duration: '2 minutes'
    }
  ],
  categories: [
    { id: 1, name: 'Italian', description: 'Italian cuisine' },
    { id: 2, name: 'Main Course', description: 'Main dishes' }
  ],
  images: [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ],
  author_id: 1
};

type ViewMode = 'view' | 'create' | 'list';

function App() {
  const [recipes, setRecipes] = useState([sampleRecipe]);
  const [isAuthorized, setIsAuthorized] = useState(true); // Simulating authorization
  const [activeView, setActiveView] = useState<ViewMode>('view');

  const handleSaveRecipe = (recipe: any) => {
    console.log('Saving recipe:', recipe);
    
    if (recipe.id) {
      // Update existing recipe
      setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r));
    } else {
      // Add new recipe
      const newRecipe = { ...recipe, id: Date.now() };
      setRecipes(prev => [...prev, newRecipe]);
    }
  };

  const handleDeleteRecipe = (recipeId: number) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'view':
        return (
          <Recipe
            recipe={sampleRecipe}
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
        return (
          <VStack gap={6} align="stretch">
            {recipes.map((recipe) => (
              <Recipe
                key={recipe.id}
                recipe={recipe}
                isAuthorized={isAuthorized}
                onSave={handleSaveRecipe}
                onDelete={handleDeleteRecipe}
              />
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

            {/* Navigation Buttons */}
            <HStack gap={4} justify="center">
              <Button
                variant={activeView === 'view' ? 'solid' : 'outline'}
                colorScheme="blue"
                onClick={() => setActiveView('view')}
              >
                View Recipe
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
                Recipe List
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
              </VStack>
            </Box>
          </VStack>
        </Box>
      </Layout>
    </ChakraProvider>
  );
}

export default App;
