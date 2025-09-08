import { useState, KeyboardEvent, useCallback, useRef, useEffect, FC, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Flex,
  Spacer,
  Image,
  Spinner,
  Link,
  Input,
  IconButton,
  Heading,
} from '@chakra-ui/react';
import { RecipeData, RecipeIngredient, Instruction, recipeAPI, imagePath, UnitConversion } from '../services/api';
import { convert, getAvailableUnits } from '../utils/unit_cvt';
import { formatQuantity, parseFractionToDecimal } from '../utils/fractions';
import ImageUpload from './ImageUpload';

// Utility functions for ingredient references
interface IngredientReference {
  originalText: string;
  ingredientName: string;
  quantity?: string;
  fullIngredientName?: string;
  quantityValue?: number;
  unit?: string;
}

// Temperature command interface
interface TemperatureCommand {
  originalText: string;
  temperature: number;
  unit: 'C' | 'F';
}

// Time command interface
interface TimeCommand {
  originalText: string;
  time: number;
  unit: string; // 'm', 'h', 's', etc.
}

// Timer state interface
interface ActiveTimer {
  id: string;
  originalTime: number;
  currentTime: number;
  unit: string;
  isRunning: boolean;
  isFinished: boolean;
}

// Parse ingredient references in text
const parseIngredientReferences = (text: string): IngredientReference[] => {
  const references: IngredientReference[] = [];
  const regex = /@([a-zA-Z0-9_]+)(?:\{([^}]+)\})?/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    references.push({
      originalText: match[0],
      ingredientName: match[1].trim(),
      quantity: match[2] || '1'
    });
  }

  return references;
};

// Parse temperature commands in text
const parseTemperatureCommands = (text: string): TemperatureCommand[] => {
  const commands: TemperatureCommand[] = [];
  const regex = /\$temp\{([0-9]+(?:\.[0-9]+)?)\}\{([CF])\}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    commands.push({
      originalText: match[0],
      temperature: parseFloat(match[1]),
      unit: match[2] as 'C' | 'F'
    });
  }

  return commands;
};

// Parse time commands in text
const parseTimeCommands = (text: string): TimeCommand[] => {
  const commands: TimeCommand[] = [];
  const regex = /\$time\{([0-9]+(?:\.[0-9]+)?)([mhs])\}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    commands.push({
      originalText: match[0],
      time: parseFloat(match[1]),
      unit: match[2]
    });
  }

  return commands;
};

// Find ingredient by partial name match
const findIngredientByName = (ingredients: RecipeIngredient[], partialName: string): RecipeIngredient | null => {
  // Replace underscores with spaces for matching
  const normalizedPartialName = partialName.replace(/_/g, ' ').toLowerCase();

  // First try exact match
  const exactMatch = ingredients.find(ing =>
    ing.name.toLowerCase() === normalizedPartialName
  );
  if (exactMatch) return exactMatch;

  // Then try starts with
  const startsWithMatch = ingredients.find(ing =>
    ing.name.toLowerCase().startsWith(normalizedPartialName)
  );
  if (startsWithMatch) return startsWithMatch;

  // Finally try contains
  const containsMatch = ingredients.find(ing =>
    ing.name.toLowerCase().includes(normalizedPartialName)
  );
  if (containsMatch) return containsMatch;

  return null;
};

// Evaluate quantity expression (e.g., "1/4", "2.5", "1+1/2")
const evaluateQuantity = (quantityStr: string): number => {
  try {
    // Handle fractions like "1/4"
    if (quantityStr.includes('/')) {
      const [numerator, denominator] = quantityStr.split('/').map(Number);
      return numerator / denominator;
    }

    // Handle mixed numbers like "1+1/2"
    if (quantityStr.includes('+')) {
      const parts = quantityStr.split('+');
      return parts.reduce((sum, part) => sum + evaluateQuantity(part.trim()), 0);
    }

    // Handle simple numbers
    return parseFloat(quantityStr) || 1;
  } catch {
    return 1;
  }
};

// Convert temperature between Celsius and Fahrenheit
const convertTemperature = (temp: number, fromUnit: 'C' | 'F', toUnit: 'C' | 'F'): number => {
  if (fromUnit === toUnit) return temp;

  if (fromUnit === 'C' && toUnit === 'F') {
    return Math.round((temp * 9 / 5) + 32);
  } else if (fromUnit === 'F' && toUnit === 'C') {
    return Math.round((temp - 32) * 5 / 9);
  }

  return temp;
};

// Format time with appropriate unit
const formatTime = (time: number, unit: string): string => {
  if (unit === 'm') {
    return `${time} min`;
  } else if (unit === 'h') {
    return `${time} hour${time !== 1 ? 's' : ''}`;
  } else if (unit === 's') {
    return `${time} second${time !== 1 ? 's' : ''}`;
  }
  return `${time} ${unit}`;
};

// Render instruction text with ingredient references
interface InstructionTextRendererProps {
  text: string;
  ingredients: RecipeIngredient[];
  multiplier?: number;
  convertedIngredients?: Record<number, ConvertedIngredient>;
  preferredTemperatureUnit?: 'C' | 'F';
  onTimerStart?: (timerId: string, time: number, unit: string) => void;
  activeTimers?: Record<string, ActiveTimer>;
  stepIndex?: number;
}

