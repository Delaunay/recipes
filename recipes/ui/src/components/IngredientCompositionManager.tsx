import { useState, useEffect, FC } from 'react';
import { Box, Flex, Spinner, Text, Button, VStack } from '@chakra-ui/react';
import { recipeAPI, IngredientComposition } from '../services/api';
import NutritionFacts from './NutritionFacts';

interface IngredientCompositionManagerProps {
    ingredientId: number;
    fdcId?: number;
}

const IngredientCompositionManager: FC<IngredientCompositionManagerProps> = ({ ingredientId, fdcId }) => {
    const [compositions, setCompositions] = useState<IngredientComposition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [usdaData, setUsdaData] = useState<any>(null);
    const [loadingUsda, setLoadingUsda] = useState(false);
    const isStatic = recipeAPI.isStaticMode();

    useEffect(() => {
        loadCompositions();
    }, [ingredientId]);

    const loadCompositions = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await recipeAPI.getIngredientCompositions(ingredientId);

            // Define the priority order for kinds
            const kindOrder = ['calories', 'fat', 'carbohydrate', 'carbo', 'protein', 'cholesterol', 'mineral', 'vitamin'];

            const getKindPriority = (kind: string | undefined): number => {
                if (!kind) return 999; // Items without kind go last
                const lowerKind = kind.toLowerCase();

                // Find exact match or partial match
                for (let i = 0; i < kindOrder.length; i++) {
                    if (lowerKind.includes(kindOrder[i]) || kindOrder[i].includes(lowerKind)) {
                        return i;
                    }
                }
                // Unknown kinds go after known ones but before standalone items
                return 100;
            };

            // Sort: first by kind priority, then within each kind, items without name come first (totals)
            const sorted = data.sort((a, b) => {
                // First sort by kind priority
                const priorityA = getKindPriority(a.kind);
                const priorityB = getKindPriority(b.kind);

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                // Same kind priority, group by exact kind name
                const kindA = a.kind || '';
                const kindB = b.kind || '';
                if (kindA !== kindB) {
                    return kindA.localeCompare(kindB);
                }

                // Within same kind, items without name (totals) come first
                if (!a.name && b.name) return -1;
                if (a.name && !b.name) return 1;

                // Both have names or both don't, sort by name
                return (a.name || '').localeCompare(b.name || '');
            });

            setCompositions(sorted);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load compositions');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (data: Omit<IngredientComposition, 'id' | 'ingredient_id'>) => {
        await recipeAPI.createIngredientComposition(ingredientId, {
            name: data.name || '',
            kind: data.kind,
            quantity: data.quantity,
            unit: data.unit || '',
            daily_value: data.daily_value,
        });
    };

    const handleEdit = async (compositionId: number, data: Partial<IngredientComposition>) => {
        await recipeAPI.updateIngredientComposition(compositionId, data);
    };

    const handleDelete = async (compositionId: number) => {
        await recipeAPI.deleteIngredientComposition(compositionId);
    };

    const convertUsdaToCompositions = async (usdaAnalysis: any): Promise<IngredientComposition[]> => {
        const compositions: IngredientComposition[] = [];
        const nutrients = usdaAnalysis.nutrients || {};

        // Process each nutrient from USDA data
        for (const nutrientData of Object.values(nutrients)) {
            if (!nutrientData || typeof nutrientData !== 'object') continue;
            const data = nutrientData as any;

            const nutrient = data.nutrient;
            if (!nutrient || !nutrient.id) continue;

            // Skip zero-value nutrients
            if (data.amount === 0 || data.amount === null || data.amount === undefined) continue;

            // Get nutrient group from API based on nutrient name
            let kind = 'nutrient'; // default fallback
            try {
                const groupResponse = await recipeAPI.getNutrientGroup(nutrient.name);
                kind = groupResponse.group;
            } catch (err) {
                console.warn(`Failed to get nutrient group for "${nutrient.name}", using default:`, err);
            }

            compositions.push({
                ingredient_id: ingredientId,
                name: nutrient.name.split(",")[0],
                kind: kind,
                quantity: data.amount,
                unit: data.unit || nutrient.unit_name,
                daily_value: data.dri_percent || 0,
            });
        }

        return compositions;
    };

    const loadUsdaData = async () => {
        if (!fdcId) return;

        try {
            setLoadingUsda(true);
            const data = await recipeAPI.analyzeUsdaFood(fdcId);

            // Convert USDA format to our composition format
            const convertedCompositions = await convertUsdaToCompositions(data);

            // Store both the raw data and converted compositions
            setUsdaData({ raw: data, compositions: convertedCompositions });
        } catch (err) {
            console.error('Failed to load USDA data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load USDA nutrition data');
        } finally {
            setLoadingUsda(false);
        }
    };

    // Auto-load USDA data if no compositions and fdc_id is available
    useEffect(() => {
        if (compositions.length === 0 && fdcId && !loading && !usdaData) {
            loadUsdaData();
        }
    }, [compositions, fdcId, loading]);

    if (loading || loadingUsda) {
        return (
            <Box p={6} bg="orange.50" borderRadius="lg" borderLeft="4px solid" borderColor="orange.400">
                <Flex justify="center" align="center" minH="100px">
                    <Spinner size="lg" color="orange.500" />
                </Flex>
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={6} bg="red.50" borderRadius="lg" borderLeft="4px solid" borderColor="red.400">
                <Text fontWeight="medium" color="red.800" mb={1}>Error</Text>
                <Text fontSize="sm" color="red.700">{error}</Text>
            </Box>
        );
    }

    // Show USDA data if no compositions but USDA data is available
    if (compositions.length === 0 && usdaData?.compositions) {
        const servingSize = usdaData.raw?.serving_size || 100;
        return (

            <NutritionFacts
                compositions={usdaData.compositions}
                entityId={ingredientId}
                editable={false}
            />

        );
    }

    // Show load button if no compositions and fdc_id exists but hasn't loaded yet
    if (compositions.length === 0 && fdcId && !usdaData) {
        return (
            <Box p={6} bg="orange.50" borderRadius="lg" borderLeft="4px solid" borderColor="orange.400">
                <VStack align="stretch" gap={3}>
                    <Text fontSize="lg" fontWeight="semibold" color="orange.800">
                        No nutritional information available
                    </Text>
                    <Text fontSize="sm" color="orange.700">
                        This ingredient is linked to USDA food (FDC ID: {fdcId}). Load nutritional data from USDA?
                    </Text>
                    <Button
                        colorScheme="orange"
                        onClick={loadUsdaData}
                        loading={loadingUsda}
                        disabled={loadingUsda}
                    >
                        {loadingUsda ? 'Loading...' : 'Load from USDA'}
                    </Button>
                </VStack>
            </Box>
        );
    }

    return (
        <NutritionFacts
            compositions={compositions}
            entityId={ingredientId}
            editable={!isStatic}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={loadCompositions}
        />
    );
};

export default IngredientCompositionManager;
