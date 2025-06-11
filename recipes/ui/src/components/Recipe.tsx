import React, { useState, KeyboardEvent } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Flex,
  Spacer,
  SimpleGrid,
} from '@chakra-ui/react';
import { RecipeData } from '../services/api';

// Simple icon components
const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

const AddIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

interface Ingredient {
  id?: number;
  name: string;
  description?: string;
  calories?: number;
  density?: number;
  quantity?: number;
  unit?: string;
}

interface Instruction {
  step: string;
  description: string;
  duration?: string;
  image?: string;
}

interface Category {
  id?: number;
  name: string;
  description?: string;
}

interface RecipeProps {
  recipe?: RecipeData;
  isAuthorized?: boolean;
  onSave?: (recipe: RecipeData) => void;
  onDelete?: (recipeId: number) => void;
}

const Recipe: React.FC<RecipeProps> = ({
  recipe: initialRecipe,
  isAuthorized = false,
  onSave,
  onDelete,
}) => {
  const [isEditable, setIsEditable] = useState(!initialRecipe); // New recipe starts in edit mode
  const [recipe, setRecipe] = useState<RecipeData>(
    initialRecipe || {
      title: 'New Recipe',
      description: 'Enter recipe description...',
      instructions: [{ step: '1', description: 'Add your first step here...', duration: '' }],
      prep_time: 15,
      cook_time: 30,
      servings: 4,
      ingredients: [{ name: 'Enter ingredient', quantity: 1, unit: 'cup' }],
      categories: [],
      images: [],
    }
  );

  const handleContentEdit = (field: keyof RecipeData, value: any) => {
    setRecipe(prev => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (field: keyof RecipeData) => (e: React.FormEvent<HTMLDivElement>) => {
    const value = e.currentTarget.textContent || '';
    handleContentEdit(field, value);
  };

  const handleNumberChange = (field: keyof RecipeData) => (e: React.FormEvent<HTMLDivElement>) => {
    const value = parseInt(e.currentTarget.textContent || '0') || 0;
    handleContentEdit(field, value);
  };

  const addIngredient = () => {
    const newIngredient: Ingredient = {
      name: 'New ingredient',
      quantity: 1,
      unit: 'cup'
    };
    setRecipe(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), newIngredient]
    }));
  };

  const removeIngredient = (index: number) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients?.filter((_, i) => i !== index) || []
    }));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients?.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      ) || []
    }));
  };

  const addInstruction = () => {
    const newStep = ((recipe.instructions?.length || 0) + 1).toString();
    const newInstruction: Instruction = {
      step: newStep,
      description: 'Add instruction here...',
      duration: ''
    };
    setRecipe(prev => ({
      ...prev,
      instructions: [...(prev.instructions || []), newInstruction]
    }));
  };

  const removeInstruction = (index: number) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions?.filter((_, i) => i !== index) || []
    }));
  };

  const updateInstruction = (index: number, field: keyof Instruction, value: string) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions?.map((inst, i) => 
        i === index ? { ...inst, [field]: value } : inst
      ) || []
    }));
  };

  const handleSave = () => {
    if (onSave) {
      // Ensure we have the proper data structure for the API
      const recipeToSave: RecipeData = {
        ...recipe,
        // Ensure instructions is an array
        instructions: recipe.instructions || [],
        // Ensure ingredients exist and have proper structure
        ingredients: recipe.ingredients?.map(ing => ({
          ...ing,
          name: ing.name,
          quantity: ing.quantity || 1,
          unit: ing.unit || 'unit'
        })) || [],
        // Ensure categories exist
        categories: recipe.categories || [],
        // Ensure images exist  
        images: recipe.images || []
      };
      onSave(recipeToSave);
    }
    setIsEditable(false);
  };

  const handleCancel = () => {
    if (initialRecipe) {
      setRecipe(initialRecipe);
      setIsEditable(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      // Allow line breaks with Shift+Enter
      document.execCommand('insertLineBreak');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  const ContentEditable: React.FC<{
    content: string;
    onContentChange: (e: React.FormEvent<HTMLDivElement>) => void;
    className?: string;
    placeholder?: string;
    multiline?: boolean;
  }> = ({ content, onContentChange, className, placeholder, multiline = false }) => (
    <div
      contentEditable={isEditable}
      suppressContentEditableWarning={true}
      onInput={onContentChange}
      onKeyDown={multiline ? handleKeyDown : undefined}
      className={className}
      style={{
        minHeight: multiline ? '60px' : 'auto',
        padding: isEditable ? '8px' : '0',
        border: isEditable ? '1px solid #e2e8f0' : 'none',
        borderRadius: isEditable ? '4px' : '0',
        outline: 'none',
        backgroundColor: isEditable ? '#f7fafc' : 'transparent',
      }}
      data-placeholder={placeholder}
    >
      {content}
    </div>
  );

  return (
    <Box maxW="4xl" mx="auto" p={6} borderWidth="1px" borderRadius="lg" shadow="lg" bg="white">
      <VStack gap={6} align="stretch">
        {/* Header with Title and Controls */}
        <Flex align="center" wrap="wrap" gap={4}>
          <Box flex="1">
            <ContentEditable
              content={recipe.title}
              onContentChange={handleTextChange('title')}
              className="recipe-title"
            />
          </Box>
          
          {isAuthorized && (
            <HStack gap={2}>
              <Flex align="center" gap={2}>
                <Text fontSize="sm">Edit Mode</Text>
                <Button
                  size="sm"
                  variant={isEditable ? 'solid' : 'outline'}
                  colorScheme="blue"
                  onClick={() => setIsEditable(!isEditable)}
                >
                  {isEditable ? 'View' : 'Edit'}
                </Button>
              </Flex>

              {isEditable && (
                <HStack gap={2}>
                  <Button
                    colorScheme="green"
                    size="sm"
                    onClick={handleSave}
                  >
                    <CheckIcon />
                    Save
                  </Button>
                  {initialRecipe && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                    >
                      <CloseIcon />
                      Cancel
                    </Button>
                  )}
                </HStack>
              )}

              {!isEditable && recipe.id && onDelete && (
                <Button
                  variant="outline"
                  colorScheme="red"
                  size="sm"
                  onClick={() => onDelete(recipe.id!)}
                >
                  <DeleteIcon />
                  Delete
                </Button>
              )}
            </HStack>
          )}
        </Flex>

        {/* Recipe Info */}
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Prep Time (minutes)</Text>
            <ContentEditable
              content={recipe.prep_time?.toString() || '0'}
              onContentChange={handleNumberChange('prep_time')}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Cook Time (minutes)</Text>
            <ContentEditable
              content={recipe.cook_time?.toString() || '0'}
              onContentChange={handleNumberChange('cook_time')}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Servings</Text>
            <ContentEditable
              content={recipe.servings?.toString() || '1'}
              onContentChange={handleNumberChange('servings')}
            />
          </Box>
        </SimpleGrid>

        {/* Description */}
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={2}>Description</Text>
          <ContentEditable
            content={recipe.description || ''}
            onContentChange={handleTextChange('description')}
            placeholder="Enter recipe description..."
            multiline={true}
          />
        </Box>

        <Box height="1px" bg="gray.200" />

        {/* Ingredients */}
        <Box>
          <Flex align="center" mb={4}>
            <Text fontSize="lg" fontWeight="semibold">Ingredients</Text>
            <Spacer />
            {isEditable && (
              <Button
                size="sm"
                onClick={addIngredient}
                colorScheme="blue"
                variant="outline"
              >
                <AddIcon />
                Add Ingredient
              </Button>
            )}
          </Flex>

          <VStack gap={3} align="stretch">
            {recipe.ingredients?.map((ingredient, index) => (
              <HStack key={index} gap={4} align="center">
                <Box minW="80px">
                  <ContentEditable
                    content={ingredient.quantity?.toString() || '1'}
                    onContentChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.currentTarget.textContent || '1') || 1)}
                  />
                </Box>
                <Box minW="60px">
                  <ContentEditable
                    content={ingredient.unit || 'cup'}
                    onContentChange={(e) => updateIngredient(index, 'unit', e.currentTarget.textContent || '')}
                  />
                </Box>
                <Box flex="1">
                  <ContentEditable
                    content={ingredient.name}
                    onContentChange={(e) => updateIngredient(index, 'name', e.currentTarget.textContent || '')}
                  />
                </Box>
                {isEditable && (
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => removeIngredient(index)}
                  >
                    <DeleteIcon />
                  </Button>
                )}
              </HStack>
            ))}
          </VStack>
        </Box>

        <Box height="1px" bg="gray.200" />

        {/* Instructions */}
        <Box>
          <Flex align="center" mb={4}>
            <Text fontSize="lg" fontWeight="semibold">Instructions</Text>
            <Spacer />
            {isEditable && (
              <Button
                size="sm"
                onClick={addInstruction}
                colorScheme="blue"
                variant="outline"
              >
                <AddIcon />
                Add Step
              </Button>
            )}
          </Flex>

          <VStack gap={4} align="stretch">
            {recipe.instructions?.map((instruction, index) => (
              <HStack key={index} align="flex-start" gap={4}>
                <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
                  Step {instruction.step}
                </Badge>
                <VStack flex="1" align="stretch" gap={2}>
                  <ContentEditable
                    content={instruction.description}
                    onContentChange={(e) => updateInstruction(index, 'description', e.currentTarget.textContent || '')}
                    multiline={true}
                    placeholder="Enter instruction..."
                  />
                  {isEditable && (
                    <Box>
                      <Text fontSize="xs" color="gray.600" mb={1}>Duration (optional)</Text>
                      <ContentEditable
                        content={instruction.duration || ''}
                        onContentChange={(e) => updateInstruction(index, 'duration', e.currentTarget.textContent || '')}
                        placeholder="e.g., 5 minutes"
                      />
                    </Box>
                  )}
                </VStack>
                {isEditable && (
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => removeInstruction(index)}
                  >
                    <DeleteIcon />
                  </Button>
                )}
              </HStack>
            ))}
          </VStack>
        </Box>

        {/* Categories Display */}
        {recipe.categories && recipe.categories.length > 0 && (
          <Box>
            <Text fontSize="lg" fontWeight="semibold" mb={2}>Categories</Text>
            <HStack gap={2} wrap="wrap">
              {recipe.categories.map((category, index) => (
                <Badge key={index} colorScheme="green" variant="subtle">
                  {category.name}
                </Badge>
              ))}
            </HStack>
          </Box>
        )}

        {/* Recipe ID Display (for debugging) */}
        {recipe.id && (
          <Box>
            <Text fontSize="xs" color="gray.500">Recipe ID: {recipe.id}</Text>
          </Box>
        )}

        {/* Usage Instructions */}
        {isEditable && (
          <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400">
            <Text fontWeight="medium" color="blue.800" mb={2}>Editing Tips:</Text>
            <VStack align="start" gap={1} fontSize="sm" color="blue.700">
              <Text>• Click on any text to edit it inline</Text>
              <Text>• Use Shift+Enter for line breaks in multi-line fields</Text>
              <Text>• Press Enter or click outside to finish editing a field</Text>
              <Text>• Changes are saved to the server when you click Save</Text>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default Recipe;