const InstructionTextRenderer: FC<InstructionTextRendererProps> = ({
  text,
  ingredients,
  multiplier = 1,
  convertedIngredients = {},
  preferredTemperatureUnit = 'C',
  onTimerStart,
  activeTimers = {},
  stepIndex = 0
}) => {
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>(preferredTemperatureUnit);

  const references = parseIngredientReferences(text);
  const temperatureCommands = parseTemperatureCommands(text);
  const timeCommands = parseTimeCommands(text);

  if (references.length === 0 && temperatureCommands.length === 0 && timeCommands.length === 0) {
    return <span style={{ paddingLeft: "10px" }}>{text}</span>;
  }

  let lastIndex = 0;
  const elements: React.ReactElement[] = [];

  // Process all commands in order of appearance
  const allCommands = [
    ...references.map(ref => ({ ...ref, type: 'ingredient' as const })),
    ...temperatureCommands.map(cmd => ({ ...cmd, type: 'temperature' as const })),
    ...timeCommands.map(cmd => ({ ...cmd, type: 'time' as const }))
  ].sort((a, b) => {
    const aIndex = text.indexOf(a.originalText);
    const bIndex = text.indexOf(b.originalText);
    return aIndex - bIndex;
  });

  allCommands.forEach((command, index) => {
    const startIndex = text.indexOf(command.originalText, lastIndex);
    const endIndex = startIndex + command.originalText.length;

    // Add text before the command
    if (startIndex > lastIndex) {
      elements.push(
        <span key={`text-${index}`}>
          {text.slice(lastIndex, startIndex)}
        </span>
      );
    }

    if (command.type === 'ingredient') {
      // Handle ingredient references
      const ingredient = findIngredientByName(ingredients, command.ingredientName);
      const quantityValue = evaluateQuantity(command.quantity || '1');

      if (ingredient) {
        const ingredientIndex = ingredients.findIndex(ing => ing.name === ingredient.name);
        const converted = ingredientIndex >= 0 ? convertedIngredients[ingredientIndex] : null;

        const baseQuantity = converted ? converted.quantity : (ingredient.quantity || 1);
        const finalQuantity = quantityValue * baseQuantity * multiplier;
        const unit = converted ? converted.unit : (ingredient.unit || 'unit');

        const displayQuantity = `${finalQuantity.toFixed(2).replace(/\.?0+$/, '')} ${unit}`;
        elements.push(
          <Text as="span" key={`ref-${index}`} fontWeight="bold" color="black">
            {ingredient.name} ({displayQuantity})
          </Text>
        );
      } else {
        elements.push(
          <span key={`ref-${index}`} style={{ color: 'red', fontStyle: 'italic' }}>
            {command.originalText} (ingredient not found)
          </span>
        );
      }
    } else if (command.type === 'temperature') {
      // Handle temperature commands
      const convertedTemp = convertTemperature(command.temperature, command.unit, temperatureUnit);
      elements.push(
        <Text
          as="span"
          key={`temp-${index}`}
          fontWeight="bold"
          color="black"
          cursor="pointer"
          onClick={() => setTemperatureUnit(temperatureUnit === 'C' ? 'F' : 'C')}
          _hover={{
            color: 'blue.600',
            textDecoration: 'underline'
          }}
          display="inline-flex"
          alignItems="center"
          gap={1}
        >
          {convertedTemp}°{temperatureUnit}
          <span style={{ fontSize: '1em', opacity: 0.6, paddingLeft: "2px" }}>(to °{temperatureUnit === 'C' ? 'F' : 'C'})</span>
        </Text>
      );
    } else if (command.type === 'time') {
      // Handle time commands - use stepIndex for consistent timer identification
      const timerId = `timer-${command.time}-${command.unit}-step-${stepIndex}-cmd-${index}`;
      const activeTimer = activeTimers[timerId];

      elements.push(
        <Text
          as="span"
          key={`time-${index}`}
          fontWeight="bold"
          color={activeTimer?.isRunning ? "green.600" : activeTimer?.isFinished ? "red.600" : "black"}
          cursor="pointer"
          onClick={() => onTimerStart?.(timerId, command.time, command.unit)}
          _hover={{
            color: 'blue.600',
            textDecoration: 'underline'
          }}
          display="inline-flex"
          alignItems="center"
          gap={1}
        >
          {formatTime(command.time, command.unit)}
          {/* {activeTimer?.isRunning && <span style={{ fontSize: '0.8em', opacity: 0.7 }}>🕒</span>}
          {activeTimer?.isFinished && <span style={{ fontSize: '0.8em', opacity: 0.7 }}>✅</span>} */}
          <span style={{ fontSize: '1em', opacity: 0.6, paddingLeft: "2px" }}>🕒</span>
        </Text>
      );
    }

    lastIndex = endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(
      <span key="text-end">
        {text.slice(lastIndex)}
      </span>
    );
  }

  return <span style={{ paddingLeft: "10px" }}>{elements}</span>;
};

// Simple icon components
const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

const AddIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const DragHandleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
);

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const ResetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
  </svg>
);

const ConversionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
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
  const isPasteRef = useRef<boolean>(false);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastContentRef = useRef<string>('');

  // Save cursor position before content changes
  const handleInput = useCallback((e: FormEvent<HTMLDivElement>) => {
    const currentContent = e.currentTarget.textContent || '';
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      cursorPositionRef.current = range.startOffset;
    }

    // Save to undo stack if content actually changed
    if (currentContent !== lastContentRef.current) {
      undoStackRef.current.push(lastContentRef.current);
      redoStackRef.current = []; // Clear redo stack when new changes are made
      lastContentRef.current = currentContent;
    }

    onContentChange(e);
  }, [onContentChange]);

  // Handle paste events
  const handlePaste = useCallback(() => {
    isPasteRef.current = true;
    // Let the default paste behavior happen, then we'll handle cursor position
    setTimeout(() => {
      isPasteRef.current = false;
    }, 0);
  }, []);

  // Handle keyboard events for undo/redo
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        // Undo
        if (undoStackRef.current.length > 0) {
          const previousContent = undoStackRef.current.pop()!;
          redoStackRef.current.push(lastContentRef.current);
          lastContentRef.current = previousContent;

          if (divRef.current) {
            divRef.current.textContent = previousContent;
            // Trigger the input event to update the parent component
            const inputEvent = new Event('input', { bubbles: true });
            divRef.current.dispatchEvent(inputEvent);
          }
        }
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        // Redo
        if (redoStackRef.current.length > 0) {
          const nextContent = redoStackRef.current.pop()!;
          undoStackRef.current.push(lastContentRef.current);
          lastContentRef.current = nextContent;

          if (divRef.current) {
            divRef.current.textContent = nextContent;
            // Trigger the input event to update the parent component
            const inputEvent = new Event('input', { bubbles: true });
            divRef.current.dispatchEvent(inputEvent);
          }
        }
      }
    }

    // Call the original onKeyDown handler if provided
    if (multiline && onKeyDown) {
      onKeyDown(e);
    }
  }, [multiline, onKeyDown]);

  // Initialize lastContentRef when content changes
  useEffect(() => {
    lastContentRef.current = content;
  }, [content]);

  // Restore cursor position after content update
  useEffect(() => {
    if (divRef.current && isEditable && document.activeElement === divRef.current) {
      const textNode = divRef.current.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        const selection = window.getSelection();

        // If this was a paste operation, put cursor at the end
        if (isPasteRef.current) {
          const maxOffset = textNode.textContent?.length || 0;
          cursorPositionRef.current = maxOffset;
        }

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
      onPaste={handlePaste}
      onKeyDown={isEditable ? handleKeyDown : undefined}
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


// RecipeIngredients Component
interface RecipeIngredientsProps {
  ingredients: RecipeIngredient[];
  isEditable: boolean;
  onAddIngredient: () => void;
  onRemoveIngredient: (index: number) => void;
  onUpdateIngredient: (index: number, field: keyof RecipeIngredient, value: any) => void;
  onReorderIngredients: (fromIndex: number, toIndex: number) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  multiplier?: number;
  convertedIngredients: Record<number, ConvertedIngredient>;
  setConvertedIngredients: React.Dispatch<React.SetStateAction<Record<number, ConvertedIngredient>>>;
  availableUnits: Record<number, string[]>;
  setAvailableUnits: React.Dispatch<React.SetStateAction<Record<number, string[]>>>;
  loadingUnits: Record<number, boolean>;
  setLoadingUnits: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
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
  onReorderIngredients,
  handleKeyDown,
  multiplier = 1.0,
  convertedIngredients,
  setConvertedIngredients,
  availableUnits,
  setAvailableUnits,
  loadingUnits,
  setLoadingUnits,
}) => {
  const navigate = useNavigate();
  const isStatic = recipeAPI.isStaticMode();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<{
    id?: number;
    name: string;
    quantity?: number;
    unit?: string;
  } | null>(null);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderIngredients(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const openConversionModal = (ingredient: RecipeIngredient) => {
    setSelectedIngredient({
      id: ingredient.ingredient_id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit
    });
    setShowConversionModal(true);
  };

  const closeConversionModal = () => {
    setShowConversionModal(false);
    setSelectedIngredient(null);
  };

  // Load available units for each ingredient when not in edit mode
  useEffect(() => {
    if (!isEditable && ingredients.length > 0) {
      const loadAvailableUnits = async () => {
        const newAvailableUnits: Record<number, string[]> = {};
        const newConvertedIngredients: Record<number, ConvertedIngredient> = {};

        try {
          for (let i = 0; i < ingredients.length; i++) {
            const ingredient = ingredients[i];
            const currentUnit = ingredient.unit || 'cup';

            // Get available units based on unit type and ingredient density
            const availableUnitsFromAPI = await getAvailableUnits(currentUnit, ingredient.ingredient_id);

            // Always include the current unit first, then add other available units
            const availableUnits = [currentUnit];
            availableUnitsFromAPI.forEach(unit => {
              if (unit !== currentUnit && !availableUnits.includes(unit)) {
                availableUnits.push(unit);
              }
            });

            newAvailableUnits[i] = availableUnits;

            // Initialize converted ingredients with original values
            newConvertedIngredients[i] = {
              quantity: ingredient.quantity || 1,
              unit: currentUnit,
              originalQuantity: ingredient.quantity || 1,
              originalUnit: currentUnit,
            };
          }
        } catch (error) {
          console.error('Error loading available units:', error);
          // Fallback to common units if API fails
          const fallbackUnits = ['ml', 'cl', 'l', 'tsp', 'tbsp', 'cup', 'fl oz', 'pint', 'quart', 'gallon', 'g', 'kg', 'mg', 'oz', 'lb'];

          for (let i = 0; i < ingredients.length; i++) {
            const ingredient = ingredients[i];
            const currentUnit = ingredient.unit || 'cup';

            const availableUnits = [currentUnit];
            fallbackUnits.forEach(unit => {
              if (unit !== currentUnit && !availableUnits.includes(unit)) {
                availableUnits.push(unit);
              }
            });

            newAvailableUnits[i] = availableUnits;
            newConvertedIngredients[i] = {
              quantity: ingredient.quantity || 1,
              unit: currentUnit,
              originalQuantity: ingredient.quantity || 1,
              originalUnit: currentUnit,
            };
          }
        }

        setAvailableUnits(newAvailableUnits);
        setConvertedIngredients(newConvertedIngredients);
      };

      loadAvailableUnits();
    }
  }, [isEditable, ingredients]);

  // Handle unit conversion using new JavaScript implementation
  const handleUnitChange = async (ingredientIndex: number, newUnit: string) => {
    const ingredient = ingredients[ingredientIndex];
    if (!ingredient.unit) return;

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
      // Use new JavaScript convert function
      const convertedQuantity = await convert(
        originalQuantity,
        originalUnit,
        newUnit,
        ingredient.ingredient_id
      );

      setConvertedIngredients(prev => ({
        ...prev,
        [ingredientIndex]: {
          quantity: convertedQuantity,
          unit: newUnit,
          originalQuantity: originalQuantity,
          originalUnit: originalUnit,
        }
      }));
    } catch (error) {
      console.error('Error converting unit:', error);
      // On error, keep the original unit
      setConvertedIngredients(prev => ({
        ...prev,
        [ingredientIndex]: {
          quantity: originalQuantity,
          unit: originalUnit,
          originalQuantity: originalQuantity,
          originalUnit: originalUnit,
        }
      }));
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
            <HStack
              key={index}
              gap={4}
              align="center"
              bg={dragOverIndex === index ? "blue.50" : "transparent"}
              border={dragOverIndex === index ? "2px dashed" : "1px solid"}
              borderColor={dragOverIndex === index ? "blue.400" : "transparent"}
              opacity={draggedIndex === index ? 0.5 : 1}
              transition="all 0.2s"
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag Handle - Left Side */}
              {isEditable && !isStatic && (
                <Box
                  minW="24px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="gray.400"
                  _hover={{ color: "gray.600" }}
                  cursor="grab"
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <DragHandleIcon />
                </Box>
              )}

              <Box minW="80px">
                {isEditable && !isStatic ? (
                  <ContentEditable
                    content={formatQuantity(ingredient.quantity || 1, ingredient.unit)}
                    onContentChange={(e) => {
                      const inputText = e.currentTarget.textContent || '1';
                      const parsedQuantity = parseFractionToDecimal(inputText);
                      onUpdateIngredient(index, 'quantity', parsedQuantity || 1);
                    }}
                    isEditable={isEditable}
                    onKeyDown={handleKeyDown}
                  />
                ) : (
                  <VStack align="start" gap={0}>
                    <Flex align="center" gap={1}>
                      <Text>{formatQuantity(displayQuantity, displayUnit)}</Text>
                      {isLoading && <Spinner size="xs" />}
                    </Flex>
                    {converted && converted.unit !== converted.originalUnit && (
                      <Text fontSize="xs" color="gray.500">
                        (orig: {formatQuantity(converted.originalQuantity * multiplier, converted.originalUnit)} {converted.originalUnit})
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
                <Box flex="1">
                  {isEditable && !isStatic ? (
                    <ContentEditable
                      content={ingredient.name}
                      onContentChange={(e) => onUpdateIngredient(index, 'name', e.currentTarget.textContent || '')}
                      isEditable={true}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <Text
                      color="blue.600"
                      _hover={{ textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={() => ingredient.ingredient_id && navigate(`/ingredients/${ingredient.ingredient_id}`)}
                    >
                      {ingredient.name}
                    </Text>
                  )}
                </Box>
              </Box>
              <HStack gap={1}>
                {!isStatic && (
                  <IconButton
                    size="sm"
                    colorScheme="blue"
                    variant="ghost"
                    aria-label="Add unit conversion"
                    title="Add unit conversion"
                    onClick={() => openConversionModal(ingredient)}
                  >
                    <ConversionIcon />
                  </IconButton>
                )}
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
            </HStack>
          );
        })}
      </VStack>

      {/* Unit Conversion Modal */}
      <UnitConversionModal
        isOpen={showConversionModal}
        onClose={closeConversionModal}
        ingredientId={selectedIngredient?.id}
        ingredientName={selectedIngredient?.name}
        initialQuantity={selectedIngredient?.quantity}
        initialUnit={selectedIngredient?.unit}
      />
    </Box>
  );
};

// Unit Conversion Modal Component
interface UnitConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredientId?: number;
  ingredientName?: string;
  initialQuantity?: number;
  initialUnit?: string;
}

const UnitConversionModal: FC<UnitConversionModalProps> = ({
  isOpen,
  onClose,
  ingredientId,
  ingredientName,
  initialQuantity,
  initialUnit
}) => {
  const [fromQty, setFromQty] = useState('1');
  const [fromUnit, setFromUnit] = useState('');
  const [toQty, setToQty] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [isIngredientSpecific, setIsIngredientSpecific] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Set initial values when modal opens
  useEffect(() => {
    if (isOpen && initialQuantity && initialUnit) {
      setFromQty(initialQuantity.toString());
      setFromUnit(initialUnit);
    }
  }, [isOpen, initialQuantity, initialUnit]);

  const handleSubmit = async () => {
    if (!fromUnit || !toUnit || !fromQty || !toQty) {
      setError('Please fill in all fields');
      return;
    }

    const fromQtyNum = parseFloat(fromQty);
    const toQtyNum = parseFloat(toQty);

    if (fromQtyNum <= 0 || toQtyNum <= 0) {
      setError('Quantities must be greater than 0');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Calculate conversion factor: how many toUnits in 1 fromUnit
      const conversionFactor = toQtyNum / fromQtyNum;

      const conversion: Omit<UnitConversion, 'id'> = {
        from_unit: fromUnit,
        to_unit: toUnit,
        conversion_factor: conversionFactor,
        category: 'user_defined',
        ingredient_id: isIngredientSpecific ? ingredientId : undefined,
      };

      await recipeAPI.createUnitConversion(conversion);

      // Reset form (only conversion fields)
      setToQty('');
      setToUnit('');
      setIsIngredientSpecific(false);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create unit conversion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Only reset conversion fields, keep from fields as they're pre-populated
    setToQty('');
    setToUnit('');
    setIsIngredientSpecific(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="blackAlpha.600"
      zIndex={1000}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
    >
      <Box
        bg="white"
        borderRadius="md"
        p={6}
        maxW="500px"
        width="100%"
        maxH="90vh"
        overflowY="auto"
      >
        <VStack gap={4} align="stretch">
          <Flex justify="space-between" align="center">
            <Heading size="md">
              Add Unit Conversion
            </Heading>
            <IconButton
              aria-label="Close modal"
              onClick={handleClose}
              variant="ghost"
              size="sm"
            >
              <CloseIcon />
            </IconButton>
          </Flex>

          {error && (
            <Box p={3} bg="red.50" borderRadius="md" borderLeft="4px solid" borderColor="red.400">
              <Text color="red.700" fontSize="sm">{error}</Text>
            </Box>
          )}

          {/* Conversion Formula Display */}
          <Box p={4} bg="gray.50" borderRadius="md">
            <HStack align="center" justify="center" gap={3}>
              <HStack gap={1}>
                <Text>{fromQty}</Text>
                <Text>{fromUnit}</Text>
              </HStack>
              <Text fontSize="lg" fontWeight="bold" color="blue.600">=&gt;</Text>

              <HStack gap={1}>
                <Input
                  type="number"
                  step="any"
                  value={toQty}
                  onChange={(e) => setToQty(e.target.value)}
                  placeholder="236.588"
                  width="80px"
                  size="sm"
                />
                <Input
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  placeholder="ml"
                  width="80px"
                  size="sm"
                />
              </HStack>
            </HStack>
          </Box>

          {/* Ingredient Specific Checkbox */}
          <HStack align="center" gap={2}>
            <input
              type="checkbox"
              checked={isIngredientSpecific}
              onChange={(e) => setIsIngredientSpecific(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <Text fontSize="sm" fontWeight={"semibold"}>{ingredientName}</Text>
            <Text fontSize="sm">specific</Text>
          </HStack>

          <HStack gap={3} justify="flex-end">
            <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Add Conversion'}
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
};

// RecipeInstructions Component
interface RecipeInstructionsProps {
  instructions: Instruction[];
  ingredients: RecipeIngredient[];
  isEditable: boolean;
  onAddInstruction: () => void;
  onRemoveInstruction: (index: number) => void;
  onUpdateInstruction: (index: number, field: keyof Instruction, value: string) => void;
  onAddInstructionImage: (index: number, imageUrl: string) => void;
  onRemoveInstructionImage: (index: number) => void;
  onReorderInstructions: (fromIndex: number, toIndex: number) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  baseNamespace?: string;
  multiplier?: number;
  convertedIngredients?: Record<number, ConvertedIngredient>;
  preferredTemperatureUnit?: 'C' | 'F';
}

const RecipeInstructions: FC<RecipeInstructionsProps> = ({
  instructions,
  ingredients,
  isEditable,
  onAddInstruction,
  onRemoveInstruction,
  onUpdateInstruction,
  onAddInstructionImage,
  onRemoveInstructionImage,
  onReorderInstructions,
  handleKeyDown,
  baseNamespace,
  multiplier = 1,
  convertedIngredients = {},
  preferredTemperatureUnit = 'C',
}) => {

  const isStatic = recipeAPI.isStaticMode();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Timer state management
  const [activeTimers, setActiveTimers] = useState<Record<string, ActiveTimer>>({});
  const [currentStepTimer, setCurrentStepTimer] = useState<{ stepIndex: number; timerId: string } | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Initialize audio context on first user interaction
  const initAudioContext = useCallback(() => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
  }, [audioContext]);

  // Convert time to seconds
  const timeToSeconds = useCallback((time: number, unit: string): number => {
    switch (unit) {
      case 'h': return time * 3600;
      case 'm': return time * 60;
      case 's': return time;
      default: return time * 60; // default to minutes
    }
  }, []);

  // Play notification sound when timer finishes
  const playTimerSound = useCallback(async () => {
    if (!audioContext) return;

    try {
      // Resume audio context if suspended (required for some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create a simple beep sound using Web Audio API
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set up the beep sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz tone
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);

      // Play multiple beeps
      for (let i = 1; i < 3; i++) {
        const nextOscillator = audioContext.createOscillator();
        const nextGainNode = audioContext.createGain();

        nextOscillator.connect(nextGainNode);
        nextGainNode.connect(audioContext.destination);

        const startTime = audioContext.currentTime + (i * 0.7);
        nextOscillator.frequency.setValueAtTime(800, startTime);
        nextGainNode.gain.setValueAtTime(0.3, startTime);
        nextGainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

        nextOscillator.start(startTime);
        nextOscillator.stop(startTime + 0.5);
      }
    } catch (error) {
      console.error('Error playing timer sound:', error);
    }
  }, [audioContext]);

  // Timer countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers(prevTimers => {
        const updatedTimers = { ...prevTimers };
        let hasChanges = false;

        Object.keys(updatedTimers).forEach(timerId => {
          const timer = updatedTimers[timerId];
          if (timer.isRunning && !timer.isFinished && timer.currentTime > 0) {
            updatedTimers[timerId] = {
              ...timer,
              currentTime: Math.max(0, timer.currentTime - 1)
            };
            hasChanges = true;

            // Check if timer just finished
            if (updatedTimers[timerId].currentTime === 0) {
              updatedTimers[timerId].isFinished = true;
              updatedTimers[timerId].isRunning = false;
              playTimerSound();
            }
          }
        });

        return hasChanges ? updatedTimers : prevTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [playTimerSound]);

  // Timer control functions
  const handleTimerStart = useCallback((timerId: string, time: number, unit: string) => {
    initAudioContext();
    const totalSeconds = timeToSeconds(time, unit);

    // Extract step index from timerId (format: "timer-{time}-{unit}-step-{stepIndex}-cmd-{cmdIndex}")
    const stepMatch = timerId.match(/step-(\d+)/);
    const stepIndex = stepMatch ? parseInt(stepMatch[1], 10) : -1;

    setActiveTimers(prev => ({
      ...prev,
      [timerId]: {
        id: timerId,
        originalTime: totalSeconds,
        currentTime: totalSeconds,
        unit,
        isRunning: true, // Start immediately when clicked
        isFinished: false
      }
    }));

    if (stepIndex >= 0 && stepIndex < instructions.length) {
      setCurrentStepTimer({ stepIndex, timerId });
    }
  }, [timeToSeconds, initAudioContext, instructions]);

  const toggleTimer = useCallback((timerId: string) => {
    setActiveTimers(prev => ({
      ...prev,
      [timerId]: {
        ...prev[timerId],
        isRunning: !prev[timerId].isRunning
      }
    }));
  }, []);

  const resetTimer = useCallback((timerId: string) => {
    setActiveTimers(prev => {
      const timer = prev[timerId];
      if (!timer) return prev;

      return {
        ...prev,
        [timerId]: {
          ...timer,
          currentTime: timer.originalTime,
          isRunning: false,
          isFinished: false
        }
      };
    });
  }, []);

  const closeTimer = useCallback(() => {
    setCurrentStepTimer(null);
  }, []);

  const addMinuteToTimer = useCallback((timerId: string) => {
    setActiveTimers(prev => {
      const timer = prev[timerId];
      if (!timer) return prev;

      return {
        ...prev,
        [timerId]: {
          ...timer,
          originalTime: timer.originalTime + 60,
          currentTime: timer.currentTime + 60,
          // If timer was finished, restart it when time is added
          isFinished: false,
          isRunning: timer.isFinished ? true : timer.isRunning
        }
      };
    });
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderInstructions(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

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

      {isEditable && !isStatic && (
        <Box p={3} bg="blue.50" borderRadius="md" mb={4}>
          <Text fontSize="sm" color="blue.700" mb={2}>
            💡 <strong>Tip:</strong> You can use special commands in your instructions:
          </Text>
          <VStack align="start" gap={1} fontSize="sm" color="blue.700">
            <Text>• <strong>Ingredients:</strong> <code>@tomatoes{`{1/4}`}</code> or <code>@flour{`{2}`}</code> or just <code>@salt</code></Text>
            <Text>• <strong>Temperatures:</strong> <code>$temp{`{180}{C}`}</code> or <code>$temp{`{350}{F}`}</code> (clickable to convert)</Text>
            <Text>• <strong>Times:</strong> <code>$time{`{40m}`}</code> or <code>$time{`{2h}`}</code> or <code>$time{`{30s}`}</code> (clickable to start timer)</Text>
          </VStack>
        </Box>
      )}

      <VStack gap={4} align="stretch">
        {instructions.map((instruction, index) => (
          <VStack
            key={index}
            id={`step-${instruction.step}`}
            align="stretch"
            gap={3}
            p={4}
            borderRadius="md"
            bg={dragOverIndex === index ? "blue.50" : "gray.50"}
            border={dragOverIndex === index ? "2px dashed" : "1px solid"}
            borderColor={dragOverIndex === index ? "blue.400" : "transparent"}
            opacity={draggedIndex === index ? 0.5 : 1}
            transition="all 0.2s"
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <HStack align="flex-start" gap={4}>
              {/* Drag Handle - Left Side */}
              {isEditable && !isStatic && (
                <Box
                  minW="24px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="gray.400"
                  _hover={{ color: "gray.600" }}
                  cursor="grab"
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <DragHandleIcon />
                </Box>
              )}

              {/* Step Image - Left Side */}
              <Box minW="200px" maxW="200px" position="relative">
                {isEditable && !isStatic ? (
                  <VStack align="stretch" gap={2}>
                    <Text fontSize="xs" color="gray.600" fontWeight="medium">
                      Step Image (optional)
                    </Text>
                    <ImageUpload
                      onImageUpload={(imageUrl) => onAddInstructionImage(index, imageUrl)}
                      onImageRemove={() => onRemoveInstructionImage(index)}
                      existingImages={instruction.image ? [instruction.image] : []}
                      multiple={false}
                      maxImages={1}
                      disabled={false}
                      namespace={baseNamespace ? `${baseNamespace}/step_${instruction.step}` : undefined}
                    />
                  </VStack>
                ) : (
                  <>
                    {instruction.image ? (
                      <Image
                        src={imagePath(instruction.image)}
                        alt={`Step ${instruction.step} image`}
                        width="200px"
                        height="150px"
                        objectFit="cover"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.200"
                      />
                    ) : (
                      <Box
                        width="200px"
                        height="150px"
                        bg="gray.100"
                        borderRadius="md"
                        border="2px dashed"
                        borderColor="gray.300"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text color="gray.500" fontSize="sm" textAlign="center">
                          No image
                        </Text>
                      </Box>
                    )}

                    {/* Timer Overlay */}
                    {currentStepTimer?.stepIndex === index && currentStepTimer.timerId && activeTimers[currentStepTimer.timerId] && (
                      <TimerOverlay
                        timer={activeTimers[currentStepTimer.timerId]}
                        onToggle={() => toggleTimer(currentStepTimer.timerId)}
                        onReset={() => resetTimer(currentStepTimer.timerId)}
                        onClose={closeTimer}
                        onAddMinute={() => addMinuteToTimer(currentStepTimer.timerId)}
                      />
                    )}
                  </>
                )}
              </Box>

              {/* Step Content - Right Side */}
              <VStack flex="1" align="stretch" gap={2}>
                <VStack align="flex-start" gap={1}>
                  <HStack gap={2} align="center">
                    <Link
                      href={`#step-${instruction.step}`}
                      colorScheme="blue"
                      cursor="pointer"
                      display="flex"
                      alignItems="center"
                      gap={1}
                      fontSize="md"
                    >
                      Step {instruction.step}
                    </Link>
                    {instruction.duration}
                  </HStack>
                  <VStack flex="1" align="stretch" gap={1}>
                    {isEditable && !isStatic ? (
                      <ContentEditable
                        content={instruction.description}
                        onContentChange={(e) => onUpdateInstruction(index, 'description', e.currentTarget.textContent || '')}
                        multiline={true}
                        placeholder="Enter instruction..."
                        isEditable={isEditable && !isStatic}
                        onKeyDown={handleKeyDown}
                      />
                    ) : (
                      <InstructionTextRenderer
                        text={instruction.description}
                        ingredients={ingredients}
                        multiplier={multiplier}
                        convertedIngredients={convertedIngredients}
                        preferredTemperatureUnit={preferredTemperatureUnit}
                        onTimerStart={handleTimerStart}
                        activeTimers={activeTimers}
                        stepIndex={index}
                      />
                    )}
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
                </VStack>
              </VStack>
            </HStack>
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

// Timer Overlay Component for Step Images
interface TimerOverlayProps {
  timer: ActiveTimer;
  onToggle: () => void;
  onReset: () => void;
  onClose: () => void;
  onAddMinute: () => void;
}

const TimerOverlay: FC<TimerOverlayProps> = ({ timer, onToggle, onReset, onClose, onAddMinute }) => {
  const formatTimerDisplay = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const getProgressPercentage = (): number => {
    if (timer.originalTime === 0) return 100;
    return ((timer.originalTime - timer.currentTime) / timer.originalTime) * 100;
  };

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="blackAlpha.700"
      borderRadius="md"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={10}
    >
      {/* Compact Control buttons */}
      <HStack gap={2} align="stretch" justify="space-between" position="absolute" left="5%" top="5%" width="90%">
        <Button
          size="xs"
          colorScheme="blue"
          onClick={onAddMinute}
          title="Add 1 minute"
        >
          <AddIcon />
        </Button>

        <Button
          aria-label="Close timer"
          size="xs"
          variant="ghost"
          color="white"
          _hover={{ bg: "whiteAlpha.200" }}
          onClick={onClose}
          position="absolute"
          top={"-10px"}
          right={"-15px"}
        >
          <CloseIcon />
        </Button>
      </HStack>

      {/* Compact Progress Ring */}
      <Box position="absolute" top="10%">
        <svg width="120" height="120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="6"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke={timer.isFinished ? "#f56565" : timer.isRunning ? "#4299e6" : "#a0aec0"}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${2 * Math.PI * 50 - (2 * Math.PI * 50 * getProgressPercentage() / 100)}`}
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out',
              transform: 'rotate(-90deg)',
              transformOrigin: '60px 60px'
            }}
          />
        </svg>
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          textAlign="center"
        >
          <Text
            fontSize="lg"
            fontWeight="bold"
            color={timer.isFinished ? "red.300" : "white"}
          >
            {formatTimerDisplay(timer.currentTime)}
          </Text>
          <Text fontSize="xs" color="whiteAlpha.800">
            {timer.isFinished ? "Done!" : timer.isRunning ? "Running" : "Paused"}
          </Text>
        </Box>
      </Box>

      {/* Compact Control buttons */}
      <HStack gap={2} align="stretch" justify="space-between" position="absolute" left="5%" bottom="5%" width="90%">
        <Button
          size="xs"
          colorScheme={timer.isRunning ? "orange" : "green"}
          onClick={onToggle}
        >
          {timer.isRunning ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <Button size="xs" color="white" onClick={onReset}>
          <ResetIcon />
        </Button>
      </HStack>
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

  // State for converted ingredient values (shared between components)
  const [convertedIngredients, setConvertedIngredients] = useState<Record<number, ConvertedIngredient>>({});
  // State for available units for each ingredient
  const [availableUnits, setAvailableUnits] = useState<Record<number, string[]>>({});
  // Loading state for unit conversions
  const [loadingUnits, setLoadingUnits] = useState<Record<number, boolean>>({});
  // State for preferred temperature unit
  const [preferredTemperatureUnit] = useState<'C' | 'F'>('C');

  // Handle step navigation from URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#step-')) {
        const stepNumber = hash.replace('#step-', '');
        const stepElement = document.getElementById(`step-${stepNumber}`);
        if (stepElement) {
          stepElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          // Add a brief highlight effect
          stepElement.style.transition = 'background-color 0.3s ease';
          stepElement.style.backgroundColor = '#fef3c7';
          setTimeout(() => {
            stepElement.style.backgroundColor = '';
          }, 2000);
        }
      }
    };

    // Handle initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  // Load available units for each ingredient when not in edit mode
  useEffect(() => {
    if (!isEditable && recipe.ingredients && recipe.ingredients.length > 0) {
      const loadAvailableUnits = async () => {
        const newAvailableUnits: Record<number, string[]> = {};
        const newConvertedIngredients: Record<number, ConvertedIngredient> = {};

        try {
          for (let i = 0; i < (recipe.ingredients?.length || 0); i++) {
            const ingredient = recipe.ingredients && recipe.ingredients[i];
            if (ingredient) {
              const currentUnit = ingredient.unit || 'cup';

              // Get available units based on unit type and ingredient density
              const availableUnitsFromAPI = await getAvailableUnits(currentUnit, ingredient.ingredient_id);

              // Always include the current unit first, then add other available units
              const availableUnits = [currentUnit];
              availableUnitsFromAPI.forEach(unit => {
                if (unit !== currentUnit && !availableUnits.includes(unit)) {
                  availableUnits.push(unit);
                }
              });

              newAvailableUnits[i] = availableUnits;

              // Initialize converted ingredients with original values
              newConvertedIngredients[i] = {
                quantity: ingredient.quantity || 1,
                unit: currentUnit,
                originalQuantity: ingredient.quantity || 1,
                originalUnit: currentUnit,
              };
            }
          }
        } catch (error) {
          console.error('Error loading available units:', error);
          // Fallback to common units if API fails
          const fallbackUnits = ['ml', 'cl', 'l', 'tsp', 'tbsp', 'cup', 'fl oz', 'pint', 'quart', 'gallon', 'g', 'kg', 'mg', 'oz', 'lb'];

          for (let i = 0; i < (recipe.ingredients?.length || 0); i++) {
            const ingredient = recipe.ingredients && recipe.ingredients[i];
            if (ingredient) {
              const currentUnit = ingredient.unit || 'cup';

              const availableUnits = [currentUnit];
              fallbackUnits.forEach(unit => {
                if (unit !== currentUnit && !availableUnits.includes(unit)) {
                  availableUnits.push(unit);
                }
              });

              newAvailableUnits[i] = availableUnits;
              newConvertedIngredients[i] = {
                quantity: ingredient.quantity || 1,
                unit: currentUnit,
                originalQuantity: ingredient.quantity || 1,
                originalUnit: currentUnit,
              };
            }
          }
        }

        setAvailableUnits(newAvailableUnits);
        setConvertedIngredients(newConvertedIngredients);
      };

      loadAvailableUnits();
    }
  }, [isEditable, recipe.ingredients]);

  const addIngredient = useCallback(() => {
    const newIngredient: RecipeIngredient = {
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
    setRecipe(prev => {
      const filteredInstructions = prev.instructions?.filter((_, i) => i !== index) || [];

      // Update step numbers to reflect new order
      const updatedInstructions = filteredInstructions.map((instruction, index) => ({
        ...instruction,
        step: (index + 1).toString()
      }));

      return {
        ...prev,
        instructions: updatedInstructions
      };
    });
  }, []);

  const reorderInstructions = useCallback((fromIndex: number, toIndex: number) => {
    setRecipe(prev => {
      const instructions = [...(prev.instructions || [])];
      const [movedInstruction] = instructions.splice(fromIndex, 1);
      instructions.splice(toIndex, 0, movedInstruction);

      // Update step numbers to reflect new order
      const updatedInstructions = instructions.map((instruction, index) => ({
        ...instruction,
        step: (index + 1).toString()
      }));

      return {
        ...prev,
        instructions: updatedInstructions
      };
    });
  }, []);

  const reorderIngredients = useCallback((fromIndex: number, toIndex: number) => {
    setRecipe(prev => {
      const ingredients = [...(prev.ingredients || [])];
      const [movedIngredient] = ingredients.splice(fromIndex, 1);
      ingredients.splice(toIndex, 0, movedIngredient);

      return {
        ...prev,
        ingredients: ingredients
      };
    });
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

  const updateIngredientStable = useCallback((index: number, field: keyof RecipeIngredient, value: any) => {
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
      <VStack gap={6} align="stretch" className='recipe-cls'>
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

        {/* Recipe Showcase and Info */}
        <HStack align="flex-start" gap={6} mb={6}>
          {/* Recipe Images Component - Larger Size */}
          <Box flex="1">
            {isEditable && !isStatic ? (
              <ImageUpload
                onImageUpload={addRecipeImage}
                onImageRemove={removeRecipeImage}
                existingImages={recipe.images || []}
                multiple={true}
                maxImages={5}
                disabled={false}
                namespace={recipe.id ? `${recipe.id}_${recipe.title.replace(/[^a-zA-Z0-9]/g, '_')}/preview_${(recipe.images?.length || 0) + 1}` : undefined}
              />
            ) : (
              recipe.images && recipe.images.length > 0 ? (
                <HStack wrap="wrap" gap={3}>
                  {recipe.images.map((imageUrl, index) => (
                    <Image
                      key={index}
                      src={imagePath(imageUrl)}
                      alt={`Recipe image ${index + 1}`}
                      maxHeight="300px"
                      objectFit="cover"
                      borderRadius="lg"
                      border="2px solid"
                      borderColor="gray.200"
                      shadow="md"
                    />
                  ))}
                </HStack>
              ) : (
                <Box
                  width="300px"
                  height="250px"
                  bg="gray.100"
                  borderRadius="lg"
                  border="2px dashed"
                  borderColor="gray.300"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="gray.500" fontSize="sm" textAlign="center">
                    No showcase images
                  </Text>
                </Box>
              )
            )}
          </Box>

          {/* Recipe Info - Right Side */}
          <VStack align="stretch" gap={4} minW="200px">
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
          </VStack>
        </HStack>

        {/* Description */}
        {(recipe.description || isEditable) && (
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
        )}

        <Box height="1px" bg="gray.200" />

        {/* Ingredients Component */}
        <RecipeIngredients
          ingredients={recipe.ingredients || []}
          isEditable={isEditable}
          onAddIngredient={addIngredient}
          onRemoveIngredient={removeIngredient}
          onUpdateIngredient={updateIngredientStable}
          onReorderIngredients={reorderIngredients}
          handleKeyDown={handleKeyDown}
          multiplier={getEffectiveMultiplier()}
          convertedIngredients={convertedIngredients}
          setConvertedIngredients={setConvertedIngredients}
          availableUnits={availableUnits}
          setAvailableUnits={setAvailableUnits}
          loadingUnits={loadingUnits}
          setLoadingUnits={setLoadingUnits}
        />

        <Box height="1px" bg="gray.200" />

        {/* Instructions Component */}
        <RecipeInstructions
          instructions={recipe.instructions || []}
          ingredients={recipe.ingredients || []}
          isEditable={isEditable}
          onAddInstruction={addInstruction}
          onRemoveInstruction={removeInstruction}
          onUpdateInstruction={updateInstructionStable}
          onAddInstructionImage={addInstructionImage}
          onRemoveInstructionImage={removeInstructionImage}
          onReorderInstructions={reorderInstructions}
          handleKeyDown={handleKeyDown}
          baseNamespace={recipe.id ? `${recipe.id}_${recipe.title.replace(/[^a-zA-Z0-9]/g, '_')}` : undefined}
          multiplier={getEffectiveMultiplier()}
          convertedIngredients={convertedIngredients}
          preferredTemperatureUnit={preferredTemperatureUnit}
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
                  <Text>• Use @ syntax to reference ingredients: @tomatoes{1 / 4} or @flour{2}</Text>
                </>
              ) : (
                <>
                  <Text>• Recipe multiplier is set to {getEffectiveMultiplier().toFixed(1)}x</Text>
                  <Text>• All ingredient quantities are scaled proportionally</Text>
                  <Text>• You can change units using the dropdowns for more convenient measurements</Text>
                  <Text>• Original quantities are shown in gray when units are converted</Text>
                  <Text>• Ingredient references are automatically scaled with the recipe multiplier</Text>
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
