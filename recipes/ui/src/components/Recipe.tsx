import React, { useState, KeyboardEvent, useCallback, useRef, useEffect } from 'react';
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
  Image,
} from '@chakra-ui/react';
import { RecipeData, Ingredient, Instruction } from '../services/api';
import ImageUpload from './ImageUpload';

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

// Move ContentEditable outside to prevent recreation on every render
const ContentEditable: React.FC<{
  content: string;
  onContentChange: (e: React.FormEvent<HTMLDivElement>) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  isEditable: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}> = ({ content, onContentChange, className, placeholder, multiline = false, isEditable, onKeyDown }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const cursorPositionRef = useRef<number>(0);

  // Save cursor position before content changes
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      cursorPositionRef.current = range.startOffset;
    }
    onContentChange(e);
  }, [onContentChange]);

  // Restore cursor position after content update
  useEffect(() => {
    if (divRef.current && isEditable && document.activeElement === divRef.current) {
      const textNode = divRef.current.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        const selection = window.getSelection();
        
        const maxOffset = textNode.textContent?.length || 0;
        const offset = Math.min(cursorPositionRef.current, maxOffset);
        
        range.setStart(textNode, offset);
        range.setEnd(textNode, offset);
        
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  }, [content, isEditable]);

  return (
    <div
      ref={divRef}
      contentEditable={isEditable}
      suppressContentEditableWarning={true}
      onInput={handleInput}
      onKeyDown={multiline ? onKeyDown : undefined}
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
};

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
  
  // Helper to generate temporary IDs for new categories
  const generateTempId = () => Math.floor(Math.random() * 1000000) * -1; // Negative numbers for temp IDs

  const [recipe, setRecipe] = useState<RecipeData>(() => {
    const baseRecipe = initialRecipe || {
      title: 'New Recipe',
      description: 'Enter recipe description...',
      instructions: [{ step: '1', description: 'Add your first step here...', duration: '' }],
      prep_time: 15,
      cook_time: 30,
      servings: 4,
      ingredients: [{ name: 'Enter ingredient', quantity: 1, unit: 'cup' }],
      categories: [],
      images: [],
    };
    
    return {
      ...baseRecipe,
      categories: baseRecipe.categories || []
    };
  });

  const addIngredient = useCallback(() => {
    const newIngredient: Ingredient = {
      name: 'New ingredient',
      quantity: 1,
      unit: 'cup'
    };
    setRecipe(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), newIngredient]
    }));
  }, []);

  const removeIngredient = useCallback((index: number) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const addCategory = useCallback(() => {
    const newCategory = {
      id: generateTempId(), // Use negative number for temporary ID
      name: 'New Category',
      description: ''
    };
    setRecipe(prev => ({
      ...prev,
      categories: [...(prev.categories || []), newCategory]
    }));
  }, []);

  const addInstruction = useCallback(() => {
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
  }, [recipe.instructions?.length]);

  const removeInstruction = useCallback((index: number) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const removeCategory = useCallback((categoryId: number) => {
    setRecipe(prev => ({
      ...prev,
      categories: prev.categories?.filter(cat => cat.id !== categoryId) || []
    }));
  }, []);

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

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      // Allow line breaks with Shift+Enter
      document.execCommand('insertLineBreak');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  }, []);

  // Use useCallback for stable function references
  const handleTextChange = useCallback((field: keyof RecipeData) => (e: React.FormEvent<HTMLDivElement>) => {
    const value = e.currentTarget.textContent || '';
    setRecipe(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleNumberChange = useCallback((field: keyof RecipeData) => (e: React.FormEvent<HTMLDivElement>) => {
    const value = parseInt(e.currentTarget.textContent || '0') || 0;
    setRecipe(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateCategoryStable = useCallback((categoryId: number, field: string, value: string) => {
    setRecipe(prev => ({
      ...prev,
      categories: prev.categories?.map(cat => 
        cat.id === categoryId ? { ...cat, [field]: value } : cat
      ) || []
    }));
  }, []);

  const updateIngredientStable = useCallback((index: number, field: keyof Ingredient, value: any) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients?.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      ) || []
    }));
  }, []);

  const updateInstructionStable = useCallback((index: number, field: keyof Instruction, value: string) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions?.map((inst, i) => 
        i === index ? { ...inst, [field]: value } : inst
      ) || []
    }));
  }, []);

  // Image handling functions
  const addRecipeImage = useCallback((imageUrl: string) => {
    setRecipe(prev => ({
      ...prev,
      images: [...(prev.images || []), imageUrl]
    }));
  }, []);

  const removeRecipeImage = useCallback((imageUrl: string) => {
    setRecipe(prev => ({
      ...prev,
      images: prev.images?.filter(img => img !== imageUrl) || []
    }));
  }, []);

  const addInstructionImage = useCallback((index: number, imageUrl: string) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions?.map((inst, i) => 
        i === index ? { ...inst, image: imageUrl } : inst
      ) || []
    }));
  }, []);

  const removeInstructionImage = useCallback((index: number) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions?.map((inst, i) => 
        i === index ? { ...inst, image: undefined } : inst
      ) || []
    }));
  }, []);

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
              isEditable={isEditable}
              onKeyDown={handleKeyDown}
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
              isEditable={isEditable}
              onKeyDown={handleKeyDown}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Cook Time (minutes)</Text>
            <ContentEditable
              content={recipe.cook_time?.toString() || '0'}
              onContentChange={handleNumberChange('cook_time')}
              isEditable={isEditable}
              onKeyDown={handleKeyDown}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Servings</Text>
            <ContentEditable
              content={recipe.servings?.toString() || '1'}
              onContentChange={handleNumberChange('servings')}
              isEditable={isEditable}
              onKeyDown={handleKeyDown}
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
            isEditable={isEditable}
            onKeyDown={handleKeyDown}
          />
        </Box>

        {/* Recipe Images */}
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={2}>Recipe Images</Text>
          {isEditable ? (
            <ImageUpload
              onImageUpload={addRecipeImage}
              onImageRemove={removeRecipeImage}
              existingImages={recipe.images || []}
              multiple={true}
              maxImages={5}
              disabled={false}
            />
          ) : (
            recipe.images && recipe.images.length > 0 ? (
              <HStack wrap="wrap" gap={2}>
                {recipe.images.map((imageUrl, index) => (
                  <Image
                    key={index}
                    src={imageUrl.startsWith('http') ? imageUrl : `http://localhost:5000${imageUrl}`}
                    alt={`Recipe image ${index + 1}`}
                    width="150px"
                    height="150px"
                    objectFit="cover"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                  />
                ))}
              </HStack>
            ) : (
              <Text color="gray.500" fontSize="sm">No images added</Text>
            )
          )}
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
                    onContentChange={(e) => updateIngredientStable(index, 'quantity', parseFloat(e.currentTarget.textContent || '1') || 1)}
                    isEditable={isEditable}
                    onKeyDown={handleKeyDown}
                  />
                </Box>
                <Box minW="60px">
                  <ContentEditable
                    content={ingredient.unit || 'cup'}
                    onContentChange={(e) => updateIngredientStable(index, 'unit', e.currentTarget.textContent || '')}
                    isEditable={isEditable}
                    onKeyDown={handleKeyDown}
                  />
                </Box>
                <Box flex="1">
                  <ContentEditable
                    content={ingredient.name}
                    onContentChange={(e) => updateIngredientStable(index, 'name', e.currentTarget.textContent || '')}
                    isEditable={isEditable}
                    onKeyDown={handleKeyDown}
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
              <VStack key={index} align="stretch" gap={3} p={4} borderRadius="md" bg="gray.50">
                <HStack align="flex-start" gap={4}>
                  <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
                    Step {instruction.step}
                  </Badge>
                  <VStack flex="1" align="stretch" gap={2}>
                    <ContentEditable
                      content={instruction.description}
                      onContentChange={(e) => updateInstructionStable(index, 'description', e.currentTarget.textContent || '')}
                      multiline={true}
                      placeholder="Enter instruction..."
                      isEditable={isEditable}
                      onKeyDown={handleKeyDown}
                    />
                    {isEditable && (
                      <Box>
                        <Text fontSize="xs" color="gray.600" mb={1}>Duration (optional)</Text>
                        <ContentEditable
                          content={instruction.duration || ''}
                          onContentChange={(e) => updateInstructionStable(index, 'duration', e.currentTarget.textContent || '')}
                          placeholder="e.g., 5 minutes"
                          isEditable={isEditable}
                          onKeyDown={handleKeyDown}
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
                
                {/* Step Image */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                    Step Image (optional)
                  </Text>
                  {isEditable ? (
                    <ImageUpload
                      onImageUpload={(imageUrl) => addInstructionImage(index, imageUrl)}
                      onImageRemove={() => removeInstructionImage(index)}
                      existingImages={instruction.image ? [instruction.image] : []}
                      multiple={false}
                      maxImages={1}
                      disabled={false}
                    />
                  ) : (
                    instruction.image ? (
                      <Image
                        src={instruction.image.startsWith('http') ? instruction.image : `http://localhost:5000${instruction.image}`}
                        alt={`Step ${instruction.step} image`}
                        width="200px"
                        height="150px"
                        objectFit="cover"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.200"
                      />
                    ) : (
                      <Text color="gray.500" fontSize="sm">No image for this step</Text>
                    )
                  )}
                </Box>
              </VStack>
            ))}
          </VStack>
        </Box>

        {/* Categories */}
        <Box>
          <Flex align="center" mb={4}>
            <Text fontSize="lg" fontWeight="semibold">Categories</Text>
            <Spacer />
            {isEditable && (
              <Button
                size="sm"
                onClick={addCategory}
                colorScheme="blue"
                variant="outline"
              >
                <AddIcon />
                Add Category
              </Button>
            )}
          </Flex>

          {recipe.categories && recipe.categories.length > 0 ? (
            <VStack gap={3} align="stretch">
              {recipe.categories.map((category) => (
                <HStack key={category.id} gap={4} align="center">
                  {isEditable ? (
                    <>
                      <Box flex="1">
                        <ContentEditable
                          content={category.name}
                          onContentChange={(e) => updateCategoryStable(category.id!, 'name', e.currentTarget.textContent || '')}
                          placeholder="Category name"
                          isEditable={isEditable}
                          onKeyDown={handleKeyDown}
                        />
                      </Box>
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => removeCategory(category.id!)}
                      >
                        <DeleteIcon />
                      </Button>
                    </>
                  ) : (
                    <Badge colorScheme="green" variant="subtle" fontSize="sm" px={3} py={1}>
                      {category.name}
                    </Badge>
                  )}
                </HStack>
              ))}
            </VStack>
          ) : (
            !isEditable && (
              <Text color="gray.500" fontSize="sm">No categories assigned</Text>
            )
          )}
        </Box>

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
