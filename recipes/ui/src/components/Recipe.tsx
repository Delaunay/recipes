import { useState, KeyboardEvent, useCallback, useRef, useEffect, FC, FormEvent, ChangeEvent } from 'react';
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
  Spinner,
} from '@chakra-ui/react';
import { RecipeData, Ingredient, Instruction, recipeAPI } from '../services/api';
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
interface ContentEditableProps {
  content: string;
  onContentChange: (e: FormEvent<HTMLDivElement>) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  isEditable: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}

const ContentEditable: FC<ContentEditableProps> = ({ content, onContentChange, className, placeholder, multiline = false, isEditable, onKeyDown }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const cursorPositionRef = useRef<number>(0);

  // Save cursor position before content changes
  const handleInput = useCallback((e: FormEvent<HTMLDivElement>) => {
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

// RecipeImages Component
interface RecipeImagesProps {
  images: string[];
  isEditable: boolean;
  onImageAdd: (imageUrl: string) => void;
  onImageRemove: (imageUrl: string) => void;
}

const RecipeImages: FC<RecipeImagesProps> = ({
  images,
  isEditable,
  onImageAdd,
  onImageRemove,
}) => {
  const isStatic = recipeAPI.isStaticMode();
  
  return (
    <Box>
      <Text fontSize="lg" fontWeight="semibold" mb={2}>Recipe Images</Text>
      {isEditable && !isStatic ? (
        <ImageUpload
          onImageUpload={onImageAdd}
          onImageRemove={onImageRemove}
          existingImages={images}
          multiple={true}
          maxImages={5}
          disabled={false}
        />
      ) : (
        images && images.length > 0 ? (
          <HStack wrap="wrap" gap={2}>
            {images.map((imageUrl, index) => (
              <Image
                key={index}
                src={imageUrl.startsWith('http') ? imageUrl : `/api${imageUrl}`}
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
  );
};

// RecipeIngredients Component
interface RecipeIngredientsProps {
  ingredients: Ingredient[];
  isEditable: boolean;
  onAddIngredient: () => void;
  onRemoveIngredient: (index: number) => void;
  onUpdateIngredient: (index: number, field: keyof Ingredient, value: any) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  multiplier?: number;
}

interface ConvertedIngredient {
  quantity: number;
  unit: string;
  originalQuantity: number;
  originalUnit: string;
}

const RecipeIngredients: FC<RecipeIngredientsProps> = ({
  ingredients,
  isEditable,
  onAddIngredient,
  onRemoveIngredient,
  onUpdateIngredient,
  handleKeyDown,
  multiplier = 1.0,
}) => {
  const isStatic = recipeAPI.isStaticMode();
  
  // State for converted ingredient values (only used in view mode)
  const [convertedIngredients, setConvertedIngredients] = useState<Record<number, ConvertedIngredient>>({});
  // State for available units for each ingredient
  const [availableUnits, setAvailableUnits] = useState<Record<number, string[]>>({});
  // Loading state for unit conversions
  const [loadingUnits, setLoadingUnits] = useState<Record<number, boolean>>({});

  // Load available units for each ingredient when not in edit mode
  useEffect(() => {
    if (!isEditable && ingredients.length > 0) {
      const loadAvailableUnits = async () => {
        const newAvailableUnits: Record<number, string[]> = {};
        const newConvertedIngredients: Record<number, ConvertedIngredient> = {};

        for (let i = 0; i < ingredients.length; i++) {
          const ingredient = ingredients[i];
          if (ingredient.id && ingredient.unit) {
            try {
              const availableUnitsFromAPI = await recipeAPI.getAvailableUnits(ingredient.id, ingredient.unit);
              
              // Always include the current unit first, then add other available units
              const currentUnit = ingredient.unit;
              const availableUnits = [currentUnit];
              
              // Add other units that aren't already in the list
              availableUnitsFromAPI.forEach((unit: string) => {
                if (unit !== currentUnit && !availableUnits.includes(unit)) {
                  availableUnits.push(unit);
                }
              });
              
              newAvailableUnits[i] = availableUnits;
              
              // Initialize converted ingredients with original values
              newConvertedIngredients[i] = {
                quantity: ingredient.quantity || 1,
                unit: ingredient.unit,
                originalQuantity: ingredient.quantity || 1,
                originalUnit: ingredient.unit,
              };
            } catch (error) {
              console.error('Error loading available units:', error);
              const fallbackUnit = ingredient.unit || 'cup';
              newAvailableUnits[i] = [fallbackUnit]; // Fallback to original unit
              newConvertedIngredients[i] = {
                quantity: ingredient.quantity || 1,
                unit: fallbackUnit,
                originalQuantity: ingredient.quantity || 1,
                originalUnit: fallbackUnit,
              };
            }
          } else {
            // For ingredients without ID (new recipes), just show the original unit
            const fallbackUnit = ingredient.unit || 'cup';
            newAvailableUnits[i] = [fallbackUnit];
            newConvertedIngredients[i] = {
              quantity: ingredient.quantity || 1,
              unit: fallbackUnit,
              originalQuantity: ingredient.quantity || 1,
              originalUnit: fallbackUnit,
            };
          }
        }

        setAvailableUnits(newAvailableUnits);
        setConvertedIngredients(newConvertedIngredients);
      };

      loadAvailableUnits();
    }
  }, [isEditable, ingredients]);

  // Handle unit conversion
  const handleUnitChange = async (ingredientIndex: number, newUnit: string) => {
    const ingredient = ingredients[ingredientIndex];
    if (!ingredient.id || !ingredient.unit) return;

    const converted = convertedIngredients[ingredientIndex];
    // Always use the original measurements for conversion
    const originalQuantity = converted?.originalQuantity || ingredient.quantity || 1;
    const originalUnit = converted?.originalUnit || ingredient.unit;

    // If selecting the same unit as original, no conversion needed
    if (originalUnit === newUnit) {
      setConvertedIngredients(prev => ({
        ...prev,
        [ingredientIndex]: {
          quantity: originalQuantity,
          unit: originalUnit,
          originalQuantity: originalQuantity,
          originalUnit: originalUnit,
        }
      }));
      return;
    }

    setLoadingUnits(prev => ({ ...prev, [ingredientIndex]: true }));

    try {
      // Always convert from original unit to new unit
      const response = await recipeAPI.convertUnit(
        ingredient.id,
        originalQuantity,
        originalUnit,
        newUnit
      );

      setConvertedIngredients(prev => ({
        ...prev,
        [ingredientIndex]: {
          quantity: response.quantity,
          unit: response.unit,
          originalQuantity: originalQuantity,
          originalUnit: originalUnit,
        }
      }));
    } catch (error) {
      console.error('Error converting unit:', error);
    } finally {
      setLoadingUnits(prev => ({ ...prev, [ingredientIndex]: false }));
    }
  };

  return (
    <Box>
      <Flex align="center" mb={4}>
        <VStack align="start" gap={1}>
          <Text fontSize="lg" fontWeight="semibold">Ingredients</Text>
          {multiplier !== 1.0 && (
            <Text fontSize="sm" color="blue.600" fontWeight="medium">
              Quantities shown for {multiplier.toFixed(1)}x recipe
            </Text>
          )}
        </VStack>
        <Spacer />
        {isEditable && !isStatic && (
          <Button
            size="sm"
            onClick={onAddIngredient}
            colorScheme="blue"
            variant="outline"
          >
            <AddIcon />
            Add Ingredient
          </Button>
        )}
      </Flex>

      <VStack gap={3} align="stretch">
        {ingredients.map((ingredient, index) => {
          const converted = convertedIngredients[index];
          const baseQuantity = converted?.quantity || ingredient.quantity || 1;
          const displayQuantity = baseQuantity * multiplier;
          const displayUnit = converted?.unit || ingredient.unit || 'cup';
          const units = availableUnits[index] || [];
          const isLoading = loadingUnits[index];

          return (
            <HStack key={index} gap={4} align="center">
              <Box minW="80px">
                {isEditable && !isStatic ? (
                  <ContentEditable
                    content={ingredient.quantity?.toString() || '1'}
                    onContentChange={(e) => onUpdateIngredient(index, 'quantity', parseFloat(e.currentTarget.textContent || '1') || 1)}
                    isEditable={isEditable}
                    onKeyDown={handleKeyDown}
                  />
                ) : (
                  <VStack align="start" gap={0}>
                    <Flex align="center" gap={1}>
                      <Text>{displayQuantity.toFixed(2).replace(/\.?0+$/, '')}</Text>
                      {isLoading && <Spinner size="xs" />}
                    </Flex>
                    {converted && converted.unit !== converted.originalUnit && (
                      <Text fontSize="xs" color="gray.500">
                        (orig: {(converted.originalQuantity * multiplier).toFixed(2).replace(/\.?0+$/, '')} {converted.originalUnit})
                      </Text>
                    )}
                  </VStack>
                )}
              </Box>
              <Box minW="80px">
                {isEditable && !isStatic ? (
                  <ContentEditable
                    content={ingredient.unit || 'cup'}
                    onContentChange={(e) => onUpdateIngredient(index, 'unit', e.currentTarget.textContent || '')}
                    isEditable={isEditable}
                    onKeyDown={handleKeyDown}
                  />
                ) : (
                  <Box>
                    <select
                      value={displayUnit}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleUnitChange(index, e.target.value)}
                      disabled={isLoading || units.length === 0}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        minWidth: '80px'
                      }}
                    >
                      {units.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </Box>
                )}
              </Box>
              <Box flex="1">
                <ContentEditable
                  content={ingredient.name}
                  onContentChange={(e) => onUpdateIngredient(index, 'name', e.currentTarget.textContent || '')}
                  isEditable={isEditable && !isStatic}
                  onKeyDown={handleKeyDown}
                />
              </Box>
              {isEditable && !isStatic && (
                <Button
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => onRemoveIngredient(index)}
                >
                  <DeleteIcon />
                </Button>
              )}
            </HStack>
          );
        })}
      </VStack>
    </Box>
  );
};

// RecipeInstructions Component
interface RecipeInstructionsProps {
  instructions: Instruction[];
  isEditable: boolean;
  onAddInstruction: () => void;
  onRemoveInstruction: (index: number) => void;
  onUpdateInstruction: (index: number, field: keyof Instruction, value: string) => void;
  onAddInstructionImage: (index: number, imageUrl: string) => void;
  onRemoveInstructionImage: (index: number) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
}

const RecipeInstructions: FC<RecipeInstructionsProps> = ({
  instructions,
  isEditable,
  onAddInstruction,
  onRemoveInstruction,
  onUpdateInstruction,
  onAddInstructionImage,
  onRemoveInstructionImage,
  handleKeyDown,
}) => {
  const isStatic = recipeAPI.isStaticMode();
  
  return (
    <Box>
      <Flex align="center" mb={4}>
        <Text fontSize="lg" fontWeight="semibold">Instructions</Text>
        <Spacer />
        {isEditable && !isStatic && (
          <Button
            size="sm"
            onClick={onAddInstruction}
            colorScheme="blue"
            variant="outline"
          >
            <AddIcon />
            Add Step
          </Button>
        )}
      </Flex>

      <VStack gap={4} align="stretch">
        {instructions.map((instruction, index) => (
          <VStack key={index} align="stretch" gap={3} p={4} borderRadius="md" bg="gray.50">
            <HStack align="flex-start" gap={4}>
              <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
                Step {instruction.step}
              </Badge>
              <VStack flex="1" align="stretch" gap={2}>
                <ContentEditable
                  content={instruction.description}
                  onContentChange={(e) => onUpdateInstruction(index, 'description', e.currentTarget.textContent || '')}
                  multiline={true}
                  placeholder="Enter instruction..."
                  isEditable={isEditable && !isStatic}
                  onKeyDown={handleKeyDown}
                />
                {isEditable && !isStatic && (
                  <Box>
                    <Text fontSize="xs" color="gray.600" mb={1}>Duration (optional)</Text>
                    <ContentEditable
                      content={instruction.duration || ''}
                      onContentChange={(e) => onUpdateInstruction(index, 'duration', e.currentTarget.textContent || '')}
                      placeholder="e.g., 5 minutes"
                      isEditable={isEditable}
                      onKeyDown={handleKeyDown}
                    />
                  </Box>
                )}
              </VStack>
              {isEditable && !isStatic && (
                <Button
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => onRemoveInstruction(index)}
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
              {isEditable && !isStatic ? (
                <ImageUpload
                  onImageUpload={(imageUrl) => onAddInstructionImage(index, imageUrl)}
                  onImageRemove={() => onRemoveInstructionImage(index)}
                  existingImages={instruction.image ? [instruction.image] : []}
                  multiple={false}
                  maxImages={1}
                  disabled={false}
                />
              ) : (
                instruction.image ? (
                  <Image
                    src={instruction.image.startsWith('http') ? instruction.image : `/api${instruction.image}`}
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
  );
};

// RecipeCategories Component
interface RecipeCategoriesProps {
  categories: any[];
  isEditable: boolean;
  onAddCategory: () => void;
  onRemoveCategory: (categoryId: number) => void;
  onUpdateCategory: (categoryId: number, field: string, value: string) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
}

const RecipeCategories: FC<RecipeCategoriesProps> = ({
  categories,
  isEditable,
  onAddCategory,
  onRemoveCategory,
  onUpdateCategory,
  handleKeyDown,
}) => {
  const isStatic = recipeAPI.isStaticMode();
  
  return (
    <Box>
      <Flex align="center" mb={4}>
        <Text fontSize="lg" fontWeight="semibold">Categories</Text>
        <Spacer />
        {isEditable && !isStatic && (
          <Button
            size="sm"
            onClick={onAddCategory}
            colorScheme="blue"
            variant="outline"
          >
            <AddIcon />
            Add Category
          </Button>
        )}
      </Flex>

      {categories && categories.length > 0 ? (
        <VStack gap={3} align="stretch">
          {categories.map((category) => (
            <HStack key={category.id} gap={4} align="center">
              {isEditable && !isStatic ? (
                <>
                  <Box flex="1">
                    <ContentEditable
                      content={category.name}
                      onContentChange={(e) => onUpdateCategory(category.id!, 'name', e.currentTarget.textContent || '')}
                      placeholder="Category name"
                      isEditable={isEditable}
                      onKeyDown={handleKeyDown}
                    />
                  </Box>
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => onRemoveCategory(category.id!)}
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
  );
};

interface RecipeProps {
  initialRecipe?: RecipeData;
  isAuthorized?: boolean;
  onSave?: (recipe: RecipeData) => void;
  onDelete?: (recipeId: number) => void;
}

const Recipe: FC<RecipeProps> = ({
  initialRecipe,
  isAuthorized = false,
  onSave,
  onDelete,
}) => {
  const isStatic = recipeAPI.isStaticMode();
  const [isEditable, setIsEditable] = useState(!initialRecipe && !isStatic); // New recipe starts in edit mode, but not in static mode
  const [recipeMultiplier, setRecipeMultiplier] = useState<number | string>(1.0); // Default multiplier is 1.0
  
  // Helper to get the effective multiplier value for calculations
  const getEffectiveMultiplier = () => {
    const numValue = typeof recipeMultiplier === 'string' ? parseFloat(recipeMultiplier) : recipeMultiplier;
    return isNaN(numValue) || numValue <= 0 ? 1.0 : numValue;
  };
  
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
        {/* Static Mode Notice */}
        {isStatic && (
          <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400">
            <Text fontWeight="medium" color="blue.800" mb={1}>
              📖 Read-Only Mode
            </Text>
            <Text fontSize="sm" color="blue.700">
              This is a static version of the recipe website. Editing, creating, and deleting recipes is not available.
            </Text>
          </Box>
        )}

        {/* Header with Title and Controls */}
        <Flex align="center" wrap="wrap" gap={4}>
          <Box flex="1">
            <ContentEditable
              content={recipe.title}
              onContentChange={handleTextChange('title')}
              className="recipe-title"
              isEditable={isEditable && !isStatic}
              onKeyDown={handleKeyDown}
            />
          </Box>
          
          {isAuthorized && !isStatic && (
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
        <SimpleGrid columns={{ base: 1, md: 4 }} gap={4}>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Prep Time (minutes)</Text>
            <ContentEditable
              content={recipe.prep_time?.toString() || '0'}
              onContentChange={handleNumberChange('prep_time')}
              isEditable={isEditable && !isStatic}
              onKeyDown={handleKeyDown}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Cook Time (minutes)</Text>
            <ContentEditable
              content={recipe.cook_time?.toString() || '0'}
              onContentChange={handleNumberChange('cook_time')}
              isEditable={isEditable && !isStatic}
              onKeyDown={handleKeyDown}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Servings</Text>
            <ContentEditable
              content={recipe.servings?.toString() || '1'}
              onContentChange={handleNumberChange('servings')}
              isEditable={isEditable && !isStatic}
              onKeyDown={handleKeyDown}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Recipe Multiplier</Text>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={recipeMultiplier}
              onChange={(e) => setRecipeMultiplier(e.target.value === '' ? '' : e.target.value)}
              onBlur={(e) => {
                const value = parseFloat(e.target.value);
                if (isNaN(value) || value <= 0) {
                  setRecipeMultiplier(1.0);
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#f7fafc',
              }}
              placeholder="1.0"
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
            isEditable={isEditable && !isStatic}
            onKeyDown={handleKeyDown}
          />
        </Box>

        {/* Recipe Images Component */}
        <RecipeImages
          images={recipe.images || []}
          isEditable={isEditable}
          onImageAdd={addRecipeImage}
          onImageRemove={removeRecipeImage}
        />

        <Box height="1px" bg="gray.200" />

        {/* Ingredients Component */}
        <RecipeIngredients
          ingredients={recipe.ingredients || []}
          isEditable={isEditable}
          onAddIngredient={addIngredient}
          onRemoveIngredient={removeIngredient}
          onUpdateIngredient={updateIngredientStable}
          handleKeyDown={handleKeyDown}
          multiplier={getEffectiveMultiplier()}
        />

        <Box height="1px" bg="gray.200" />

        {/* Instructions Component */}
        <RecipeInstructions
          instructions={recipe.instructions || []}
          isEditable={isEditable}
          onAddInstruction={addInstruction}
          onRemoveInstruction={removeInstruction}
          onUpdateInstruction={updateInstructionStable}
          onAddInstructionImage={addInstructionImage}
          onRemoveInstructionImage={removeInstructionImage}
          handleKeyDown={handleKeyDown}
        />

        {/* Categories Component */}
        <RecipeCategories
          categories={recipe.categories || []}
          isEditable={isEditable}
          onAddCategory={addCategory}
          onRemoveCategory={removeCategory}
          onUpdateCategory={updateCategoryStable}
          handleKeyDown={handleKeyDown}
        />

        {/* Recipe ID Display (for debugging) */}
        {recipe.id && (
          <Box>
            <Text fontSize="xs" color="gray.500">Recipe ID: {recipe.id}</Text>
          </Box>
        )}

        {/* Usage Instructions */}
        {(isEditable || getEffectiveMultiplier() !== 1.0) && !isStatic && (
          <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400">
            <Text fontWeight="medium" color="blue.800" mb={2}>
              {isEditable ? 'Editing Tips:' : 'Recipe Scaling:'}
            </Text>
            <VStack align="start" gap={1} fontSize="sm" color="blue.700">
              {isEditable ? (
                <>
                  <Text>• Click on any text to edit it inline</Text>
                  <Text>• Use Shift+Enter for line breaks in multi-line fields</Text>
                  <Text>• Press Enter or click outside to finish editing a field</Text>
                  <Text>• Changes are saved to the server when you click Save</Text>
                </>
              ) : (
                <>
                  <Text>• Recipe multiplier is set to {getEffectiveMultiplier().toFixed(1)}x</Text>
                  <Text>• All ingredient quantities are scaled proportionally</Text>
                  <Text>• You can change units using the dropdowns for more convenient measurements</Text>
                  <Text>• Original quantities are shown in gray when units are converted</Text>
                </>
              )}
            </VStack>
          </Box>
        )}

        {/* Recipe Scaling Info for Static Mode */}
        {isStatic && getEffectiveMultiplier() !== 1.0 && (
          <Box p={4} bg="green.50" borderRadius="md" borderLeft="4px solid" borderColor="green.400">
            <Text fontWeight="medium" color="green.800" mb={2}>
              🍽️ Recipe Scaling:
            </Text>
            <VStack align="start" gap={1} fontSize="sm" color="green.700">
              <Text>• Recipe multiplier is set to {getEffectiveMultiplier().toFixed(1)}x</Text>
              <Text>• All ingredient quantities are scaled proportionally</Text>
              <Text>• You can change units using the dropdowns for more convenient measurements</Text>
              <Text>• Original quantities are shown in gray when units are converted</Text>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default Recipe;
