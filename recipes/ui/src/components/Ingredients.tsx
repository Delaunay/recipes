import { useState, useEffect, useCallback, useRef, KeyboardEvent, FC, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Flex,
  Spacer,
  Spinner,
  Badge,
  SimpleGrid,
} from '@chakra-ui/react';
import { recipeAPI, Ingredient } from '../services/api';

// Icon components
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

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
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

// ContentEditable component (copied from Recipe component)
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

// Ingredient List Item component
interface IngredientListItemProps {
  ingredient: Ingredient;
  isEditing: boolean;
  onUpdate: (id: number, field: keyof Ingredient, value: any) => void;
  onDelete: (id: number) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  saving: boolean;
  formatName: (name: string) => string;
}

const IngredientListItem: FC<IngredientListItemProps> = ({
  ingredient,
  isEditing,
  onUpdate,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  saving,
  formatName,
}) => {
  const navigate = useNavigate();
  
  const handleUpdate = useCallback((field: keyof Ingredient) => (e: FormEvent<HTMLDivElement>) => {
    let value: any = e.currentTarget.textContent || '';
    
    if (field === 'calories' || field === 'density') {
      value = parseFloat(value) || null;
    }
    
    onUpdate(ingredient.id!, field, value);
  }, [ingredient.id, onUpdate]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  }, []);

  const handleViewDetailsByName = () => {
    if (!isEditing) {
      navigate(`/ingredients/${formatName(ingredient.name)}`);
    }
  };

  const handleViewDetailsById = () => {
    if (!isEditing && ingredient.id) {
      navigate(`/ingredients/${ingredient.id}`);
    }
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      p={4}
      bg="white"
      shadow="sm"
      position="relative"
    >
      {saving && (
        <Box position="absolute" top={2} right={2} zIndex={1}>
          <Spinner size="sm" color="blue.500" />
        </Box>
      )}
      
      <Flex align="center" justify="space-between">
        <VStack align="start" gap={1} flex="1">
          {isEditing ? (
            <ContentEditable
              content={ingredient.name}
              onContentChange={handleUpdate('name')}
              isEditable={isEditing}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <Text fontWeight="medium" fontSize="lg">{ingredient.name}</Text>
          )}
          
          <HStack gap={4} fontSize="sm" color="gray.600">
            {ingredient.calories && (
              <Text>{ingredient.calories} cal/100g</Text>
            )}
            {ingredient.density && (
              <Text>Density: {ingredient.density} g/ml</Text>
            )}
            {ingredient.id && (
              <Text color="gray.400">ID: {ingredient.id}</Text>
            )}
          </HStack>
          
          {ingredient.description && !isEditing && (
            <Text fontSize="sm" color="gray.700" 
                  overflow="hidden" 
                  textOverflow="ellipsis" 
                  whiteSpace="nowrap"
                  maxW="400px">
              {ingredient.description}
            </Text>
          )}
          
          {!isEditing && (
            <HStack gap={2} mt={2}>
              <Button size="xs" colorScheme="blue" variant="solid" onClick={handleViewDetailsById}>
                View by ID
              </Button>
              <Button size="xs" colorScheme="green" variant="outline" onClick={handleViewDetailsByName}>
                View by Name
              </Button>
            </HStack>
          )}
        </VStack>
        
        <HStack gap={2}>
          {isEditing ? (
            <>
              <Button
                size="sm"
                colorScheme="green"
                onClick={onSaveEdit}
              >
                <CheckIcon />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelEdit}
              >
                <CloseIcon />
                Cancel
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={() => onDelete(ingredient.id!)}
              >
                <DeleteIcon />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
            >
              <EditIcon />
              Edit
            </Button>
          )}
        </HStack>
      </Flex>
      
      {/* Edit Form */}
      {isEditing && (
        <Box mt={4} pt={4} borderTop="1px solid" borderColor="gray.200">
          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1}>Description</Text>
              <ContentEditable
                content={ingredient.description || ''}
                onContentChange={handleUpdate('description')}
                placeholder="Enter description..."
                multiline={true}
                isEditable={isEditing}
                onKeyDown={handleKeyDown}
              />
            </Box>
            
            <SimpleGrid columns={2} gap={4}>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Calories (per 100g)
                </Text>
                <ContentEditable
                  content={ingredient.calories?.toString() || ''}
                  onContentChange={handleUpdate('calories')}
                  placeholder="0"
                  isEditable={isEditing}
                  onKeyDown={handleKeyDown}
                />
              </Box>
              
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Density (g/ml)
                </Text>
                <ContentEditable
                  content={ingredient.density?.toString() || ''}
                  onContentChange={handleUpdate('density')}
                  placeholder="1.0"
                  isEditable={isEditing}
                  onKeyDown={handleKeyDown}
                />
              </Box>
            </SimpleGrid>
          </VStack>
        </Box>
      )}
    </Box>
  );
};

