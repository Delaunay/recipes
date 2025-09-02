import React, { useState, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Button,
    Input,
    Grid,
    GridItem,
    Heading,
    Badge,
    IconButton,
    Flex,
    Card,
} from '@chakra-ui/react';
import { recipeAPI, RecipeData } from '../services/api';

// Custom icon components
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

const CloseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
);

interface WeeklyRecipe {
    id: string;
    recipeId: string;
    recipeName: string;
    totalPortions: number;
    portionsUsed: number;
    portionsRemaining: number;
}

interface PlannedMeal {
    id: string;
    recipeId: string;
    recipeName: string;
    portions: number;
    day: string;
    mealType: 'breakfast' | 'lunch' | 'dinner';
}

interface MealPlan {
    weekStart: Date;
    people: number;
    mealsPerDay: number;
    weeklyRecipes: WeeklyRecipe[];
    plannedMeals: PlannedMeal[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

const MealPlanning: React.FC = () => {
    const [mealPlan, setMealPlan] = useState<MealPlan>({
        weekStart: new Date(),
        people: 2,
        mealsPerDay: 3,
        weeklyRecipes: [],
        plannedMeals: [],
    });

    const [recipes, setRecipes] = useState<RecipeData[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState<string>('');
    const [selectedDay, setSelectedDay] = useState<string>('');
    const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
    const [portionsToUse, setPortionsToUse] = useState<number>(2);
    const [showMealModal, setShowMealModal] = useState(false);
    const [isNewRecipe, setIsNewRecipe] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; show: boolean } | null>(null);

    // Load recipes on component mount
    useEffect(() => {
        const loadRecipes = async () => {
            try {
                const data = await recipeAPI.getRecipes();
                setRecipes(data);
            } catch (error) {
                console.error('Error fetching recipes:', error);
            }
        };

        loadRecipes();
    }, []);

    const totalPortionsNeeded = mealPlan.people * mealPlan.mealsPerDay * 7;
    const totalPortionsAvailable = mealPlan.weeklyRecipes.reduce((sum, recipe) => sum + recipe.totalPortions, 0);
    const totalPortionsPlanned = mealPlan.plannedMeals.reduce((sum, meal) => sum + meal.portions, 0);
    const remainingPortions = totalPortionsNeeded - totalPortionsPlanned;

    // Generate grocery list from weekly recipes
    const generateGroceryList = () => {
        const groceryMap = new Map<string, { quantity: number; unit: string; recipes: string[] }>();

        mealPlan.weeklyRecipes.forEach(weeklyRecipe => {
            const recipe = recipes.find(r => r.id === parseInt(weeklyRecipe.recipeId));
            if (!recipe || !recipe.servings || !recipe.ingredients) return;

            // Use the total portions from the weekly recipe
            const scaleFactor = weeklyRecipe.totalPortions / recipe.servings;

            recipe.ingredients.forEach(ingredient => {
                if (!ingredient.name || !ingredient.unit || ingredient.quantity === undefined) return;

                const key = `${ingredient.name}-${ingredient.unit}`;
                const scaledQuantity = ingredient.quantity * scaleFactor;

                if (groceryMap.has(key)) {
                    const existing = groceryMap.get(key)!;
                    existing.quantity += scaledQuantity;
                    existing.recipes.push(weeklyRecipe.recipeName);
                } else {
                    groceryMap.set(key, {
                        quantity: scaledQuantity,
                        unit: ingredient.unit,
                        recipes: [weeklyRecipe.recipeName],
                    });
                }
            });
        });

        return Array.from(groceryMap.entries()).map(([key, data]) => {
            const [name] = key.split('-');
            return {
                name: name || 'Unknown',
                quantity: data.quantity,
                unit: data.unit,
                recipes: data.recipes,
            };
        });
    };

    const groceryList = generateGroceryList();

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, show: true });
        setTimeout(() => setToast(null), 3000);
    };

    const openMealModal = (day: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
        setSelectedDay(day);
        setSelectedMealType(mealType);
        setPortionsToUse(mealPlan.people); // Default to number of people
        setShowMealModal(true);
        setIsNewRecipe(false);
        setSelectedRecipe('');
    };

    const skipMeal = () => {
        // Create a skipped meal entry with 0 portions
        const skippedMeal: PlannedMeal = {
            id: Date.now().toString(),
            recipeId: 'skip',
            recipeName: 'Skip meal',
            portions: 0,
            day: selectedDay,
            mealType: selectedMealType,
        };

        setMealPlan(prev => ({
            ...prev,
            plannedMeals: [...prev.plannedMeals, skippedMeal],
        }));

        // Reset form and close modal
        setSelectedDay('');
        setSelectedMealType('lunch');
        setShowMealModal(false);
        setIsNewRecipe(false);

        showToast('Meal skipped successfully!');
    };

    const addMeal = () => {
        if (!selectedRecipe || !selectedDay) {
            showToast('Please select a recipe', 'error');
            return;
        }

        // Check if this is a new recipe (from recipes) or existing recipe (from weeklyRecipes)
        const isNewRecipe = recipes.some(r => r.id === parseInt(selectedRecipe));

        if (isNewRecipe) {
            // Adding a new recipe to the week
            const recipe = recipes.find(r => r.id === parseInt(selectedRecipe));
            if (!recipe || !recipe.servings) return;

            const newWeeklyRecipe: WeeklyRecipe = {
                id: Date.now().toString(),
                recipeId: selectedRecipe,
                recipeName: recipe.title,
                totalPortions: recipe.servings,
                portionsUsed: portionsToUse,
                portionsRemaining: recipe.servings - portionsToUse,
            };

            setMealPlan(prev => ({
                ...prev,
                weeklyRecipes: [...prev.weeklyRecipes, newWeeklyRecipe],
                plannedMeals: [...prev.plannedMeals, {
                    id: Date.now().toString(),
                    recipeId: selectedRecipe,
                    recipeName: recipe.title,
                    portions: portionsToUse,
                    day: selectedDay,
                    mealType: selectedMealType,
                }],
            }));
        } else {
            // Using existing recipe from weekly plan
            const weeklyRecipe = mealPlan.weeklyRecipes.find(wr => wr.recipeId === selectedRecipe);
            if (!weeklyRecipe) return;

            if (portionsToUse > weeklyRecipe.portionsRemaining) {
                showToast(`Only ${weeklyRecipe.portionsRemaining} portions remaining for ${weeklyRecipe.recipeName}`, 'error');
                return;
            }

            const newMeal: PlannedMeal = {
                id: Date.now().toString(),
                recipeId: selectedRecipe,
                recipeName: weeklyRecipe.recipeName,
                portions: portionsToUse,
                day: selectedDay,
                mealType: selectedMealType,
            };

            // Update portions used
            const updatedWeeklyRecipes = mealPlan.weeklyRecipes.map(wr =>
                wr.recipeId === selectedRecipe
                    ? { ...wr, portionsUsed: wr.portionsUsed + portionsToUse, portionsRemaining: wr.portionsRemaining - portionsToUse }
                    : wr
            );

            setMealPlan(prev => ({
                ...prev,
                weeklyRecipes: updatedWeeklyRecipes,
                plannedMeals: [...prev.plannedMeals, newMeal],
            }));
        }

        // Reset form and close modal
        setSelectedRecipe('');
        setSelectedDay('');
        setPortionsToUse(mealPlan.people);
        setShowMealModal(false);
        setIsNewRecipe(false);

        showToast('Meal added to plan successfully!');
    };

    const removeMeal = (mealId: string) => {
        const meal = mealPlan.plannedMeals.find(m => m.id === mealId);
        if (!meal) return;

        // Only update portions if it's not a skipped meal
        if (meal.recipeId !== 'skip') {
            const updatedWeeklyRecipes = mealPlan.weeklyRecipes.map(wr =>
                wr.recipeId === meal.recipeId
                    ? { ...wr, portionsUsed: wr.portionsUsed - meal.portions, portionsRemaining: wr.portionsRemaining + meal.portions }
                    : wr
            );

            setMealPlan(prev => ({
                ...prev,
                weeklyRecipes: updatedWeeklyRecipes,
                plannedMeals: prev.plannedMeals.filter(m => m.id !== mealId),
            }));
        } else {
            // For skipped meals, just remove them without updating portions
            setMealPlan(prev => ({
                ...prev,
                plannedMeals: prev.plannedMeals.filter(m => m.id !== mealId),
            }));
        }
    };

    const getMealsForDayAndType = (day: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
        return mealPlan.plannedMeals.filter(meal => meal.day === day && meal.mealType === mealType);
    };

    const getWeekStart = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        return monday;
    };

    useEffect(() => {
        setMealPlan(prev => ({
            ...prev,
            weekStart: getWeekStart(),
        }));
    }, []);

    useEffect(() => {
        // Update default portions when people count changes
        setPortionsToUse(mealPlan.people);
    }, [mealPlan.people]);

    return (
        <Box width="100%" height="100%">
            {/* Toast Notification */}
            {toast && (
                <Box
                    position="fixed"
                    top={4}
                    right={4}
                    zIndex={1001}
                    p={4}
                    borderRadius="md"
                    bg={toast.type === 'success' ? 'green.500' : 'red.500'}
                    color="white"
                    boxShadow="lg"
                    maxW="300px"
                >
                    <Text fontWeight="medium">{toast.message}</Text>
                </Box>
            )}

            <VStack gap={6} align="stretch" width="100%" height="100%">
                {/* Header */}
                <Box>
                    <Heading size="lg" mb={2}>Weekly Meal Planning</Heading>
                </Box>

                {/* Summary Cards */}
                <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" bg="white">
                        <VStack>
                            <Text fontSize="sm" color="gray.500">Total Portions Needed</Text>
                            <Text fontSize="2xl" fontWeight="bold">{totalPortionsNeeded}</Text>
                            <Text fontSize="sm" color="gray.500">
                                {mealPlan.people} people × {mealPlan.mealsPerDay} meals × 7 days
                            </Text>
                        </VStack>
                    </Box>

                    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" bg="white">
                        <VStack>
                            <Text fontSize="sm" color="gray.500">Portions Available</Text>
                            <Text fontSize="2xl" fontWeight="bold" color="blue.500">{totalPortionsAvailable}</Text>
                        </VStack>
                    </Box>

                    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" bg="white">
                        <VStack>
                            <Text fontSize="sm" color="gray.500">Portions Planned</Text>
                            <Text fontSize="2xl" fontWeight="bold" color="green.500">{totalPortionsPlanned}</Text>
                        </VStack>
                    </Box>

                    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" bg="white">
                        <VStack>
                            <Text fontSize="sm" color="gray.500">Remaining Needed</Text>
                            <Text
                                fontSize="2xl"
                                fontWeight="bold"
                                color={remainingPortions >= 0 ? 'orange.500' : 'red.500'}
                            >
                                {remainingPortions}
                            </Text>
                        </VStack>
                    </Box>

                    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" bg="white">
                        <VStack>
                            <Text fontSize="sm" color="gray.500">People</Text>
                            <Input
                                type="number"
                                value={mealPlan.people}
                                onChange={(e) => setMealPlan(prev => ({ ...prev, people: parseInt(e.target.value) || 1 }))}
                                min={1}
                                max={10}
                                size="sm"
                            />
                        </VStack>
                    </Box>
                </Grid>

                {/* Weekly Meal Schedule Table - Main Interface */}
                <Box padding="5px" borderRadius="md" border="1px solid" borderColor="gray.200">
                    <Heading size="md" mb={4}>Weekly Meal Schedule</Heading>
                    <Box overflowX="auto" border="1px" borderColor="gray.200" borderRadius="md">
                        <Box as="table" width="100%" borderCollapse="collapse">
                            <Box as="thead" bg="gray.50">
                                <Box as="tr">
                                    <Box as="th" p={3} textAlign="left" fontWeight="semibold" borderBottom="1px" borderColor="gray.200">Meal</Box>
                                    {DAYS.map(day => (
                                        <Box key={day} as="th" p={3} textAlign="center" fontWeight="semibold" borderBottom="1px" borderColor="gray.200">
                                            {day}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                            <Box as="tbody">
                                {MEAL_TYPES.map(mealType => {
                                    const typedMealType = mealType as 'breakfast' | 'lunch' | 'dinner';
                                    return (
                                        <Box as="tr" key={mealType} _hover={{ bg: 'gray.50' }}>
                                            <Box as="td" p={3} fontWeight="semibold" textTransform="capitalize" borderBottom="1px" borderColor="gray.100">
                                                {mealType}
                                            </Box>
                                            {DAYS.map(day => {
                                                const meals = getMealsForDayAndType(day, typedMealType);
                                                const hasMeals = meals.length > 0;
                                                return (
                                                    <Box
                                                        key={`${day}-${mealType}`}
                                                        as="td"
                                                        p={3}
                                                        textAlign="center"
                                                        borderBottom="1px"
                                                        borderColor="gray.100"
                                                        cursor="pointer"
                                                        onClick={() => openMealModal(day, typedMealType)}
                                                        _hover={{ bg: 'blue.50' }}
                                                        position="relative"
                                                    >
                                                        {hasMeals ? (
                                                            <VStack align="stretch" gap={1}>
                                                                {meals.map(meal => (
                                                                    <Box key={meal.id} p={2} border="1px" borderColor={meal.recipeId === 'skip' ? 'gray.300' : 'blue.200'} borderRadius="md" bg={meal.recipeId === 'skip' ? 'gray.100' : 'blue.50'}>
                                                                        <VStack align="stretch" gap={1}>
                                                                            <Text fontSize="xs" fontWeight="semibold">
                                                                                {meal.recipeName}
                                                                            </Text>
                                                                            {meal.recipeId === 'skip' ? (
                                                                                <Badge size="sm" colorScheme="gray" alignSelf="center">
                                                                                    Skipped
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge size="sm" colorScheme="blue" alignSelf="center">
                                                                                    {meal.portions} portions
                                                                                </Badge>
                                                                            )}
                                                                            <IconButton
                                                                                size="xs"
                                                                                aria-label="Remove meal"
                                                                                colorScheme="red"
                                                                                variant="ghost"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    removeMeal(meal.id);
                                                                                }}
                                                                            >
                                                                                <DeleteIcon />
                                                                            </IconButton>
                                                                        </VStack>
                                                                    </Box>
                                                                ))}
                                                            </VStack>
                                                        ) : (
                                                            <Box
                                                                p={2}
                                                                border="1px"
                                                                borderColor="gray.300"
                                                                borderStyle="dashed"
                                                                borderRadius="md"
                                                                color="gray.500"
                                                                fontSize="sm"
                                                            >
                                                                Click to plan meal
                                                            </Box>
                                                        )}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <HStack justify="space-between" width="100%" align="start" height="100%">
                    {/* recipes */}
                    <Box width="33%" height="100%" padding="5px" borderRadius="md" border="1px solid" borderColor="gray.200">
                        <Heading size="md" mb={4}>Recipes</Heading>
                        <Box as="ul" listStyleType="none" p={0} m={0}>
                            {mealPlan.weeklyRecipes.map(recipe => (
                                <Box
                                    as="li"
                                    key={recipe.id}
                                    paddingLeft={2}
                                    border="1px"
                                    borderColor="gray.200"
                                    borderRadius="md"
                                    bg="white"
                                    mb={2}
                                    _hover={{ bg: 'gray.50' }}
                                >
                                    <Flex justify="space-between" align="center">
                                        <Text fontSize="md">{recipe.recipeName}</Text>
                                        <HStack gap={4} align="center">
                                            <HStack gap={2}>
                                                <Badge size="sm" colorScheme="blue">{recipe.portionsUsed}/{recipe.totalPortions}</Badge>
                                            </HStack>
                                            <IconButton
                                                size="sm"
                                                aria-label="Remove recipe from week"
                                                colorScheme="red"
                                                variant="ghost"
                                                onClick={() => {
                                                    // Remove all planned meals that use this recipe
                                                    const updatedPlannedMeals = mealPlan.plannedMeals.filter(meal => meal.recipeId !== recipe.recipeId);
                                                    setMealPlan(prev => ({
                                                        ...prev,
                                                        weeklyRecipes: prev.weeklyRecipes.filter(r => r.recipeId !== recipe.recipeId),
                                                        plannedMeals: updatedPlannedMeals,
                                                    }));
                                                }}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </HStack>
                                    </Flex>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                    <Box width="33%" height="100%" padding="5px" borderRadius="md" border="1px solid" borderColor="gray.200">
                        <Flex justify="space-between" align="center" mb={4}>
                            <Heading size="md">Grocery List</Heading>
                            <HStack gap={2}>
                                <Button
                                    size="sm"
                                    colorScheme="blue"
                                    variant="outline"
                                    onClick={() => {
                                        const groceryText = groceryList.map(item =>
                                            `[ ] ${item.name} ${item.quantity.toFixed(2)} ${item.unit}`
                                        ).join('\n');

                                        navigator.clipboard.writeText(groceryText).then(() => {
                                            showToast('Grocery list copied to clipboard!');
                                        }).catch(() => {
                                            showToast('Failed to copy to clipboard', 'error');
                                        });
                                    }}
                                >
                                    Copy
                                </Button>
                                <Button
                                    size="sm"
                                    colorScheme="green"
                                    variant="outline"
                                    onClick={async () => {
                                        try {
                                            const groceryData = groceryList.map(item => ({
                                                name: item.name,
                                                quantity: item.quantity,
                                                unit: item.unit,
                                                recipes: item.recipes
                                            }));

                                            await recipeAPI.sendChecklist(groceryData);
                                            showToast('Grocery list sent to Telegram!');
                                        } catch (error) {
                                            console.error('Error sending to Telegram:', error);
                                            showToast('Failed to send to Telegram', 'error');
                                        }
                                    }}
                                >
                                    Send to Telegram
                                </Button>
                            </HStack>
                        </Flex>
                        <Box as="ul" listStyleType="none" p={0} m={0}>
                            {groceryList.map((item, index) => (
                                <Box
                                    key={index}
                                    as="li"
                                    p={3}
                                    border="1px"
                                    borderColor="gray.200"
                                    borderRadius="md"
                                    bg="white"
                                    mb={2}
                                    _hover={{ bg: 'gray.50' }}
                                >
                                    <HStack justify="space-between" align="center">
                                        <Text fontSize="md">{item.name}</Text>
                                        <Badge colorScheme="blue">{item.quantity.toFixed(2)} {item.unit}</Badge>
                                    </HStack>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                    <Box width="33%" height="100%" padding="5px" borderRadius="md" border="1px solid" borderColor="gray.200">
                        <Heading size="md" mb={4}>Free</Heading>
                        <Box as="ul" listStyleType="none" p={0} m={0}>
                            <Box
                                as="li"
                                p={3}
                                border="1px"
                                borderColor="gray.200"
                                borderRadius="md"
                                bg="white"
                                mb={2}
                                _hover={{ bg: 'gray.50' }}
                            >
                            </Box>
                        </Box>
                    </Box>
                </HStack>

                {/* Meal Planning Modal */}
                {showMealModal && (
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
                                        Plan {selectedDay} {selectedMealType}
                                    </Heading>
                                    <IconButton
                                        aria-label="Close modal"
                                        onClick={() => setShowMealModal(false)}
                                        variant="ghost"
                                        size="sm"
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                </Flex>

                                <Box>
                                    <Text mb={3} fontWeight="semibold">What would you like to do?</Text>

                                    <Box as="ul" listStyleType="none" p={0} m={0}>
                                        {/* Skip meal option */}
                                        <Box as="li" mb={3}>
                                            <Button
                                                width="100%"
                                                justifyContent="flex-start"
                                                variant="outline"
                                                colorScheme="gray"
                                                onClick={skipMeal}
                                            >
                                                Skip meal
                                            </Button>
                                        </Box>

                                        {/* Cook new recipe option */}
                                        <Box as="li" mb={3}>
                                            <Box>
                                                <Text fontSize="sm" color="gray.600" mb={2}>Cook for {mealPlan.people} people</Text>
                                                <HStack gap={2}>
                                                    <select
                                                        value={selectedRecipe}
                                                        onChange={(e) => setSelectedRecipe(e.target.value)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '4px',
                                                            fontSize: '14px',
                                                            backgroundColor: 'white',
                                                        }}
                                                    >
                                                        <option value="">Select recipe</option>
                                                        {recipes.map(recipe => (
                                                            <option key={recipe.id} value={recipe.id}>
                                                                {recipe.title} ({recipe.servings} servings)
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <Button
                                                        colorScheme="green"
                                                        size="sm"
                                                        onClick={addMeal}
                                                        disabled={!selectedRecipe}
                                                    >
                                                        Cook
                                                    </Button>
                                                </HStack>
                                            </Box>
                                        </Box>

                                        {/* Use leftovers option */}
                                        <Box as="li">
                                            <Box>
                                                <Text fontSize="sm" color="gray.600" mb={2}>Use leftovers</Text>
                                                {mealPlan.weeklyRecipes.filter(recipe => recipe.portionsRemaining > 0).length > 0 ? (
                                                    <Box as="ul" listStyleType="none" p={0} m={0}>
                                                        {mealPlan.weeklyRecipes
                                                            .filter(recipe => recipe.portionsRemaining > 0)
                                                            .map(recipe => (
                                                                <Box as="li" key={recipe.id} mb={2}>
                                                                    <HStack gap={2}>
                                                                        <Text fontSize="sm" flex={1}>
                                                                            {recipe.recipeName} ({recipe.portionsRemaining} portions left)
                                                                        </Text>
                                                                        <Input
                                                                            type="number"
                                                                            size="sm"
                                                                            width="80px"
                                                                            placeholder={mealPlan.people.toString()}
                                                                            min={1}
                                                                            max={recipe.portionsRemaining}
                                                                            onChange={(e) => {
                                                                                const portions = parseInt(e.target.value) || mealPlan.people;
                                                                                setPortionsToUse(portions);
                                                                            }}
                                                                        />
                                                                        <Button
                                                                            colorScheme="blue"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                // Use leftover directly without going through addMeal
                                                                                const portionsToUseForLeftover = portionsToUse || mealPlan.people;

                                                                                const newMeal: PlannedMeal = {
                                                                                    id: Date.now().toString(),
                                                                                    recipeId: recipe.recipeId,
                                                                                    recipeName: recipe.recipeName,
                                                                                    portions: portionsToUseForLeftover,
                                                                                    day: selectedDay,
                                                                                    mealType: selectedMealType,
                                                                                };

                                                                                // Update portions used
                                                                                const updatedWeeklyRecipes = mealPlan.weeklyRecipes.map(wr =>
                                                                                    wr.recipeId === recipe.recipeId
                                                                                        ? { ...wr, portionsUsed: wr.portionsUsed + portionsToUseForLeftover, portionsRemaining: wr.portionsRemaining - portionsToUseForLeftover }
                                                                                        : wr
                                                                                );

                                                                                setMealPlan(prev => ({
                                                                                    ...prev,
                                                                                    weeklyRecipes: updatedWeeklyRecipes,
                                                                                    plannedMeals: [...prev.plannedMeals, newMeal],
                                                                                }));

                                                                                // Close modal
                                                                                setShowMealModal(false);
                                                                                showToast('Leftover meal added successfully!');
                                                                            }}
                                                                        >
                                                                            Use
                                                                        </Button>
                                                                    </HStack>
                                                                </Box>
                                                            ))}
                                                    </Box>
                                                ) : (
                                                    <Text fontSize="sm" color="gray.500" fontStyle="italic">
                                                        No leftovers available
                                                    </Text>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>

                                <HStack justify="flex-end" pt={4}>
                                    <Button variant="ghost" onClick={() => setShowMealModal(false)}>Cancel</Button>
                                </HStack>
                            </VStack>
                        </Box>
                    </Box>
                )}

            </VStack>
        </Box>
    );
};



// {/* Planned Meals Summary */}
// {mealPlan.plannedMeals.length > 0 && (
//     <Box>
//         <Heading size="md" mb={4}>Planned Meals Summary</Heading>
//         <Box overflowX="auto">
//             <Box as="table" width="100%" borderCollapse="collapse">
//                 <Box as="thead">
//                     <Box as="tr" borderBottom="1px" borderColor="gray.200">
//                         <Box as="th" p={2} textAlign="left" fontWeight="semibold">Recipe</Box>
//                         <Box as="th" p={2} textAlign="left" fontWeight="semibold">Portions</Box>
//                         <Box as="th" p={2} textAlign="left" fontWeight="semibold">Day</Box>
//                         <Box as="th" p={2} textAlign="left" fontWeight="semibold">Meal</Box>
//                         <Box as="th" p={2} textAlign="left" fontWeight="semibold">Actions</Box>
//                     </Box>
//                 </Box>
//                 <Box as="tbody">
//                     {mealPlan.plannedMeals.map(meal => (
//                         <Box as="tr" key={meal.id} borderBottom="1px" borderColor="gray.100">
//                             <Box as="td" p={2}>{meal.recipeName}</Box>
//                             <Box as="td" p={2}>{meal.portions}</Box>
//                             <Box as="td" p={2}>{meal.day}</Box>
//                             <Box as="td" p={2} textTransform="capitalize">{meal.mealType}</Box>
//                             <Box as="td" p={2}>
//                                 <IconButton
//                                     size="sm"
//                                     aria-label="Remove meal"
//                                     colorScheme="red"
//                                     variant="ghost"
//                                     onClick={() => removeMeal(meal.id)}
//                                 >
//                                     <DeleteIcon />
//                                 </IconButton>
//                             </Box>
//                         </Box>
//                     ))}
//                 </Box>
//             </Box>
//         </Box>
//     </Box>
// )}

export default MealPlanning;