// Main Ingredients component
const Ingredients = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [editingIngredientId, setEditingIngredientId] = useState<number | null>(null);
  const [originalIngredient, setOriginalIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const formatIngredientName = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, '-');
  };

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recipeAPI.getIngredients();
      setIngredients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  };

  const addNewIngredient = useCallback(async () => {
    try {
      const newIngredient = await recipeAPI.createIngredient({
        name: 'New Ingredient',
        description: 'Enter description...',
      });
      setIngredients(prev => [...prev, newIngredient]);
    } catch (err) {
      console.error('Failed to create ingredient:', err);
    }
  }, []);

  const updateIngredient = useCallback(async (id: number, field: keyof Ingredient, value: any) => {
    try {
      setSaving(prev => ({ ...prev, [id]: true }));
      
      const updatedIngredient = await recipeAPI.updateIngredient(id, { [field]: value });
      
      setIngredients(prev => 
        prev.map(ing => ing.id === id ? updatedIngredient : ing)
      );
    } catch (err) {
      console.error('Failed to update ingredient:', err);
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  }, []);

  const deleteIngredient = useCallback(async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this ingredient?')) {
      return;
    }

    try {
      await recipeAPI.deleteIngredient(id);
      setIngredients(prev => prev.filter(ing => ing.id !== id));
    } catch (err) {
      console.error('Failed to delete ingredient:', err);
    }
  }, []);

  const handleStartEdit = useCallback((ingredient: Ingredient) => {
    setEditingIngredientId(ingredient.id!);
    setOriginalIngredient({ ...ingredient });
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (originalIngredient) {
      setIngredients(prev => 
        prev.map(ing => ing.id === originalIngredient.id ? originalIngredient : ing)
      );
    }
    setEditingIngredientId(null);
    setOriginalIngredient(null);
  }, [originalIngredient]);

  const handleSaveEdit = useCallback(async () => {
    if (editingIngredientId) {
      // The updates are already applied to the state via updateIngredient
      setEditingIngredientId(null);
      setOriginalIngredient(null);
    }
  }, [editingIngredientId]);

  if (loading) {
    return (
      <Box maxW="6xl" mx="auto" p={6}>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" />
        </Flex>
      </Box>
    );
  }

  if (error) {
    return (
      <Box maxW="6xl" mx="auto" p={6}>
        <Box p={4} bg="red.50" borderRadius="md" borderLeft="4px solid" borderColor="red.400">
          <Text fontWeight="medium" color="red.800" mb={2}>Error Loading Ingredients</Text>
          <Text fontSize="sm" color="red.700">{error}</Text>
        </Box>
        <Button mt={4} onClick={loadIngredients}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box maxW="4xl" mx="auto" p={6}>
      <VStack gap={6} align="stretch">
        <Flex align="center" wrap="wrap" gap={4}>
          <VStack align="start" gap={1}>
            <Text fontSize="3xl" fontWeight="bold">Ingredients Database</Text>
            <Text color="gray.600">
              Click on any ingredient to view detailed information, or use the edit button to modify ingredients.
            </Text>
          </VStack>
          
          <Spacer />
          
          <HStack gap={3}>
            <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
              {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
            </Badge>
            
            <Button
              colorScheme="green"
              size="sm"
              onClick={addNewIngredient}
            >
              <AddIcon />
              Add Ingredient
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={loadIngredients}
            >
              Refresh
            </Button>
          </HStack>
        </Flex>

        {ingredients.length > 0 ? (
          <VStack gap={3} align="stretch">
            {ingredients.map((ingredient) => (
              <IngredientListItem
                key={ingredient.id}
                ingredient={ingredient}
                isEditing={editingIngredientId === ingredient.id}
                onUpdate={updateIngredient}
                onDelete={deleteIngredient}
                onStartEdit={() => handleStartEdit(ingredient)}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
                saving={saving[ingredient.id!] || false}
                formatName={formatIngredientName}
              />
            ))}
          </VStack>
        ) : (
          <Box textAlign="center" py={12}>
            <Text fontSize="lg" color="gray.500" mb={4}>
              No ingredients found
            </Text>
            <Button colorScheme="blue" onClick={addNewIngredient}>
              <AddIcon />
              Add Your First Ingredient
            </Button>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default Ingredients; 